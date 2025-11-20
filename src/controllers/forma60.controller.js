const Forma60 = require('../models/Forma60');
const District = require('../models/District');
const User = require('../models/User');
const openstreetmapService = require('../services/openstreetmap.service');
const historyTracker = require('../middlewares/historyTracker');

/**
 * Forma60 Controller
 * Roles.tz talablariga muvofiq CRUD operatsiyalar
 */

// @desc    Barcha Forma60 larni olish
// @route   GET /api/forma60
// @access  Private (Admin, Forma60 filler)
exports.getAllForma60 = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      district,
      disinfectionStatus,
      assignedToCardFiller,
      createdBy,
      startDate,
      endDate,
      search
    } = req.query;

    // Filter yaratish
    const filter = {};

    if (status) filter.status = status;
    if (district) filter['address.mahalla'] = district;
    if (disinfectionStatus) filter.disinfectionStatus = disinfectionStatus;
    if (assignedToCardFiller) filter.assignedToCardFiller = assignedToCardFiller;
    if (createdBy) filter.createdBy = createdBy;

    // Sana bo'yicha filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    // Search (ism bo'yicha)
    if (search) {
      filter.fullName = { $regex: search, $options: 'i' };
    }

    // Pagination
    const skip = (page - 1) * limit;

    const forma60s = await Forma60.find(filter)
      .populate('address.mahalla', 'name region')
      .populate('assignedToCardFiller', 'fullName email role')
      .populate('createdBy', 'fullName email')
      .populate('updatedBy', 'fullName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Forma60.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: forma60s.length,
      total: total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: forma60s
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server xatosi',
      error: error.message
    });
  }
};

// @desc    Bitta Forma60 ni olish
// @route   GET /api/forma60/:id
// @access  Private
exports.getForma60ById = async (req, res) => {
  try {
    const forma60 = await Forma60.findById(req.params.id)
      .populate('address.mahalla', 'name region')
      .populate('assignedToCardFiller', 'fullName email role phone')
      .populate('createdBy', 'fullName email')
      .populate('updatedBy', 'fullName email')
      .populate('editHistory.editedBy', 'fullName email');

    if (!forma60) {
      return res.status(404).json({
        success: false,
        message: 'Forma60 topilmadi'
      });
    }

    res.status(200).json({
      success: true,
      data: forma60
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server xatosi',
      error: error.message
    });
  }
};

// @desc    Yangi Forma60 yaratish
// @route   POST /api/forma60
// @access  Private (Forma60 filler)
exports.createForma60 = async (req, res) => {
  try {
    // Bo'sh stringlarni tozalash funksiyasi
    const cleanEmptyFields = (obj) => {
      Object.keys(obj).forEach(key => {
        if (obj[key] === '' || obj[key] === null) {
          delete obj[key];
        } else if (typeof obj[key] === 'object' && !Array.isArray(obj[key]) && obj[key] !== null) {
          cleanEmptyFields(obj[key]);
        }
      });
    };

    // Barcha bo'sh stringlarni tozalash
    cleanEmptyFields(req.body);

    // CreatedBy ni request user dan olish
    req.body.createdBy = req.user._id;

    // Workplace location ni OpenStreetMap dan olish (agar mavjud bo'lsa)
    if (req.body.workplace && req.body.workplace.name) {
      try {
        const searchResults = await openstreetmapService.searchInNukus(req.body.workplace.name);

        if (searchResults && searchResults.length > 0) {
          const firstResult = searchResults[0];

          req.body.workplace.osmData = {
            placeId: firstResult.placeId,
            displayName: firstResult.displayName,
            lat: firstResult.location.lat,
            lon: firstResult.location.lon,
            type: firstResult.type,
            class: firstResult.class
          };

          req.body.workplace.location = {
            type: 'Point',
            coordinates: [firstResult.location.lon, firstResult.location.lat]
          };

          req.body.workplace.address = firstResult.displayName;
        }
      } catch (osmError) {
        console.error('OpenStreetMap error:', osmError);
        // OSM xato bo'lsa ham davom etadi
      }
    }

    const forma60 = await Forma60.create(req.body);

    // Agar assignedToCardFiller kiritilgan bo'lsa, status avtomatik 'karta_toldirishda' ga o'tkazish
    if (req.body.assignedToCardFiller) {
      forma60.status = 'karta_toldirishda';
    }

    // History ga created action qo'shish
    forma60.editHistory.push({
      editedBy: req.user._id,
      editedAt: new Date(),
      action: 'created'
    });

    await forma60.save();

    // Populat qilib qaytarish
    await forma60.populate('address.mahalla', 'name region');
    await forma60.populate('assignedToCardFiller', 'fullName email role');
    await forma60.populate('createdBy', 'fullName email');

    res.status(201).json({
      success: true,
      message: 'Forma60 muvaffaqiyatli yaratildi',
      data: forma60
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Forma60 yaratishda xatolik',
      error: error.message
    });
  }
};

