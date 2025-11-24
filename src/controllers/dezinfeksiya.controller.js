const Disinfection = require("../models/Disinfection");
const Forma60 = require("../models/Forma60");
const openstreetmapService = require("../services/openstreetmap.service");
const historyTracker = require("../middlewares/historyTracker");
const {
  moveTempFile,
  deleteUploadedFile,
  uploadDirs,
} = require("../middlewares/upload");

/**
 * Dezinfeksiya Controller
 * Mobile-friendly, camera integration, location tracking
 */

// @desc    Barcha Dezinfeksiyalarni olish (pagination bilan)
// @route   GET /api/dezinfeksiya
// @access  Private (Admin, Dezinfektor)
exports.getAllDisinfections = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      disinfector,
      startDate,
      endDate,
    } = req.query;

    const filter = {};

    if (status) filter.status = status;
    if (disinfector) filter.disinfector = disinfector;

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    // Dezinfektor faqat o'ziga tayinlanganlarni ko'radi
    if (req.user.role === "dezinfektor") {
      filter.disinfector = req.user._id;
    }

    const skip = (page - 1) * limit;

    const disinfections = await Disinfection.find(filter)
      .populate(
        "forma60",
        "fullName address workplace primaryDiagnosis disinfectionRequired"
      )
      .populate("disinfector", "fullName phone")
      .populate("acceptedBy", "fullName")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Disinfection.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: disinfections.length,
      total: total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: disinfections,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server xatosi",
      error: error.message,
    });
  }
};

// @desc    BARCHA Dezinfeksiyalarni olish (limit YO'Q - harita uchun)
// @route   GET /api/dezinfeksiya/all
// @access  Private (Admin)
exports.getAllDisinfectionsForMap = async (req, res) => {
  try {
    const disinfections = await Disinfection.find({})
      .populate(
        "forma60",
        "fullName address workplace primaryDiagnosis disinfectionRequired"
      )
      .populate("disinfector", "fullName phone")
      .populate("acceptedBy", "fullName")
      .sort({ createdAt: -1 });

    const total = await Disinfection.countDocuments({});

    res.status(200).json({
      success: true,
      count: disinfections.length,
      total: total,
      data: disinfections,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server xatosi",
      error: error.message,
    });
  }
};

// @desc    Dezinfektor uchun map da ko'rsatish uchun joylar
// @route   GET /api/dezinfeksiya/map
// @access  Private (Dezinfektor)
exports.getDisinfectionsForMap = async (req, res) => {
  try {
    const { status } = req.query;

    const filter = { disinfector: req.user._id };

    if (status) {
      filter.status = status;
    } else {
      // Faqat kutilayotgan va jarayondagilar
      filter.status = { $in: ["kerak", "qabul_qilindi", "jarayonda"] };
    }

    const disinfections = await Disinfection.find(filter)
      .populate("forma60", "fullName address workplace")
      .select("forma60 workplace status acceptedDate scheduledDate");

    // Map uchun format
    const mapData = disinfections.map((d) => ({
      id: d._id,
      forma60: d.forma60
        ? {
            id: d.forma60._id,
            fullName: d.forma60.fullName,
          }
        : null,
      workplace: d.workplace,
      status: d.status,
      scheduledDate: d.scheduledDate,
      location: d.workplace.location,
      coordinates: {
        lat:
          d.workplace.lat ||
          (d.workplace.location && d.workplace.location.coordinates[1]),
        lon:
          d.workplace.lon ||
          (d.workplace.location && d.workplace.location.coordinates[0]),
      },
    }));

    res.status(200).json({
      success: true,
      count: mapData.length,
      data: mapData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server xatosi",
      error: error.message,
    });
  }
};

// @desc    Bitta Dezinfeksiyani olish
// @route   GET /api/dezinfeksiya/:id
// @access  Private
exports.getDisinfectionById = async (req, res) => {
  try {
    const disinfection = await Disinfection.findById(req.params.id)
      .populate("forma60")
      .populate("disinfector", "fullName phone email")
      .populate("acceptedBy", "fullName")
      .populate("createdBy", "fullName email")
      .populate("editHistory.editedBy", "fullName");

    if (!disinfection) {
      return res.status(404).json({
        success: false,
        message: "Dezinfeksiya topilmadi",
      });
    }

    res.status(200).json({
      success: true,
      data: disinfection,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server xatosi",
      error: error.message,
    });
  }
};

