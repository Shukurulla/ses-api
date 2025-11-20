const Karta = require('../models/Karta');
const Forma60 = require('../models/Forma60');
const { PDFParserManager } = require('../utils/pdfParsers');
const historyTracker = require('../middlewares/historyTracker');
const { deleteUploadedFile } = require('../middlewares/upload');
const path = require('path');

/**
 * Karta Controller
 * Karta filler role uchun - PDF upload va parse qilish
 */

// @desc    Barcha Kartalarni olish
// @route   GET /api/karta
// @access  Private (Admin, Karta filler)
exports.getAllKartas = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      pdfType,
      forma60,
      createdBy,
      search
    } = req.query;

    const filter = {};

    if (status) filter.status = status;
    if (pdfType) filter.pdfType = pdfType;
    if (forma60) filter.forma60 = forma60;
    if (createdBy) filter.createdBy = createdBy;

    const skip = (page - 1) * limit;

    const kartas = await Karta.find(filter)
      .populate('forma60', 'fullName birthDate primaryDiagnosis finalDiagnosis')
      .populate('createdBy', 'fullName email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Karta.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: kartas.length,
      total: total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: kartas
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server xatosi',
      error: error.message
    });
  }
};

// @desc    Bitta Kartani olish
// @route   GET /api/karta/:id
// @access  Private
exports.getKartaById = async (req, res) => {
  try {
    const karta = await Karta.findById(req.params.id)
      .populate('forma60')
      .populate('createdBy', 'fullName email role')
      .populate('editHistory.editedBy', 'fullName email');

    if (!karta) {
      return res.status(404).json({
        success: false,
        message: 'Karta topilmadi'
      });
    }

    res.status(200).json({
      success: true,
      data: karta
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server xatosi',
      error: error.message
    });
  }
};

// @desc    Yangi Karta yaratish (PDF upload bilan)
// @route   POST /api/karta
// @route   POST /api/karta/from-forma60/:forma60Id
// @access  Private (Karta filler)
exports.createKarta = async (req, res) => {
  try {
    // forma60Id ni params yoki body dan olish
    const forma60Id = req.params.forma60Id || req.body.forma60Id;
    const { pdfType } = req.body;

    // Forma60 ni tekshirish
    const forma60 = await Forma60.findById(forma60Id);

    if (!forma60) {
      // Agar PDF yuklangan bo'lsa o'chirish
      if (req.file) {
        deleteUploadedFile(req.file.path);
      }

      return res.status(404).json({
        success: false,
        message: 'Forma60 topilmadi'
      });
    }

    // PDF file tekshirish
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'PDF fayl yuklanmagan'
      });
    }

    const pdfFileInfo = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      path: req.file.path,
      mimetype: req.file.mimetype,
      size: req.file.size
    };

    // Karta yaratish (PDF faqat file sifatida saqlanadi)
    const kartaData = {
      forma60: forma60Id,
      pdfType: pdfType || 'type1',
      uploadedPdf: pdfFileInfo,
      createdBy: req.user._id
    };

    const karta = await Karta.create(kartaData);

    // History ga created action qo'shish
    karta.editHistory.push({
      editedBy: req.user._id,
      editedAt: new Date(),
      action: 'created'
    });

    await karta.save();

    // Forma60 statusini yangilash - Karta yaratilgandan keyin tugatilgan statusiga o'tkazish
    forma60.status = 'tugatilgan';
    await forma60.save();

    await karta.populate('forma60', 'fullName birthDate primaryDiagnosis finalDiagnosis');
    await karta.populate('createdBy', 'fullName email');

    res.status(201).json({
      success: true,
      message: 'Karta muvaffaqiyatli yaratildi',
      data: karta
    });
  } catch (error) {
    // Xato bo'lsa PDF ni o'chirish
    if (req.file) {
      deleteUploadedFile(req.file.path);
    }

    res.status(400).json({
      success: false,
      message: 'Karta yaratishda xatolik',
      error: error.message
    });
  }
};

