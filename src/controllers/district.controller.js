const District = require('../models/District');

/**
 * District Controller
 * Tumanlar bilan ishlash
 */

// @desc    Barcha tumanlarni olish
// @route   GET /api/districts
// @access  Public
exports.getAllDistricts = async (req, res) => {
  try {
    const { region } = req.query;

    const filter = {};
    if (region) {
      filter.region = region;
    }

    const districts = await District.find(filter).sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: districts.length,
      data: districts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server xatosi',
      error: error.message
    });
  }
};

// @desc    Bitta tumanni olish
// @route   GET /api/districts/:id
// @access  Public
exports.getDistrictById = async (req, res) => {
  try {
    const district = await District.findById(req.params.id);

    if (!district) {
      return res.status(404).json({
        success: false,
        message: 'Tuman topilmadi'
      });
    }

    res.status(200).json({
      success: true,
      data: district
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server xatosi',
      error: error.message
    });
  }
};

// @desc    Yangi tuman yaratish
// @route   POST /api/districts
// @access  Private (Admin)
exports.createDistrict = async (req, res) => {
  try {
    const district = await District.create(req.body);

    res.status(201).json({
      success: true,
      message: 'Tuman muvaffaqiyatli yaratildi',
      data: district
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Tuman yaratishda xatolik',
      error: error.message
    });
  }
};

// @desc    Tumanni yangilash
// @route   PUT /api/districts/:id
// @access  Private (Admin)
exports.updateDistrict = async (req, res) => {
  try {
    const district = await District.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!district) {
      return res.status(404).json({
        success: false,
        message: 'Tuman topilmadi'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Tuman muvaffaqiyatli yangilandi',
      data: district
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Tumanni yangilashda xatolik',
      error: error.message
    });
  }
};

// @desc    Tumanni o'chirish
// @route   DELETE /api/districts/:id
// @access  Private (Admin)
exports.deleteDistrict = async (req, res) => {
  try {
    const district = await District.findByIdAndDelete(req.params.id);

    if (!district) {
      return res.status(404).json({
        success: false,
        message: 'Tuman topilmadi'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Tuman muvaffaqiyatli o\'chirildi'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Tumanni o\'chirishda xatolik',
      error: error.message
    });
  }
};

// @desc    Tumanlarga oid statistika
// @route   GET /api/districts/stats
// @access  Private
exports.getDistrictStats = async (req, res) => {
  try {
    const Forma60 = require('../models/Forma60');
    const Disinfection = require('../models/Disinfection');

    const stats = await District.find().lean();

    // Har bir tuman uchun statistika qo'shish
    for (let district of stats) {
      district.forma60Count = await Forma60.countDocuments({ district: district._id });
      district.disinfectionCount = await Disinfection.countDocuments({ 'workplace.district': district._id });
      district.completedDisinfections = await Disinfection.countDocuments({
        'workplace.district': district._id,
        status: 'qilindi'
      });
    }

    res.status(200).json({
      success: true,
      data: stats
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