// @desc    Forma60 dan Dezinfeksiya yaratish
// @route   POST /api/dezinfeksiya/from-forma60/:forma60Id
// @access  Private (Admin, Forma60 filler)
exports.createFromForma60 = async (req, res) => {
  try {
    const { forma60Id } = req.params;

    const forma60 = await Forma60.findById(forma60Id);

    if (!forma60) {
      return res.status(404).json({
        success: false,
        message: "Forma60 topilmadi",
      });
    }

    if (!forma60.disinfectionRequired) {
      return res.status(400).json({
        success: false,
        message: "Bu Forma60 uchun dezinfeksiya kerak emas",
      });
    }

    // Dezinfeksiya yaratish
    const disinfection = await Disinfection.create({
      forma60: forma60Id,
      workplace: forma60.workplace,
      status: "kerak",
      disinfector: forma60.disinfectionDetails?.assignedTo,
      scheduledDate: forma60.disinfectionDetails?.scheduledDate,
      createdBy: req.user._id,
    });

    // History
    disinfection.editHistory.push({
      editedBy: req.user._id,
      editedAt: new Date(),
      action: "created",
    });

    await disinfection.save();

    // Forma60 ni yangilash
    forma60.disinfectionStatus = "qilinmoqda";
    await forma60.save();

    await disinfection.populate("forma60", "fullName workplace");

    res.status(201).json({
      success: true,
      message: "Dezinfeksiya muvaffaqiyatli yaratildi",
      data: disinfection,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Dezinfeksiya yaratishda xatolik",
      error: error.message,
    });
  }
};

// @desc    Dezinfeksiyani qabul qilish (Dezinfektor)
// @route   POST /api/dezinfeksiya/:id/accept
// @access  Private (Dezinfektor)
exports.acceptDisinfection = async (req, res) => {
  try {
    const disinfection = await Disinfection.findById(req.params.id);

    if (!disinfection) {
      return res.status(404).json({
        success: false,
        message: "Dezinfeksiya topilmadi",
      });
    }

    if (disinfection.status !== "kerak") {
      return res.status(400).json({
        success: false,
        message: "Bu dezinfeksiya allaqachon qabul qilingan",
      });
    }

    disinfection.status = "qabul_qilindi";
    disinfection.acceptedDate = new Date();
    disinfection.acceptedBy = req.user._id;
    disinfection.disinfector = req.user._id;
    disinfection.updatedBy = req.user._id;

    await disinfection.save();

    res.status(200).json({
      success: true,
      message: "Dezinfeksiya muvaffaqiyatli qabul qilindi",
      data: disinfection,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Qabul qilishda xatolik",
      error: error.message,
    });
  }
};

// @desc    Dezinfeksiyani boshlash
// @route   POST /api/dezinfeksiya/:id/start
// @access  Private (Dezinfektor)
exports.startDisinfection = async (req, res) => {
  try {
    const disinfection = await Disinfection.findById(req.params.id);

    if (!disinfection) {
      return res.status(404).json({
        success: false,
        message: "Dezinfeksiya topilmadi",
      });
    }

    if (disinfection.status !== "qabul_qilindi") {
      return res.status(400).json({
        success: false,
        message: "Avval dezinfeksiyani qabul qiling",
      });
    }

    disinfection.status = "jarayonda";
    disinfection.updatedBy = req.user._id;

    await disinfection.save();

    res.status(200).json({
      success: true,
      message: "Dezinfeksiya boshlandi",
      data: disinfection,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Boshlashda xatolik",
      error: error.message,
    });
  }
};

