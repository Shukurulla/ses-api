const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller');
const { protect, authorize } = require('../middlewares/auth');

/**
 * Report Routes
 * Excel hisobotlar generatsiya qilish
 */

// Barcha route'lar authenticate va admin bo'lishi kerak
router.use(protect);
router.use(authorize('admin'));

// @route   GET /api/reports/salmonellyoz/:year
// @desc    Salmonellyoz hisobotini yaratish
router.get('/salmonellyoz/:year', reportController.generateSalmonellyozReport);

// @route   GET /api/reports/ich-burug/:year
// @desc    Ich burug' hisobotini yaratish
router.get('/ich-burug/:year', reportController.generateIchBurugReport);

// @route   GET /api/reports/oyuik/:year
// @desc    O'YuIK hisobotini yaratish
router.get('/oyuik/:year', reportController.generateOYuIKReport);

// @route   GET /api/reports/available-years
// @desc    Mavjud yillar ro'yxatini olish
router.get('/available-years', reportController.getAvailableYears);

// @route   GET /api/reports/stats
// @desc    Hisobot statistikasi
router.get('/stats', reportController.getReportStats);

module.exports = router;