// @desc    Forma60 ni yangilash
// @route   PUT /api/forma60/:id
// @access  Private
exports.updateForma60 = async (req, res) => {
  try {
    // Bo'sh stringlarni tozalash funksiyasi
    const cleanEmptyFields = (obj) => {
      Object.keys(obj).forEach(key => {
        if (obj[key] === '' || obj[key] === null) {
          delete obj[key];
        } else if (typeof obj[key] === 'object' && !Array.isArray(obj[key]) && obj[key] !== null) {
          cleanEmptyFields(obj[key]);
        }
      });
    };

    // Barcha bo'sh stringlarni tozalash
    cleanEmptyFields(req.body);

    let forma60 = await Forma60.findById(req.params.id);

    if (!forma60) {
      return res.status(404).json({
        success: false,
        message: 'Forma60 topilmadi'
      });
    }

    // Asl ma'lumotni saqlash (history uchun)
    const originalData = forma60.toObject();

    // O'zgarishlarni aniqlash
    const changes = {};
    const previousData = {};

    Object.keys(req.body).forEach(key => {
      if (key !== 'updatedBy' && key !== 'editHistory') {
        const oldValue = JSON.stringify(forma60[key]);
        const newValue = JSON.stringify(req.body[key]);

        if (oldValue !== newValue) {
          changes[key] = req.body[key];
          previousData[key] = forma60[key];
        }
      }
    });

    console.log('=== UPDATE DEBUG ===');
    console.log('Request body keys:', Object.keys(req.body));
    console.log('Changes detected:', Object.keys(changes));
    console.log('Changes object:', JSON.stringify(changes, null, 2));
    console.log('===================');

    // UpdatedBy ni qo'shish
    req.body.updatedBy = req.user._id;

    // Agar o'zgarishlar bo'lsa, editHistory ga qo'shish
    if (Object.keys(changes).length > 0) {
      if (!forma60.editHistory) {
        forma60.editHistory = [];
      }

      forma60.editHistory.push({
        editedBy: req.user._id,
        editedAt: new Date(),
        changes: changes,
        previousData: previousData,
        action: 'updated'
      });
    }

    // Automatic status progression
    // 1. Agar assignedToCardFiller to'ldirilgan bo'lsa, status avtomatik 'karta_toldirishda' ga o'tkazish
    if (req.body.assignedToCardFiller &&
        forma60.status === 'yangi' &&
        !req.body.status) {
      req.body.status = 'karta_toldirishda';

      // Status o'zgarishini changes ga qo'shish
      if (!changes.status) {
        changes.status = 'karta_toldirishda';
        previousData.status = 'yangi';
      }
    }

    // 2. Agar status 'yangi' bo'lsa va karta_filler tahrirlayotgan bo'lsa, 'karta_toldirishda' ga o'tkazish
    if (forma60.status === 'yangi' &&
        req.user.role === 'karta_filler' &&
        Object.keys(changes).length > 0 &&
        !req.body.status) {
      req.body.status = 'karta_toldirishda';

      // Status o'zgarishini changes ga qo'shish
      if (!changes.status) {
        changes.status = 'karta_toldirishda';
        previousData.status = 'yangi';
      }
    }

    // Check if form is complete and should move to dezinfeksiya_kutilmoqda
    // Forma to'liq to'ldirilgan bo'lsa va dezinfeksiya kerak bo'lsa
    const isFormComplete = () => {
      const mergedData = { ...forma60.toObject(), ...req.body };
      return mergedData.fullName &&
             mergedData.birthDate &&
             mergedData.address?.fullAddress &&
             mergedData.illnessDate &&
             mergedData.primaryDiagnosis &&
             mergedData.finalDiagnosis;
    };

    if (forma60.status === 'karta_toldirishda' &&
        !req.body.status &&
        isFormComplete() &&
        forma60.disinfectionRequired) {
      req.body.status = 'dezinfeksiya_kutilmoqda';

      // Status o'zgarishini changes ga qo'shish (agar allaqachon qo'shilmagan bo'lsa)
      if (!changes.status) {
        changes.status = 'dezinfeksiya_kutilmoqda';
        previousData.status = 'karta_toldirishda';

        // editHistory ga ham qo'shish kerak
        if (forma60.editHistory && forma60.editHistory.length > 0) {
          const lastHistory = forma60.editHistory[forma60.editHistory.length - 1];
          lastHistory.changes.status = 'dezinfeksiya_kutilmoqda';
          lastHistory.previousData.status = 'karta_toldirishda';
        }
      }
    }

    // Agar workplace o'zgartirilsa, OpenStreetMap dan yangi ma'lumot olish
    if (req.body.workplace && req.body.workplace.name &&
        req.body.workplace.name !== forma60.workplace.name) {
      try {
        const searchResults = await openstreetmapService.searchInNukus(req.body.workplace.name);

        if (searchResults && searchResults.length > 0) {
          const firstResult = searchResults[0];

          req.body.workplace.osmData = {
            placeId: firstResult.placeId,
            displayName: firstResult.displayName,
            lat: firstResult.location.lat,
            lon: firstResult.location.lon,
            type: firstResult.type,
            class: firstResult.class
          };

          req.body.workplace.location = {
            type: 'Point',
            coordinates: [firstResult.location.lon, firstResult.location.lat]
          };

          req.body.workplace.address = firstResult.displayName;
        }
      } catch (osmError) {
        console.error('OpenStreetMap error:', osmError);
      }
    }

    // Ma'lumotlarni yangilash
    Object.keys(req.body).forEach(key => {
      forma60[key] = req.body[key];
    });

    await forma60.save();

    // Populate qilib qaytarish
    forma60 = await Forma60.findById(req.params.id)
      .populate('address.mahalla', 'name region')
      .populate('assignedToCardFiller', 'fullName email role')
      .populate('createdBy', 'fullName email')
      .populate('updatedBy', 'fullName email')
      .populate('editHistory.editedBy', 'fullName email');

    res.status(200).json({
      success: true,
      message: 'Forma60 muvaffaqiyatli yangilandi',
      data: forma60
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Forma60 yangilashda xatolik',
      error: error.message
    });
  }
};