// @desc    Rasm yuklash (oldin)
// @route   POST /api/dezinfeksiya/:id/upload-before
// @access  Private (Dezinfektor)
exports.uploadBeforePhotos = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Rasm yuklanmagan",
      });
    }

    const disinfection = await Disinfection.findById(req.params.id);

    if (!disinfection) {
      // Rasmlarni o'chirish
      req.files.forEach((file) => deleteUploadedFile(file.path));

      return res.status(404).json({
        success: false,
        message: "Dezinfeksiya topilmadi",
      });
    }

    // Rasmlarni saqlash
    const photos = req.files.map((file) => {
      // Temp dan permanent ga ko'chirish
      const permanentPath = moveTempFile(file.path, uploadDirs.images);

      return {
        filename: file.filename,
        path: permanentPath || file.path,
        mimetype: file.mimetype,
        size: file.size,
        location: req.body.location ? JSON.parse(req.body.location) : {},
      };
    });

    disinfection.photoBefore.push(...photos);
    disinfection.updatedBy = req.user._id;

    await disinfection.save();

    res.status(200).json({
      success: true,
      message: `${photos.length} ta rasm muvaffaqiyatli yuklandi`,
      data: {
        uploadedCount: photos.length,
        photos: photos,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Rasm yuklashda xatolik",
      error: error.message,
    });
  }
};

// @desc    Rasm yuklash (keyin)
// @route   POST /api/dezinfeksiya/:id/upload-after
// @access  Private (Dezinfektor)
exports.uploadAfterPhotos = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Rasm yuklanmagan",
      });
    }

    const disinfection = await Disinfection.findById(req.params.id);

    if (!disinfection) {
      req.files.forEach((file) => deleteUploadedFile(file.path));

      return res.status(404).json({
        success: false,
        message: "Dezinfeksiya topilmadi",
      });
    }

    const photos = req.files.map((file) => {
      const permanentPath = moveTempFile(file.path, uploadDirs.images);

      return {
        filename: file.filename,
        path: permanentPath || file.path,
        mimetype: file.mimetype,
        size: file.size,
        location: req.body.location ? JSON.parse(req.body.location) : {},
      };
    });

    disinfection.photoAfter.push(...photos);
    disinfection.updatedBy = req.user._id;

    await disinfection.save();

    res.status(200).json({
      success: true,
      message: `${photos.length} ta rasm muvaffaqiyatli yuklandi`,
      data: {
        uploadedCount: photos.length,
        photos: photos,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Rasm yuklashda xatolik",
      error: error.message,
    });
  }
};

// @desc    Dezinfeksiyani yakunlash
// @route   POST /api/dezinfeksiya/:id/complete
// @access  Private (Dezinfektor)
exports.completeDisinfection = async (req, res) => {
  try {
    const { disinfectionType, chemicals, area, notes } = req.body;

    const disinfection = await Disinfection.findById(req.params.id);

    if (!disinfection) {
      return res.status(404).json({
        success: false,
        message: "Dezinfeksiya topilmadi",
      });
    }

    if (disinfection.status !== "jarayonda") {
      return res.status(400).json({
        success: false,
        message: "Dezinfeksiya jarayonda emas",
      });
    }

    // Rasmlar tekshirish
    if (disinfection.photoBefore.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Avval "oldin" rasmlarni yuklang',
      });
    }

    if (disinfection.photoAfter.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Avval "keyin" rasmlarni yuklang',
      });
    }

    disinfection.status = "qilindi";
    disinfection.completedDate = new Date();
    disinfection.disinfectionType = disinfectionType;
    disinfection.chemicals = chemicals;
    disinfection.area = area;
    disinfection.notes = notes;
    disinfection.updatedBy = req.user._id;

    await disinfection.save();

    // Forma60 ni yangilash
    const forma60 = await Forma60.findById(disinfection.forma60);
    if (forma60) {
      // Oldingi holatni saqlash
      const oldStatus = forma60.status;
      const oldDisinfectionStatus = forma60.disinfectionStatus;

      forma60.disinfectionStatus = "qilindi";
      forma60.disinfectionDetails.completedDate = new Date();
      forma60.status = "tugatilgan"; // Forma60 ni tugatilgan holatiga o'tkazish
      forma60.updatedBy = req.user._id;

      // editHistory ga qo'shish
      if (!forma60.editHistory) {
        forma60.editHistory = [];
      }

      forma60.editHistory.push({
        editedBy: req.user._id,
        editedAt: new Date(),
        changes: { status: "tugatilgan", disinfectionStatus: "qilindi" },
        previousData: {
          status: oldStatus,
          disinfectionStatus: oldDisinfectionStatus,
        },
        action: "updated",
      });

      await forma60.save();
    }

    res.status(200).json({
      success: true,
      message: "Dezinfeksiya muvaffaqiyatli yakunlandi",
      data: disinfection,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Yakunlashda xatolik",
      error: error.message,
    });
  }
};

