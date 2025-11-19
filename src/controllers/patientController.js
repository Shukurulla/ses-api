const Patient = require('../models/Patient');

// @desc    Barcha bemorlarni olish
// @route   GET /api/patients
// @access  Private
exports.getPatients = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      diagnosis,
      status,
      referralSource,
      district,
      startDate,
      endDate
    } = req.query;

    const query = {};

    // Qidiruv
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { registrationAddress: { $regex: search, $options: 'i' } }
      ];
    }

    // Filtrlar
    if (diagnosis) query.diagnosis = diagnosis;
    if (status) query.status = status;
    if (referralSource) query.referralSource = referralSource;
    if (district) query.district = district;

    // Sana bo'yicha filtr
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const patients = await Patient.find(query)
      .populate('createdBy', 'fullName role')
      .populate('contactedDoctors')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await Patient.countDocuments(query);

    res.status(200).json({
      success: true,
      count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      data: patients
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Bemorlarni olishda xatolik',
      error: error.message
    });
  }
};

// @desc    Bir bemorni olish
// @route   GET /api/patients/:id
// @access  Private
exports.getPatient = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id)
      .populate('createdBy', 'fullName role workplace')
      .populate('updatedBy', 'fullName role')
      .populate('contactedDoctors');

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Bemor topilmadi'
      });
    }

    res.status(200).json({
      success: true,
      data: patient
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Bemorni olishda xatolik',
      error: error.message
    });
  }
};

// @desc    Yangi bemor qo'shish
// @route   POST /api/patients
// @access  Private
exports.createPatient = async (req, res) => {
  try {
    // Foydalanuvchi ID ni qo'shish
    req.body.createdBy = req.user._id;

    const patient = await Patient.create(req.body);

    res.status(201).json({
      success: true,
      message: 'Bemor muvaffaqiyatli qo\'shildi',
      data: patient
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Bemorni qo\'shishda xatolik',
      error: error.message
    });
  }
};

// @desc    Bemorni yangilash
// @route   PUT /api/patients/:id
// @access  Private
exports.updatePatient = async (req, res) => {
  try {
    // Yangilovchi ID ni qo'shish
    req.body.updatedBy = req.user._id;

    const patient = await Patient.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Bemor topilmadi'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Bemor muvaffaqiyatli yangilandi',
      data: patient
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Bemorni yangilashda xatolik',
      error: error.message
    });
  }
};

// @desc    Bemorni soft delete qilish
// @route   DELETE /api/patients/:id
// @access  Private
exports.deletePatient = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Bemor topilmadi'
      });
    }

    await patient.softDelete(req.user._id);

    res.status(200).json({
      success: true,
      message: 'Bemor muvaffaqiyatli o\'chirildi'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Bemorni o\'chirishda xatolik',
      error: error.message
    });
  }
};

// @desc    Bemorni tiklash
// @route   PUT /api/patients/:id/restore
// @access  Admin
exports.restorePatient = async (req, res) => {
  try {
    const patient = await Patient.findOne({ _id: req.params.id, isDeleted: true });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'O\'chirilgan bemor topilmadi'
      });
    }

    await patient.restore();

    res.status(200).json({
      success: true,
      message: 'Bemor muvaffaqiyatli tiklandi',
      data: patient
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Bemorni tiklashda xatolik',
      error: error.message
    });
  }
};

// @desc    Bemorga aloqa bo'lgan shifokorni qo'shish
// @route   POST /api/patients/:id/doctors
// @access  Private
exports.addContactedDoctor = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Bemor topilmadi'
      });
    }

    patient.contactedDoctors.push(req.body);
    patient.updatedBy = req.user._id;
    await patient.save();

    res.status(200).json({
      success: true,
      message: 'Shifokor muvaffaqiyatli qo\'shildi',
      data: patient
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Shifokorni qo\'shishda xatolik',
      error: error.message
    });
  }
};

// @desc    Bemorga tahlil qo'shish
// @route   POST /api/patients/:id/lab-tests
// @access  Private
exports.addLabTest = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Bemor topilmadi'
      });
    }

    patient.labTests.push(req.body);
    patient.updatedBy = req.user._id;
    await patient.save();

    res.status(200).json({
      success: true,
      message: 'Tahlil muvaffaqiyatli qo\'shildi',
      data: patient
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Tahlil qo\'shishda xatolik',
      error: error.message
    });
  }
};

// @desc    Bemorga kontakt qo'shish
// @route   POST /api/patients/:id/contacts
// @access  Private
exports.addContact = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Bemor topilmadi'
      });
    }

    patient.contacts.push(req.body);
    patient.updatedBy = req.user._id;
    await patient.save();

    res.status(200).json({
      success: true,
      message: 'Kontakt muvaffaqiyatli qo\'shildi',
      data: patient
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Kontakt qo\'shishda xatolik',
      error: error.message
    });
  }
};

// @desc    Statistika olish
// @route   GET /api/patients/stats
// @access  Private
exports.getStats = async (req, res) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Faol holatlar (tasdiqlangan va davolanmoqda)
    const activeCases = await Patient.countDocuments({
      status: { $in: ['tasdiqlangan', 'davolanmoqda'] }
    });

    // Bugungi yangi holatlar
    const newCasesToday = await Patient.countDocuments({
      createdAt: { $gte: today }
    });

    // Oxirgi 7 kun
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);
    const newCasesWeek = await Patient.countDocuments({
      createdAt: { $gte: last7Days }
    });

    // Oxirgi 30 kun
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);
    const newCasesMonth = await Patient.countDocuments({
      createdAt: { $gte: last30Days }
    });

    // Kuzatuv ostidagi kontaktlar
    const contactsUnderObservation = await Patient.aggregate([
      { $unwind: { path: '$contacts', preserveNullAndEmptyArrays: false } },
      { $match: { 'contacts.status': 'kuzatuv ostida' } },
      { $count: 'total' }
    ]);

    // Sog'ayganlar
    const recovered = await Patient.countDocuments({ status: 'tuzalgan' });

    // Faol o'choqlar (Investigation modelidan)
    const Investigation = require('../models/Investigation');
    const activeOutbreaks = await Investigation.countDocuments({
      status: { $in: ['yangi', 'jarayonda'] }
    });

    // Kasalliklar bo'yicha statistika
    const diseaseStats = await Patient.aggregate([
      { $group: { _id: '$diagnosis', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Frontend uchun topDiseases formatini yaratish
    const topDiseases = diseaseStats.map(stat => ({
      _id: stat._id,
      name: stat._id,
      count: stat.count
    }));

    // Yosh guruhlari bo'yicha
    const ageStats = await Patient.aggregate([
      {
        $bucket: {
          groupBy: '$age',
          boundaries: [0, 18, 35, 50, 65, 100],
          default: 'boshqa',
          output: { count: { $sum: 1 } }
        }
      }
    ]);

    // Jami bemorlar
    const totalPatients = await Patient.countDocuments();

    res.status(200).json({
      success: true,
      data: {
        activeCases,
        newCasesToday,
        newCasesWeek,
        newCasesMonth,
        contactsUnderObservation: contactsUnderObservation.length > 0 ? contactsUnderObservation[0].total : 0,
        recovered,
        activeOutbreaks,
        topDiseases,
        totalPatients,
        ageStats
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Statistikani olishda xatolik',
      error: error.message
    });
  }
};
