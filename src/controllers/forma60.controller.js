const Forma60 = require('../models/Forma60');
const District = require('../models/District');
const User = require('../models/User');
const mongoose = require('mongoose');
const { ObjectId } = require('mongodb'); // Native driver ObjectId
const openstreetmapService = require('../services/openstreetmap.service');
const historyTracker = require('../middlewares/historyTracker');

/**
 * Forma60 Controller
 * Roles.tz talablariga muvofiq CRUD operatsiyalar
 */

// @desc    Barcha Forma60 larni olish (pagination bilan)
// @route   GET /api/forma60
// @access  Private (Admin, Forma60 filler)
exports.getAllForma60 = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      district,
      mahalla, // yangi
      disinfectionStatus,
      assignedToCardFiller,
      createdBy,
      startDate,
      endDate,
      search,
      diagnosis,
      // Advanced filters
      referralType, // Qayerdan keldi (Infeksiya, Bolnitsa, Ekstren, Poliklinika)
      referralClinic, // Poliklinika nomi (agar Poliklinika tanlangan bo'lsa)
      ageFrom,
      ageTo,
      illnessDateFrom,
      illnessDateTo,
      contactDateFrom,
      contactDateTo,
      hospitalizationDateFrom,
      hospitalizationDateTo,
      disinfectionRequired,
      createdAtFrom,
      createdAtTo
    } = req.query;

    // Filter yaratish
    const filter = { isDeleted: { $ne: true } };

    if (status) filter.status = status;
    if (district) {
      filter['address.mahalla'] = mongoose.Types.ObjectId.isValid(district)
        ? new mongoose.Types.ObjectId(district)
        : district;
    }
    if (mahalla) {
      // Native MongoDB ObjectId ishlatish
      if (ObjectId.isValid(mahalla)) {
        filter['address.mahalla'] = new ObjectId(mahalla);
      } else {
        filter['address.mahalla'] = mahalla;
      }
    }
    if (disinfectionStatus) filter.disinfectionStatus = disinfectionStatus;
    if (assignedToCardFiller) filter.assignedToCardFiller = assignedToCardFiller;
    if (createdBy) filter.createdBy = createdBy;

    // Sana bo'yicha filter (eski - createdAt uchun)
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    // Search (ism bo'yicha)
    if (search) {
      filter.fullName = { $regex: search, $options: 'i' };
    }

    // Tashxis bo'yicha filter
    if (diagnosis) {
      filter.primaryDiagnosis = { $regex: diagnosis, $options: 'i' };
    }

    // === Advanced filters ===

    // Qayerdan keldi (referralType) - Infeksiya, Bolnitsa, Ekstren, Poliklinika
    if (referralType) {
      filter.referralType = referralType;
    }

    // Poliklinika nomi (referralClinic) - faqat Poliklinika tanlanganda
    if (referralClinic) {
      filter['referralClinic.institution_name'] = { $regex: referralClinic, $options: 'i' };
    }

    // Yosh bo'yicha filter
    if (ageFrom || ageTo) {
      filter.age = {};
      if (ageFrom) filter.age.$gte = parseInt(ageFrom);
      if (ageTo) filter.age.$lte = parseInt(ageTo);
    }

    // Kasallanish sanasi bo'yicha filter
    if (illnessDateFrom || illnessDateTo) {
      filter.illnessDate = {};
      if (illnessDateFrom) filter.illnessDate.$gte = new Date(illnessDateFrom);
      if (illnessDateTo) filter.illnessDate.$lte = new Date(illnessDateTo);
    }

    // Murojaat sanasi bo'yicha filter
    if (contactDateFrom || contactDateTo) {
      filter.contactDate = {};
      if (contactDateFrom) filter.contactDate.$gte = new Date(contactDateFrom);
      if (contactDateTo) filter.contactDate.$lte = new Date(contactDateTo);
    }

    // Gospitalizatsiya sanasi bo'yicha filter
    if (hospitalizationDateFrom || hospitalizationDateTo) {
      filter.hospitalizationDate = {};
      if (hospitalizationDateFrom) filter.hospitalizationDate.$gte = new Date(hospitalizationDateFrom);
      if (hospitalizationDateTo) filter.hospitalizationDate.$lte = new Date(hospitalizationDateTo);
    }

    // Dezinfeksiya kerakligi bo'yicha filter
    if (disinfectionRequired !== undefined && disinfectionRequired !== '') {
      filter.disinfectionRequired = disinfectionRequired === 'true';
    }

    // Yaratilgan sana bo'yicha filter (yangi)
    if (createdAtFrom || createdAtTo) {
      if (!filter.createdAt) filter.createdAt = {};
      if (createdAtFrom) filter.createdAt.$gte = new Date(createdAtFrom);
      if (createdAtTo) filter.createdAt.$lte = new Date(createdAtTo);
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
      limit: parseInt(limit),
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

// @desc    BARCHA Forma60 larni olish (limit YO'Q - harita uchun)
// @route   GET /api/forma60/all
// @access  Private (Admin)
exports.getAllForma60ForMap = async (req, res) => {
  try {
    const forma60s = await Forma60.find({})
      .populate('address.mahalla', 'name region')
      .populate('assignedToCardFiller', 'fullName email role')
      .populate('createdBy', 'fullName email')
      .populate('updatedBy', 'fullName email')
      .sort({ createdAt: -1 });

    const total = await Forma60.countDocuments({});

    res.status(200).json({
      success: true,
      count: forma60s.length,
      total: total,
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
      .populate('assignedToCardFiller', 'fullName email role phoneNumber')
      .populate('assignedToCardFillers', 'fullName email role phoneNumber')
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

    // Address location ni o'chirish (agar coordinates yo'q bo'lsa)
    if (req.body.address && req.body.address.location) {
      if (!req.body.address.location.coordinates || req.body.address.location.coordinates.length === 0) {
        delete req.body.address.location;
      }
    }

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

    // Agar dezinfeksiya kerak bo'lsa, avtomatik Disinfection yozuvi yaratish
    if (forma60.disinfectionRequired === true) {
      const Disinfection = require('../models/Disinfection');

      try {
        await Disinfection.create({
          forma60: forma60._id,
          workplace: {
            name: forma60.workplace?.name || forma60.address?.fullAddress || 'Noma\'lum',
            address: forma60.workplace?.address || forma60.address?.fullAddress,
            location: forma60.workplace?.location,
            lat: forma60.workplace?.osmData?.lat,
            lon: forma60.workplace?.osmData?.lon
          },
          status: 'kerak',
          createdBy: req.user._id
        });
      } catch (disinfectionError) {
        console.error('Dezinfeksiya yaratishda xatolik:', disinfectionError);
        // Dezinfeksiya yaratilmasa ham Forma60 yaratilsin
      }
    }

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

    // Address location ni o'chirish (agar coordinates yo'q bo'lsa)
    if (req.body.address && req.body.address.location) {
      if (!req.body.address.location.coordinates || req.body.address.location.coordinates.length === 0) {
        delete req.body.address.location;
      }
    }

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
    const Karta = require('../models/Karta');

    // Barcha kartaga ega forma60 ID larini topish
    const kartas = await Karta.find({ isDeleted: false })
      .select('forma60')
      .lean();

    const forma60IdsWithKarta = kartas.map(k => k.forma60.toString());

    // O'ziga biriktirilgan va hali kartasi to'ldirilmagan forma60 larni ko'rsatish
    const forma60s = await Forma60.find({
      assignedToCardFillers: req.user._id,
      _id: { $nin: forma60IdsWithKarta } // Kartasi bo'lmagan forma60 larni olish
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