// @desc    Dezinfeksiyani bekor qilish
// @route   POST /api/dezinfeksiya/:id/cancel
// @access  Private (Dezinfektor)
exports.cancelDisinfection = async (req, res) => {
  try {
    const { reason, rejectedBy, notes } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: "Bekor qilish sababi ko'rsatilishi kerak",
      });
    }

    const disinfection = await Disinfection.findById(req.params.id);

    if (!disinfection) {
      return res.status(404).json({
        success: false,
        message: "Dezinfeksiya topilmadi",
      });
    }

    disinfection.status = "bekor_qilindi";
    disinfection.cancellationInfo = {
      reason: reason,
      rejectedBy: rejectedBy,
      cancellationDate: new Date(),
      notes: notes,
    };
    disinfection.updatedBy = req.user._id;

    await disinfection.save();

    // Forma60 ni yangilash
    const forma60 = await Forma60.findById(disinfection.forma60);
    if (forma60) {
      forma60.disinfectionStatus = "bekor qilindi";
      await forma60.save();
    }

    res.status(200).json({
      success: true,
      message: "Dezinfeksiya bekor qilindi",
      data: disinfection,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Bekor qilishda xatolik",
      error: error.message,
    });
  }
};

// @desc    Statistika
// @route   GET /api/dezinfeksiya/stats
// @access  Private
exports.getDisinfectionStats = async (req, res) => {
  try {
    const filter =
      req.user.role === "dezinfektor" ? { disinfector: req.user._id } : {};

    const stats = await Disinfection.aggregate([
      { $match: { ...filter, isDeleted: false } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const total = await Disinfection.countDocuments({
      ...filter,
      isDeleted: false,
    });

    res.status(200).json({
      success: true,
      data: {
        total: total,
        byStatus: stats,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Statistika olishda xatolik",
      error: error.message,
    });
  }
};

module.exports = exports;

// Missing functions
exports.createDisinfection = exports.createFromForma60;

// @desc    Dezinfektorga tayinlash (Admin tomonidan)
// @route   POST /api/dezinfeksiya/:id/assign
// @access  Private (Admin)
exports.assignToDezinfektor = async (req, res) => {
  try {
    const { dezinfektorId } = req.body;

    if (!dezinfektorId) {
      return res.status(400).json({
        success: false,
        message: "Dezinfektor ID kiritilishi shart",
      });
    }

    const disinfection = await Disinfection.findByIdAndUpdate(
      req.params.id,
      {
        disinfector: dezinfektorId,
        assignedDate: new Date(),
        status: "qabul_qilindi",
        acceptedBy: dezinfektorId,
        acceptedDate: new Date(),
      },
      { new: true }
    )
      .populate("disinfector", "fullName username phone")
      .populate("forma60", "fullName address primaryDiagnosis");

    if (!disinfection) {
      return res.status(404).json({
        success: false,
        message: "Dezinfeksiya topilmadi",
      });
    }

    res.status(200).json({
      success: true,
      data: disinfection,
      message: "Dezinfektor muvaffaqiyatli tayinlandi",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

exports.rejectDisinfection = async (req, res) => {
  try {
    const { reason } = req.body;
    const disinfection = await Disinfection.findByIdAndUpdate(
      req.params.id,
      {
        status: "bekor_qilindi",
        cancellationInfo: { reason, rejectedBy: req.user._id },
      },
      { new: true }
    );
    res.status(200).json({ success: true, data: disinfection });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
exports.uploadWebCameraPhoto = exports.uploadBeforePhotos;
exports.getDisinfectionHistory = async (req, res) => {
  res.status(200).json({ success: true, data: [] });
};
exports.getMyDisinfections = async (req, res) => {
  try {
    console.log("getMyDisinfections - User ID:", req.user._id);
    console.log("getMyDisinfections - User role:", req.user.role);

    const data = await Disinfection.find({ disinfector: req.user._id })
      .populate("forma60", "fullName finalDiagnosis address")
      .populate("workplace", "name address location")
      .populate("disinfector", "fullName")
      .sort({ createdAt: -1 });

    console.log("getMyDisinfections - Found:", data.length, "disinfections");

    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("getMyDisinfections error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};
exports.deleteDisinfection = async (req, res) => {
  try {
    await Disinfection.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: "O'chirildi" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
