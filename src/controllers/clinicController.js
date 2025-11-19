const Clinic = require('../models/Clinic');
const XLSX = require('xlsx');
const Patient = require('../models/Patient');

// @desc    Barcha klinikalarni olish
// @route   GET /api/clinics
// @access  Public
exports.getClinics = async (req, res) => {
  try {
    const { institutionType, search } = req.query;
    const query = {};

    // Agar institutionType berilgan bo'lsa
    if (institutionType) {
      query.institutionType = institutionType;
    }

    // Qidiruv
    if (search) {
      query.$or = [
        { institutionName: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } }
      ];
    }

    const clinics = await Clinic.find(query).sort({ institutionName: 1 });

    res.status(200).json({
      success: true,
      count: clinics.length,
      data: clinics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Klinikalarni olishda xatolik',
      error: error.message
    });
  }
};

// @desc    Faqat poliklinikalarni olish
// @route   GET /api/clinics/polyclinics
// @access  Public
exports.getPolyclinics = async (req, res) => {
  try {
    const polyclinics = await Clinic.find({ institutionType: 'Поликлиника' })
      .sort({ institutionName: 1 });

    res.status(200).json({
      success: true,
      count: polyclinics.length,
      data: polyclinics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Poliklinikalarni olishda xatolik',
      error: error.message
    });
  }
};

// @desc    Klinika qo'shish
// @route   POST /api/clinics
// @access  Admin
exports.createClinic = async (req, res) => {
  try {
    const clinic = await Clinic.create(req.body);

    res.status(201).json({
      success: true,
      message: 'Klinika muvaffaqiyatli qo\'shildi',
      data: clinic
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Klinikani qo\'shishda xatolik',
      error: error.message
    });
  }
};

// @desc    Klinikani yangilash
// @route   PUT /api/clinics/:id
// @access  Admin
exports.updateClinic = async (req, res) => {
  try {
    const clinic = await Clinic.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!clinic) {
      return res.status(404).json({
        success: false,
        message: 'Klinika topilmadi'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Klinika muvaffaqiyatli yangilandi',
      data: clinic
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Klinikani yangilashda xatolik',
      error: error.message
    });
  }
};

// @desc    9-talabga javob: Poliklinikalar statistikasini Excel formatda yuklab berish
// @route   GET /api/clinics/polyclinics/export
// @access  Private
exports.exportPolyclinicsStats = async (req, res) => {
  try {
    // Poliklinikalarni olish
    const polyclinics = await Clinic.find({ institutionType: 'Поликлиника' });

    // Har bir poliklinika uchun bemor sonini hisoblash
    const statsPromises = polyclinics.map(async (clinic) => {
      const patientCount = await Patient.countDocuments({
        referralClinic: clinic.institutionName
      });

      return {
        'Поликлиника номи': clinic.institutionName,
        'Манзил': clinic.address,
        'Телефон': clinic.phone || '',
        'Беморлар сони': patientCount,
        'Охирги янгиланиш': clinic.updatedAt ? new Date(clinic.updatedAt).toLocaleDateString('uz-UZ') : ''
      };
    });

    const stats = await Promise.all(statsPromises);

    // Jami statistika qo'shish
    const totalPatients = stats.reduce((sum, item) => sum + item['Беморлар сони'], 0);
    stats.push({
      'Поликлиника номи': 'ЖАМИ',
      'Манзил': '',
      'Телефон': '',
      'Беморлар сони': totalPatients,
      'Охирги янгиланиш': ''
    });

    // Excel yaratish
    const worksheet = XLSX.utils.json_to_sheet(stats);

    // Ustunlar kengligini sozlash
    worksheet['!cols'] = [
      { wch: 50 }, // Поликлиника номи
      { wch: 40 }, // Манзил
      { wch: 15 }, // Телефон
      { wch: 15 }, // Беморлар сони
      { wch: 20 }  // Охирги янгиланиш
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Поликлиникалар статистикаси');

    // Excel faylni buffer ga aylantiramiz
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Response headerlarini sozlash
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=polyclinics-stats-${Date.now()}.xlsx`);

    res.send(excelBuffer);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Excel eksport qilishda xatolik',
      error: error.message
    });
  }
};

// @desc    Poliklinikalar statistikasini ko'rish
// @route   GET /api/clinics/polyclinics/stats
// @access  Private
exports.getPolyclinicsStats = async (req, res) => {
  try {
    const polyclinics = await Clinic.find({ institutionType: 'Поликлиника' });

    const statsPromises = polyclinics.map(async (clinic) => {
      const patientCount = await Patient.countDocuments({
        referralClinic: clinic.institutionName
      });

      return {
        _id: clinic._id,
        name: clinic.institutionName,
        address: clinic.address,
        phone: clinic.phone,
        patientCount,
        coordinates: clinic.coordinates
      };
    });

    const stats = await Promise.all(statsPromises);

    // Eng ko'p bemor bo'lgan poliklinikalar
    const topClinics = [...stats].sort((a, b) => b.patientCount - a.patientCount).slice(0, 10);

    res.status(200).json({
      success: true,
      data: {
        all: stats,
        top: topClinics,
        total: stats.reduce((sum, item) => sum + item.patientCount, 0)
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
