const Karta = require('../models/Karta');
const Forma60 = require('../models/Forma60');

/**
 * KARTA CONTROLLER - TO'LIQ QO'LDA TO'LDIRISH TIZIMI
 * PDF parsing olib tashlandi
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
      forma60,
      createdBy,
      search
    } = req.query;

    const filter = {};

    if (status) filter.status = status;
    if (forma60) filter.forma60 = forma60;
    if (createdBy) filter.createdBy = createdBy;

    const skip = (page - 1) * limit;

    const kartas = await Karta.find(filter)
      .populate('forma60', 'fullName birthDate primaryDiagnosis finalDiagnosis illnessDate')
      .populate('createdBy', 'fullName username role')
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
      .populate({
        path: 'forma60',
        populate: [
          { path: 'assignedToCardFillers', select: 'fullName username role' },
          { path: 'assignedToCardFiller', select: 'fullName username role' },
          { path: 'createdBy', select: 'fullName username role' },
          { path: 'address.mahalla', select: 'name code' }
        ]
      })
      .populate('createdBy', 'fullName username role')
      .populate('updatedBy', 'fullName username')
      .populate('editHistory.editedBy', 'fullName username');

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

// @desc    Forma60 uchun Karta yaratish (qo'lda to'ldirish)
// @route   POST /api/karta/create/:forma60Id
// @access  Private (Karta filler)
exports.createKarta = async (req, res) => {
  try {
    const { forma60Id } = req.params;
    const {
      patientStatus,
      educationType,
      workType,
      transmissionFactor,
      infectionSource,
      laboratoryResults,
      outbreak,
      contactsStatus,
      epidemiologistName,
      notes
    } = req.body;

    // Forma60 ni tekshirish
    const forma60 = await Forma60.findById(forma60Id);
    if (!forma60) {
      return res.status(404).json({
        success: false,
        message: 'Forma60 topilmadi'
      });
    }

    // Allaqachon Karta mavjudligini tekshirish
    const existingKarta = await Karta.findOne({ forma60: forma60Id });
    if (existingKarta) {
      return res.status(400).json({
        success: false,
        message: 'Bu Forma60 uchun Karta allaqachon mavjud'
      });
    }

    // Validatsiya - majburiy maydonlar
    if (!patientStatus) {
      return res.status(400).json({
        success: false,
        message: 'Bemor holati (patientStatus) kiritilishi shart'
      });
    }

    if (!transmissionFactor) {
      return res.status(400).json({
        success: false,
        message: 'Yuqish omili (transmissionFactor) tanlanishi shart'
      });
    }

    if (!infectionSource) {
      return res.status(400).json({
        success: false,
        message: 'Yuqish joyi (infectionSource) tanlanishi shart'
      });
    }

    if (!laboratoryResults || !laboratoryResults.cultureType) {
      return res.status(400).json({
        success: false,
        message: 'Laboratoriya turi (cultureType) tanlanishi shart'
      });
    }

    // Bo'sh stringlarni undefined ga o'girish
    const cleanedData = {
      forma60: forma60Id,
      patientStatus,
      educationType: educationType && educationType.trim() !== '' ? educationType : undefined,
      workType: workType && workType.trim() !== '' ? workType : undefined,
      transmissionFactor,
      infectionSource,
      laboratoryResults: {
        confirmed: laboratoryResults.confirmed || false,
        cultureType: laboratoryResults.cultureType,
        testDate: laboratoryResults.testDate,
        notes: laboratoryResults.notes
      },
      contactsStatus: contactsStatus || [],
      epidemiologistName,
      notes,
      status: 'completed',
      createdBy: req.user._id
    };

    // Outbreak ma'lumotlarini tozalash
    if (outbreak && outbreak.hasOutbreak) {
      cleanedData.outbreak = {
        hasOutbreak: outbreak.hasOutbreak,
        outbreakNumber: outbreak.outbreakNumber,
        locationType: outbreak.locationType && outbreak.locationType.trim() !== '' ? outbreak.locationType : undefined,
        relatedCases: outbreak.relatedCases || []
      };
    } else {
      cleanedData.outbreak = {
        hasOutbreak: false
      };
    }

    // Karta yaratish
    const karta = await Karta.create(cleanedData);

    // Forma60 ni yangilash - Karta dan olingan ma'lumotlarni qo'shish
    const forma60UpdateData = {
      patientStatus,
      transmissionFactor,
      infectionSource,
      laboratoryResults: {
        confirmed: laboratoryResults.confirmed || false,
        cultureType: laboratoryResults.cultureType,
        testDate: laboratoryResults.testDate,
        notes: laboratoryResults.notes
      },
      contactsStatus: contactsStatus || [],
      epidemiologistName,
      status: 'tugatilgan',
      updatedBy: req.user._id
    };

    // Faqat mavjud bo'lsa qo'shish
    if (educationType && educationType.trim() !== '') {
      forma60UpdateData.educationType = educationType;
    }
    if (workType && workType.trim() !== '') {
      forma60UpdateData.workType = workType;
    }

    // Outbreak ma'lumotlarini yangilash
    if (outbreak && outbreak.hasOutbreak) {
      forma60UpdateData.outbreak = {
        hasOutbreak: outbreak.hasOutbreak,
        outbreakNumber: outbreak.outbreakNumber,
        locationType: outbreak.locationType && outbreak.locationType.trim() !== '' ? outbreak.locationType : undefined,
        relatedCases: outbreak.relatedCases || []
      };
    }

    await Forma60.findByIdAndUpdate(
      forma60Id,
      forma60UpdateData,
      { new: true, runValidators: true }
    );

    // Yaratilgan Kartani populate qilib qaytarish
    const populatedKarta = await Karta.findById(karta._id)
      .populate('forma60')
      .populate('createdBy', 'fullName username role');

    res.status(201).json({
      success: true,
      message: 'Karta muvaffaqiyatli yaratildi',
      data: populatedKarta
    });
  } catch (error) {
    // Validatsiya xatolarini boshqarish
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validatsiya xatosi',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server xatosi',
      error: error.message
    });
  }
};

// @desc    Kartani yangilash
// @route   PUT /api/karta/:id
// @access  Private (Karta filler, Admin)
exports.updateKarta = async (req, res) => {
  try {
    const {
      patientStatus,
      educationType,
      workType,
      transmissionFactor,
      infectionSource,
      laboratoryResults,
      outbreak,
      contactsStatus,
      epidemiologistName,
      notes
    } = req.body;

    // Kartani topish
    const karta = await Karta.findById(req.params.id);
    if (!karta) {
      return res.status(404).json({
        success: false,
        message: 'Karta topilmadi'
      });
    }

    // Oldingi holatni saqlash (version control uchun)
    const previousData = {
      patientStatus: karta.patientStatus,
      educationType: karta.educationType,
      workType: karta.workType,
      transmissionFactor: karta.transmissionFactor,
      infectionSource: karta.infectionSource,
      laboratoryResults: karta.laboratoryResults ? JSON.parse(JSON.stringify(karta.laboratoryResults)) : null,
      outbreak: karta.outbreak ? JSON.parse(JSON.stringify(karta.outbreak)) : null,
      contactsStatus: karta.contactsStatus ? JSON.parse(JSON.stringify(karta.contactsStatus)) : null,
      epidemiologistName: karta.epidemiologistName,
      notes: karta.notes
    };

    // O'zgarishlar ro'yxatini yaratish
    const changes = {};

    // Yangilash (bo'sh stringlarni undefined ga o'girish)
    if (patientStatus !== undefined && patientStatus !== karta.patientStatus) {
      changes.patientStatus = { from: karta.patientStatus, to: patientStatus };
      karta.patientStatus = patientStatus;
    }

    // educationType va workType bo'sh bo'lsa undefined qilib belgilash
    if (educationType !== undefined) {
      const newEducationType = educationType && educationType.trim() !== '' ? educationType : undefined;
      if (newEducationType !== karta.educationType) {
        changes.educationType = { from: karta.educationType, to: newEducationType };
        karta.educationType = newEducationType;
      }
    }
    if (workType !== undefined) {
      const newWorkType = workType && workType.trim() !== '' ? workType : undefined;
      if (newWorkType !== karta.workType) {
        changes.workType = { from: karta.workType, to: newWorkType };
        karta.workType = newWorkType;
      }
    }

    if (transmissionFactor !== undefined && transmissionFactor !== karta.transmissionFactor) {
      changes.transmissionFactor = { from: karta.transmissionFactor, to: transmissionFactor };
      karta.transmissionFactor = transmissionFactor;
    }
    if (infectionSource !== undefined && infectionSource !== karta.infectionSource) {
      changes.infectionSource = { from: karta.infectionSource, to: infectionSource };
      karta.infectionSource = infectionSource;
    }
    if (laboratoryResults !== undefined) {
      changes.laboratoryResults = { from: karta.laboratoryResults, to: laboratoryResults };
      karta.laboratoryResults = laboratoryResults;
    }

    // Outbreak ma'lumotlarini tozalash
    if (outbreak !== undefined) {
      if (outbreak && outbreak.hasOutbreak) {
        const newOutbreak = {
          hasOutbreak: outbreak.hasOutbreak,
          outbreakNumber: outbreak.outbreakNumber,
          locationType: outbreak.locationType && outbreak.locationType.trim() !== '' ? outbreak.locationType : undefined,
          relatedCases: outbreak.relatedCases || []
        };
        changes.outbreak = { from: karta.outbreak, to: newOutbreak };
        karta.outbreak = newOutbreak;
      } else {
        const newOutbreak = { hasOutbreak: false };
        changes.outbreak = { from: karta.outbreak, to: newOutbreak };
        karta.outbreak = newOutbreak;
      }
    }

    if (contactsStatus !== undefined) {
      changes.contactsStatus = { from: karta.contactsStatus, to: contactsStatus };
      karta.contactsStatus = contactsStatus;
    }
    if (epidemiologistName !== undefined && epidemiologistName !== karta.epidemiologistName) {
      changes.epidemiologistName = { from: karta.epidemiologistName, to: epidemiologistName };
      karta.epidemiologistName = epidemiologistName;
    }
    if (notes !== undefined && notes !== karta.notes) {
      changes.notes = { from: karta.notes, to: notes };
      karta.notes = notes;
    }

    // Agar o'zgarishlar bo'lsa, tarixga qo'shish
    if (Object.keys(changes).length > 0) {
      karta.editHistory.push({
        editedBy: req.user._id,
        editedAt: new Date(),
        changes: changes,
        previousData: previousData,
        action: 'updated'
      });
    }

    karta.updatedBy = req.user._id;

    await karta.save();

    // Forma60 ni ham yangilash
    await Forma60.findByIdAndUpdate(
      karta.forma60,
      {
        patientStatus: karta.patientStatus,
        educationType: karta.educationType,
        workType: karta.workType,
        transmissionFactor: karta.transmissionFactor,
        infectionSource: karta.infectionSource,
        laboratoryResults: karta.laboratoryResults,
        outbreak: karta.outbreak,
        contactsStatus: karta.contactsStatus,
        epidemiologistName: karta.epidemiologistName,
        updatedBy: req.user._id
      },
      { new: true, runValidators: true }
    );

    const updatedKarta = await Karta.findById(karta._id)
      .populate('forma60')
      .populate('createdBy', 'fullName username')
      .populate('updatedBy', 'fullName username');

    res.status(200).json({
      success: true,
      message: 'Karta muvaffaqiyatli yangilandi',
      data: updatedKarta
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validatsiya xatosi',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server xatosi',
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
      message: 'Karta muvaffaqiyatli o\'chirildi',
      data: {}
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server xatosi',
      error: error.message
    });
  }
};

// @desc    Kartani tiklash (restore)
// @route   POST /api/karta/:id/restore
// @access  Private (Admin)
exports.restoreKarta = async (req, res) => {
  try {
    const karta = await Karta.findOne({ _id: req.params.id, isDeleted: true });

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
      message: 'Server xatosi',
      error: error.message
    });
  }
};

// @desc    Karta tarixini olish
// @route   GET /api/karta/:id/history
// @access  Private
exports.getKartaHistory = async (req, res) => {
  try {
    const karta = await Karta.findById(req.params.id)
      .populate('editHistory.editedBy', 'fullName username role');

    if (!karta) {
      return res.status(404).json({
        success: false,
        message: 'Karta topilmadi'
      });
    }

    res.status(200).json({
      success: true,
      data: karta.editHistory
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server xatosi',
      error: error.message
    });
  }
};

// @desc    Forma60 uchun Kartani olish
// @route   GET /api/karta/forma60/:forma60Id
// @access  Private
exports.getKartaByForma60 = async (req, res) => {
  try {
    const karta = await Karta.findOne({ forma60: req.params.forma60Id })
      .populate('forma60')
      .populate('createdBy', 'fullName username role')
      .populate('updatedBy', 'fullName username');

    if (!karta) {
      return res.status(404).json({
        success: false,
        message: 'Bu Forma60 uchun Karta topilmadi'
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

// @desc    Menga biriktirilgan Kartalar
// @route   GET /api/karta/assigned-to-me
// @access  Private (Karta filler)
exports.getAssignedKartas = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const skip = (page - 1) * limit;

    // Forma60 larni topish (menga biriktirilgan)
    const forma60Filter = {
      $or: [
        { assignedToCardFillers: req.user._id },
        { assignedToCardFiller: req.user._id }
      ]
    };

    const forma60s = await Forma60.find(forma60Filter).select('_id');
    const forma60Ids = forma60s.map(f => f._id);

    // Karta filterini yaratish
    const kartaFilter = {
      forma60: { $in: forma60Ids }
    };

    if (status) kartaFilter.status = status;

    const kartas = await Karta.find(kartaFilter)
      .populate('forma60', 'fullName birthDate primaryDiagnosis illnessDate status')
      .populate('createdBy', 'fullName username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Karta.countDocuments(kartaFilter);

    res.status(200).json({
      success: true,
      count: kartas.length,
      total,
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

// @desc    Statistika - Kartalar soni
// @route   GET /api/karta/stats
// @access  Private (Admin)
exports.getKartaStats = async (req, res) => {
  try {
    const total = await Karta.countDocuments();

    // Status bo'yicha hisoblash
    const yangi = await Karta.countDocuments({ status: 'yangi' });
    const processing = await Karta.countDocuments({ status: 'processing' });
    const completed = await Karta.countDocuments({ status: 'completed' });
    const draft = await Karta.countDocuments({ status: 'draft' });

    // Oxirgi 30 kun ichida yaratilgan
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentCount = await Karta.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });

    // byStatus arrayini yaratish (frontend kutgan formatda)
    const byStatus = [
      { _id: 'yangi', count: yangi },
      { _id: 'processing', count: processing },
      { _id: 'completed', count: completed },
      { _id: 'draft', count: draft }
    ];

    res.status(200).json({
      success: true,
      data: {
        total,
        byStatus,
        draft,
        completed,
        recentCount
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

// @desc    Kartani versiyaga qaytarish
// @route   POST /api/karta/:id/restore/:historyIndex
// @access  Private (Admin, Karta filler)
exports.restoreKartaToVersion = async (req, res) => {
  try {
    const { id, historyIndex } = req.params;

    const karta = await Karta.findById(id);
    if (!karta) {
      return res.status(404).json({
        success: false,
        message: 'Karta topilmadi'
      });
    }

    const index = parseInt(historyIndex);
    if (isNaN(index) || index < 0 || index >= karta.editHistory.length) {
      return res.status(400).json({
        success: false,
        message: 'Noto\'g\'ri tarix indeksi'
      });
    }

    // Versiyaga qaytarish
    await karta.restoreToVersion(index, req.user._id);

    // Forma60 ni ham yangilash
    await Forma60.findByIdAndUpdate(
      karta.forma60,
      {
        patientStatus: karta.patientStatus,
        educationType: karta.educationType,
        workType: karta.workType,
        transmissionFactor: karta.transmissionFactor,
        infectionSource: karta.infectionSource,
        laboratoryResults: karta.laboratoryResults,
        outbreak: karta.outbreak,
        contactsStatus: karta.contactsStatus,
        epidemiologistName: karta.epidemiologistName,
        updatedBy: req.user._id
      },
      { new: true, runValidators: true }
    );

    const restoredKarta = await Karta.findById(id)
      .populate('forma60')
      .populate('createdBy', 'fullName username')
      .populate('updatedBy', 'fullName username')
      .populate('editHistory.editedBy', 'fullName username');

    res.status(200).json({
      success: true,
      message: 'Karta oldingi versiyaga qaytarildi',
      data: restoredKarta
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server xatosi',
      error: error.message
    });
  }
};