// @desc    PDF ni parse qilish va preview uchun ma'lumotlarni qaytarish (karta yaratmasdan)
// @route   POST /api/karta/preview/:forma60Id
// @access  Private (Karta filler)
exports.previewPDFData = async (req, res) => {
  try {
    const forma60Id = req.params.forma60Id;
    const { pdfType } = req.body;

    // Forma60 ni tekshirish
    const forma60 = await Forma60.findById(forma60Id);

    if (!forma60) {
      // Agar PDF yuklangan bo'lsa o'chirish
      if (req.file) {
        deleteUploadedFile(req.file.path);
      }

      return res.status(404).json({
        success: false,
        message: 'Forma60 topilmadi'
      });
    }

    // PDF file tekshirish
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'PDF fayl yuklanmagan'
      });
    }

    // PDF type ni tekshirish yoki auto-detect
    let detectedType = pdfType;

    if (!detectedType) {
      try {
        detectedType = await PDFParserManager.detectPDFType(req.file.path);
      } catch (error) {
        console.error('PDF type detection error:', error);
        detectedType = 'type1'; // Default
      }
    }

    // PDF ni parse qilish
    let parsedData;
    try {
      parsedData = await PDFParserManager.parsePDF(req.file.path, detectedType);
    } catch (parseError) {
      // Parse qilishda xato bo'lsa PDF ni o'chirish
      deleteUploadedFile(req.file.path);

      return res.status(400).json({
        success: false,
        message: 'PDF ni parse qilishda xatolik',
        error: parseError.message
      });
    }

    // Forma60 va PDF ma'lumotlarini merge qilish
    const mergedData = PDFParserManager.mergeWithForma60(
      forma60.toObject(),
      parsedData,
      detectedType
    );

    // PDF file ma'lumotlari
    const pdfFileInfo = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      path: req.file.path,
      mimetype: req.file.mimetype,
      size: req.file.size
    };

    // Faqat preview ma'lumotlarini qaytarish (karta yaratmasdan)
    res.status(200).json({
      success: true,
      message: 'PDF muvaffaqiyatli parse qilindi',
      data: {
        forma60: forma60,
        pdfType: detectedType,
        parsedData: parsedData.parsed,
        rawText: parsedData.raw,
        mergedData: mergedData,
        pdfFile: pdfFileInfo,
        validation: mergedData.validation
      }
    });
  } catch (error) {
    // Xato bo'lsa PDF ni o'chirish
    if (req.file) {
      deleteUploadedFile(req.file.path);
    }

    res.status(400).json({
      success: false,
      message: 'PDF parse qilishda xatolik',
      error: error.message
    });
  }
};

// @desc    Kartani yangilash (merge qilingan ma'lumotlarni)
// @route   PUT /api/karta/:id
// @access  Private (Karta filler)
exports.updateKarta = async (req, res) => {
  try {
    let karta = await Karta.findById(req.params.id);

    if (!karta) {
      return res.status(404).json({
        success: false,
        message: 'Karta topilmadi'
      });
    }

    req.body.updatedBy = req.user._id;

    karta = await Karta.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    ).populate('forma60')
     .populate('createdBy', 'fullName email');

    res.status(200).json({
      success: true,
      message: 'Karta muvaffaqiyatli yangilandi',
      data: karta
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Karta yangilashda xatolik',
      error: error.message
    });
  }
};

