const District = require('../models/District');

// @desc    Barcha mahallalarni olish
// @route   GET /api/districts
// @access  Public
exports.getDistricts = async (req, res) => {
  try {
    const districts = await District.find().sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: districts.length,
      data: districts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Mahallalarni olishda xatolik',
      error: error.message
    });
  }
};

// @desc    Bitta mahallani olish
// @route   GET /api/districts/:id
// @access  Public
exports.getDistrict = async (req, res) => {
  try {
    const district = await District.findById(req.params.id);

    if (!district) {
      return res.status(404).json({
        success: false,
        message: 'Mahalla topilmadi'
      });
    }

    res.status(200).json({
      success: true,
      data: district
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Mahallani olishda xatolik',
      error: error.message
    });
  }
};

// @desc    Yangi mahalla qo'shish
// @route   POST /api/districts
// @access  Admin
exports.createDistrict = async (req, res) => {
  try {
    const district = await District.create(req.body);

    res.status(201).json({
      success: true,
      message: 'Mahalla muvaffaqiyatli qo\'shildi',
      data: district
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Mahallani qo\'shishda xatolik',
      error: error.message
    });
  }
};
