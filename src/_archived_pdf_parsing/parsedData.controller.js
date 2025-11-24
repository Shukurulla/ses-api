const ParsedData = require('../models/ParsedData');
const Forma60 = require('../models/Forma60');
const Karta = require('../models/Karta');
const { PDFParserManager } = require('../utils/pdfParsers');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

/**
 * Multer configuration for PDF file upload
 */
const storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../uploads/pdfs');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'pdf-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Faqat PDF fayllar yuklanishi mumkin'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

/**
 * @desc    PDF faylni yuklash va parse qilish
 * @route   POST /api/parsed-data/upload
 * @access  Private
 */
const uploadAndParsePDF = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'PDF fayl yuklanmagan'
      });
    }

    const { pdfType, forma60Id, kartaId } = req.body;

    // PDF type validatsiya
    if (!pdfType || !['type1', 'type2', 'type3'].includes(pdfType)) {
      return res.status(400).json({
        success: false,
        message: 'PDF type noto\'g\'ri (type1, type2 yoki type3 bo\'lishi kerak)'
      });
    }

    // PDF faylni parse qilish
    const parsedResult = await PDFParserManager.parsePDF(req.file.path, pdfType);

    // Ma'lumotlarni bazaga saqlash
    const parsedData = new ParsedData({
      pdfType,
      rawText: parsedResult.raw,
      parsedFields: parsedResult.parsed,
      metadata: {
        numPages: parsedResult.metadata?.numPages,
        pdfInfo: parsedResult.metadata?.info
      },
      pdfFile: {
        originalName: req.file.originalname,
        fileName: req.file.filename,
        filePath: req.file.path,
        fileSize: req.file.size,
        mimeType: req.file.mimetype
      },
      uploadedBy: req.user._id,
      parseStatus: 'completed'
    });

    // Forma60 yoki Karta bilan bog'lash
    if (forma60Id) {
      const forma60 = await Forma60.findById(forma60Id);
      if (!forma60) {
        return res.status(404).json({
          success: false,
          message: 'Forma60 topilmadi'
        });
      }
      parsedData.forma60 = forma60Id;

      // Validatsiya qilish
      await parsedData.validateWithForma60(forma60);
    }

    if (kartaId) {
      const karta = await Karta.findById(kartaId);
      if (!karta) {
        return res.status(404).json({
          success: false,
          message: 'Karta topilmadi'
        });
      }
      parsedData.karta = kartaId;
    }

    await parsedData.save();

    res.status(201).json({
      success: true,
      message: 'PDF muvaffaqiyatli parse qilindi',
      data: parsedData
    });
  } catch (error) {
    console.error('PDF parse error:', error);
    res.status(500).json({
      success: false,
      message: 'PDF parse qilishda xatolik yuz berdi',
      error: error.message
    });
  }
};

/**
 * @desc    Barcha parse qilingan ma'lumotlarni olish
 * @route   GET /api/parsed-data
 * @access  Private
 */
const getAllParsedData = async (req, res) => {
  try {
    const { pdfType, status, page = 1, limit = 20, kartaId, forma60Id } = req.query;

    const query = {};
    if (pdfType) query.pdfType = pdfType;
    if (status) query.status = status;
    if (kartaId) query.karta = kartaId;
    if (forma60Id) query.forma60 = forma60Id;

    const parsedData = await ParsedData.find(query)
      .populate('uploadedBy', 'fullName email role')
      .populate('verifiedBy', 'fullName email')
      .populate('forma60', 'formNumber fullName illnessDate')
      .populate('karta', 'caseNumber patientFullName illnessDate')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await ParsedData.countDocuments(query);

    res.status(200).json({
      success: true,
      data: parsedData,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count
    });
  } catch (error) {
    console.error('Get parsed data error:', error);
    res.status(500).json({
      success: false,
      message: 'Ma\'lumotlarni olishda xatolik yuz berdi',
      error: error.message
    });
  }
};

/**
 * @desc    Bitta parse qilingan ma'lumotni olish
 * @route   GET /api/parsed-data/:id
 * @access  Private
 */
const getParsedDataById = async (req, res) => {
  try {
    const parsedData = await ParsedData.findById(req.params.id)
      .populate('uploadedBy', 'fullName email role')
      .populate('verifiedBy', 'fullName email')
      .populate('forma60')
      .populate('karta');

    if (!parsedData) {
      return res.status(404).json({
        success: false,
        message: 'Ma\'lumot topilmadi'
      });
    }

    res.status(200).json({
      success: true,
      data: parsedData
    });
  } catch (error) {
    console.error('Get parsed data by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Ma\'lumotni olishda xatolik yuz berdi',
      error: error.message
    });
  }
};