// @desc    Kartani verify qilish
// @route   POST /api/karta/:id/verify
// @access  Private (Karta filler, Admin)
exports.verifyKarta = async (req, res) => {
  try {
    const karta = await Karta.findByIdAndUpdate(
      req.params.id,
      {
        updatedBy: req.user._id
      },
      { new: true }
    ).populate('forma60')
     .populate('createdBy', 'fullName email');

    if (!karta) {
      return res.status(404).json({
        success: false,
        message: 'Karta topilmadi'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Karta muvaffaqiyatli verify qilindi',
      data: karta
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Verify qilishda xatolik',
      error: error.message
    });
  }
};

// @desc    Kartani complete qilish
// @route   POST /api/karta/:id/complete
// @access  Private (Karta filler)
exports.completeKarta = async (req, res) => {
  try {
    const karta = await Karta.findById(req.params.id).populate('forma60');

    if (!karta) {
      return res.status(404).json({
        success: false,
        message: 'Karta topilmadi'
      });
    }

    if (karta.status !== 'verified') {
      return res.status(400).json({
        success: false,
        message: 'Karta avval verify qilinishi kerak'
      });
    }

    karta.status = 'completed';
    karta.updatedBy = req.user._id;
    await karta.save();

    // Forma60 statusini yangilash
    if (karta.forma60) {
      const forma60 = await Forma60.findById(karta.forma60._id);
      if (forma60) {
        forma60.status = 'tugatilgan';
        await forma60.save();
      }
    }

    res.status(200).json({
      success: true,
      message: 'Karta muvaffaqiyatli yakunlandi',
      data: karta
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Complete qilishda xatolik',
      error: error.message
    });
  }
};

// @desc    Kartani o'chirish (soft delete)
// @route   DELETE /api/karta/:id
// @access  Private (Admin)
exports.deleteKarta = async (req, res) => {
  try {
    const karta = await Karta.findById(req.params.id);

    if (!karta) {
      return res.status(404).json({
        success: false,
        message: 'Karta topilmadi'
      });
    }

    await karta.softDelete(req.user._id);

    res.status(200).json({
      success: true,
      message: 'Karta muvaffaqiyatli o\'chirildi'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Karta o\'chirishda xatolik',
      error: error.message
    });
  }
};

// @desc    Kartani tiklash
// @route   POST /api/karta/:id/restore
// @access  Private (Admin)
exports.restoreKarta = async (req, res) => {
  try {
    const karta = await Karta.findById(req.params.id).where({ isDeleted: true });

    if (!karta) {
      return res.status(404).json({
        success: false,
        message: 'O\'chirilgan Karta topilmadi'
      });
    }

    await karta.restore(req.user._id);

    res.status(200).json({
      success: true,
      message: 'Karta muvaffaqiyatli tiklandi',
      data: karta
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Karta tiklashda xatolik',
      error: error.message
    });
  }
};

// @desc    Karta history ni olish
// @route   GET /api/karta/:id/history
// @access  Private
exports.getKartaHistory = async (req, res) => {
  try {
    const karta = await Karta.findById(req.params.id)
      .populate('editHistory.editedBy', 'fullName email role');

    if (!karta) {
      return res.status(404).json({
        success: false,
        message: 'Karta topilmadi'
      });
    }

    const timeline = historyTracker.createTimeline(karta.editHistory);

    res.status(200).json({
      success: true,
      data: {
        totalChanges: karta.editHistory.length,
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

// @desc    PDF faylni download qilish
// @route   GET /api/karta/:id/download-pdf
// @access  Private
exports.downloadPDF = async (req, res) => {
  try {
    const karta = await Karta.findById(req.params.id);

    if (!karta) {
      return res.status(404).json({
        success: false,
        message: 'Karta topilmadi'
      });
    }

    if (!karta.uploadedPdf || !karta.uploadedPdf.path) {
      return res.status(404).json({
        success: false,
        message: 'PDF fayl topilmadi'
      });
    }

    const filePath = karta.uploadedPdf.path;

    res.download(filePath, karta.uploadedPdf.originalName, (err) => {
      if (err) {
        res.status(500).json({
          success: false,
          message: 'PDF download qilishda xatolik',
          error: err.message
        });
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server xatosi',
      error: error.message
    });
  }
};

// @desc    Validation warnings ni olish
// @route   GET /api/karta/:id/validation
// @access  Private
exports.getValidationWarnings = async (req, res) => {
  try {
    const karta = await Karta.findById(req.params.id);

    if (!karta) {
      return res.status(404).json({
        success: false,
        message: 'Karta topilmadi'
      });
    }

    if (!karta.mergedData || !karta.mergedData.validation) {
      return res.status(404).json({
        success: false,
        message: 'Validation ma\'lumotlari topilmadi'
      });
    }

    res.status(200).json({
      success: true,
      data: karta.mergedData.validation
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
// @route   GET /api/karta/stats
// @access  Private
exports.getKartaStats = async (req, res) => {
  try {
    const stats = await Karta.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const pdfTypeStats = await Karta.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: '$pdfType',
          count: { $sum: 1 }
        }
      }
    ]);

    const total = await Karta.countDocuments({ isDeleted: false });

    res.status(200).json({
      success: true,
      data: {
        total: total,
        byStatus: stats,
        byPdfType: pdfTypeStats
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

// @desc    Menga biriktirilgan Kartalar (Karta filler)
// @route   GET /api/karta/assigned-to-me
// @access  Private (Karta filler)
exports.getMyAssignedKartas = async (req, res) => {
  try {
    const kartas = await Karta.find({
      assignedToCardFiller: req.user._id
    })
      .populate('forma60', 'fullName birthDate primaryDiagnosis')
      .populate('createdBy', 'fullName email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: kartas.length,
      data: kartas
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server xatosi',
      error: error.message
    });
  }
};

// @desc    Forma60 bo'yicha kartalarni olish
// @route   GET /api/karta/forma60/:forma60Id
// @access  Private
exports.getKartasByForma60 = async (req, res) => {
  try {
    const kartas = await Karta.find({ forma60: req.params.forma60Id })
      .populate('createdBy', 'fullName email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: kartas.length,
      data: kartas
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server xatosi',
      error: error.message
    });
  }
};

// @desc    Karta ma'lumotlarini qo'lda yangilash
// @route   PUT /api/karta/:id
// @access  Private (Karta filler)
exports.updateKartaData = async (req, res) => {
  try {
    const karta = await Karta.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        updatedBy: req.user._id
      },
      { new: true, runValidators: true }
    ).populate('forma60', 'fullName birthDate')
     .populate('createdBy', 'fullName email');

    if (!karta) {
      return res.status(404).json({
        success: false,
        message: 'Karta topilmadi'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Karta muvaffaqiyatli yangilandi',
      data: karta
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Kartani yangilashda xatolik',
      error: error.message
    });
  }
};

module.exports = exports;