// @desc    Forma60 ni o'chirish (soft delete)
// @route   DELETE /api/forma60/:id
// @access  Private (Admin)
exports.deleteForma60 = async (req, res) => {
  try {
    const forma60 = await Forma60.findById(req.params.id);

    if (!forma60) {
      return res.status(404).json({
        success: false,
        message: 'Forma60 topilmadi'
      });
    }

    await forma60.softDelete(req.user._id);

    res.status(200).json({
      success: true,
      message: 'Forma60 muvaffaqiyatli o\'chirildi'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Forma60 o\'chirishda xatolik',
      error: error.message
    });
  }
};

// @desc    Forma60 ni tiklash
// @route   POST /api/forma60/:id/restore
// @access  Private (Admin)
exports.restoreForma60 = async (req, res) => {
  try {
    const forma60 = await Forma60.findById(req.params.id).where({ isDeleted: true });

    if (!forma60) {
      return res.status(404).json({
        success: false,
        message: 'O\'chirilgan Forma60 topilmadi'
      });
    }

    await forma60.restore(req.user._id);

    res.status(200).json({
      success: true,
      message: 'Forma60 muvaffaqiyatli tiklandi',
      data: forma60
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Forma60 tiklashda xatolik',
      error: error.message
    });
  }
};

// @desc    Forma60 history ni olish
// @route   GET /api/forma60/:id/history
// @access  Private
exports.getForma60History = async (req, res) => {
  try {
    const forma60 = await Forma60.findById(req.params.id)
      .populate('editHistory.editedBy', 'fullName email role');

    if (!forma60) {
      return res.status(404).json({
        success: false,
        message: 'Forma60 topilmadi'
      });
    }

    const timeline = historyTracker.createTimeline(forma60.editHistory);

    res.status(200).json({
      success: true,
      data: {
        totalChanges: forma60.editHistory.length,
        timeline: timeline
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'History olishda xatolik',
      error: error.message
    });
  }
};

// @desc    Ma'lum bir vaqtdagi holatga qaytarish
// @route   POST /api/forma60/:id/restore-version
// @access  Private
exports.restoreToVersion = async (req, res) => {
  try {
    const { historyIndex } = req.body;

    let forma60 = await Forma60.findById(req.params.id);

    if (!forma60) {
      return res.status(404).json({
        success: false,
        message: 'Forma60 topilmadi'
      });
    }

    forma60 = await forma60.restoreToVersion(historyIndex, req.user._id);

    await forma60.populate('address.mahalla', 'name region');
    await forma60.populate('assignedToCardFiller', 'fullName email role');

    res.status(200).json({
      success: true,
      message: 'Forma60 tanlangan versionga qaytarildi',
      data: forma60
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Version ga qaytarishda xatolik',
      error: error.message
    });
  }
};

// @desc    Oxirgi o'zgarishni bekor qilish (undo)
// @route   POST /api/forma60/:id/undo
// @access  Private
exports.undoForma60 = async (req, res) => {
  try {
    let forma60 = await Forma60.findById(req.params.id);

    if (!forma60) {
      return res.status(404).json({
        success: false,
        message: 'Forma60 topilmadi'
      });
    }

    // Undo qilish
    forma60 = await historyTracker.undo(forma60, req.user._id);
    await forma60.save();

    // Populate qilib qaytarish
    await forma60.populate('address.mahalla', 'name region');
    await forma60.populate('assignedToCardFiller', 'fullName email role');
    await forma60.populate('createdBy', 'fullName email');

    res.status(200).json({
      success: true,
      message: 'Undo muvaffaqiyatli amalga oshirildi',
      data: forma60
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Undo amalga oshmadi',
      error: error.message
    });
  }
};

// @desc    Bekor qilingan o'zgarishni qaytarish (redo)
// @route   POST /api/forma60/:id/redo
// @access  Private
exports.redoForma60 = async (req, res) => {
  try {
    let forma60 = await Forma60.findById(req.params.id);

    if (!forma60) {
      return res.status(404).json({
        success: false,
        message: 'Forma60 topilmadi'
      });
    }

    // Redo qilish
    forma60 = await historyTracker.redo(forma60, req.user._id);
    await forma60.save();

    // Populate qilib qaytarish
    await forma60.populate('address.mahalla', 'name region');
    await forma60.populate('assignedToCardFiller', 'fullName email role');
    await forma60.populate('createdBy', 'fullName email');

    res.status(200).json({
      success: true,
      message: 'Redo muvaffaqiyatli amalga oshirildi',
      data: forma60
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Redo amalga oshmadi',
      error: error.message
    });
  }
};

// @desc    Karta filler ga biriktirish
// @route   POST /api/forma60/:id/assign
// @access  Private (Forma60 filler, Admin)
exports.assignToCardFiller = async (req, res) => {
  try {
    const { kartaFillerId } = req.body;

    // Karta filler ni tekshirish
    const kartaFiller = await User.findById(kartaFillerId);

    if (!kartaFiller || kartaFiller.role !== 'karta_filler') {
      return res.status(400).json({
        success: false,
        message: 'Yaroqsiz Karta filler'
      });
    }

    const forma60 = await Forma60.findByIdAndUpdate(
      req.params.id,
      {
        assignedToCardFiller: kartaFillerId,
        assignedDate: new Date(),
        status: 'karta_toldirishda',
        updatedBy: req.user._id
      },
      { new: true }
    ).populate('assignedToCardFiller', 'fullName email role phone');

    if (!forma60) {
      return res.status(404).json({
        success: false,
        message: 'Forma60 topilmadi'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Forma60 muvaffaqiyatli biriktirildi',
      data: forma60
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Biriktir ishda xatolik',
      error: error.message
    });
  }
};

// @desc    Karta filler uchun biriktirilgan Forma60 lar
// @route   GET /api/forma60/assigned-to-me
// @access  Private (Karta filler)
exports.getAssignedForma60s = async (req, res) => {
  try {
    // Faqat karta_toldirishda statusdagi forma60 larni qaytarish
    // tugatilgan statusdagilar ses-karta da ko'rinmasligi kerak
    const forma60s = await Forma60.find({
      assignedToCardFiller: req.user._id,
      status: 'karta_toldirishda' // Faqat karta to'ldirishda statusdagilar
    })
      .populate('address.mahalla', 'name region')
      .populate('createdBy', 'fullName email')
      .sort({ assignedDate: -1 });

    res.status(200).json({
      success: true,
      count: forma60s.length,
      data: forma60s
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server xatosi',
      error: error.message
    });
  }
};

// @desc    Statistika
// @route   GET /api/forma60/stats
// @access  Private
exports.getForma60Stats = async (req, res) => {
  try {
    const stats = await Forma60.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const disinfectionStats = await Forma60.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: '$disinfectionStatus',
          count: { $sum: 1 }
        }
      }
    ]);

    const total = await Forma60.countDocuments({ isDeleted: false });

    res.status(200).json({
      success: true,
      data: {
        total: total,
        byStatus: stats,
        byDisinfectionStatus: disinfectionStats
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Statistika olishda xatolik',
      error: error.message
    });
  }
};

module.exports = exports;