/**
 * @desc    Parse qilingan ma'lumotni yangilash
 * @route   PUT /api/parsed-data/:id
 * @access  Private
 */
const updateParsedData = async (req, res) => {
  try {
    const { parsedFields, notes, status } = req.body;

    const parsedData = await ParsedData.findById(req.params.id);

    if (!parsedData) {
      return res.status(404).json({
        success: false,
        message: 'Ma\'lumot topilmadi'
      });
    }

    // Faqat ma'lum maydonlarni yangilash
    if (parsedFields) parsedData.parsedFields = parsedFields;
    if (notes !== undefined) parsedData.notes = notes;
    if (status) parsedData.status = status;

    await parsedData.save();

    res.status(200).json({
      success: true,
      message: 'Ma\'lumot muvaffaqiyatli yangilandi',
      data: parsedData
    });
  } catch (error) {
    console.error('Update parsed data error:', error);
    res.status(500).json({
      success: false,
      message: 'Ma\'lumotni yangilashda xatolik yuz berdi',
      error: error.message
    });
  }
};

/**
 * @desc    Parse qilingan ma'lumotni o'chirish
 * @route   DELETE /api/parsed-data/:id
 * @access  Private (Admin only)
 */
const deleteParsedData = async (req, res) => {
  try {
    const parsedData = await ParsedData.findById(req.params.id);

    if (!parsedData) {
      return res.status(404).json({
        success: false,
        message: 'Ma\'lumot topilmadi'
      });
    }

    // PDF faylni o'chirish
    if (parsedData.pdfFile.filePath) {
      try {
        await fs.unlink(parsedData.pdfFile.filePath);
      } catch (err) {
        console.error('PDF fayl o\'chirishda xatolik:', err);
      }
    }

    await parsedData.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Ma\'lumot muvaffaqiyatli o\'chirildi'
    });
  } catch (error) {
    console.error('Delete parsed data error:', error);
    res.status(500).json({
      success: false,
      message: 'Ma\'lumotni o\'chirishda xatolik yuz berdi',
      error: error.message
    });
  }
};

/**
 * @desc    Forma60 bilan bog'lash va validatsiya qilish
 * @route   POST /api/parsed-data/:id/link-forma60
 * @access  Private
 */
const linkToForma60 = async (req, res) => {
  try {
    const { forma60Id } = req.body;

    const parsedData = await ParsedData.findById(req.params.id);
    if (!parsedData) {
      return res.status(404).json({
        success: false,
        message: 'Parse qilingan ma\'lumot topilmadi'
      });
    }

    const forma60 = await Forma60.findById(forma60Id);
    if (!forma60) {
      return res.status(404).json({
        success: false,
        message: 'Forma60 topilmadi'
      });
    }

    parsedData.forma60 = forma60Id;

    // Validatsiya qilish
    const validationResult = await parsedData.validateWithForma60(forma60);

    res.status(200).json({
      success: true,
      message: 'Forma60 bilan muvaffaqiyatli bog\'landi',
      data: parsedData,
      validation: validationResult
    });
  } catch (error) {
    console.error('Link to Forma60 error:', error);
    res.status(500).json({
      success: false,
      message: 'Forma60 bilan bog\'lashda xatolik yuz berdi',
      error: error.message
    });
  }
};

/**
 * @desc    Statistika olish
 * @route   GET /api/parsed-data/stats
 * @access  Private
 */
const getStats = async (req, res) => {
  try {
    const typeStats = await ParsedData.getStatsByType();
    const totalCount = await ParsedData.countDocuments();
    const unlinkedCount = await ParsedData.countDocuments({
      forma60: null,
      karta: null,
      status: 'active'
    });

    res.status(200).json({
      success: true,
      data: {
        total: totalCount,
        unlinked: unlinkedCount,
        byType: typeStats
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Statistikani olishda xatolik yuz berdi',
      error: error.message
    });
  }
};

/**
 * @desc    Bog'lanmagan ma'lumotlarni olish
 * @route   GET /api/parsed-data/unlinked
 * @access  Private
 */
const getUnlinkedData = async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const unlinkedData = await ParsedData.getUnlinkedData(parseInt(limit));

    res.status(200).json({
      success: true,
      data: unlinkedData,
      count: unlinkedData.length
    });
  } catch (error) {
    console.error('Get unlinked data error:', error);
    res.status(500).json({
      success: false,
      message: 'Bog\'lanmagan ma\'lumotlarni olishda xatolik yuz berdi',
      error: error.message
    });
  }
};

module.exports = {
  upload,
  uploadAndParsePDF,
  getAllParsedData,
  getParsedDataById,
  updateParsedData,
  deleteParsedData,
  linkToForma60,
  getStats,
  getUnlinkedData
};
