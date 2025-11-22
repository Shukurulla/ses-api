const express = require('express');
const router = express.Router();
const statsController = require('../controllers/stats.controller');
const { protect } = require('../middlewares/auth');

/**
 * Stats Routes
 * Dashboard va statistika
 */

// Barcha route'lar authenticate bo'lishi kerak
router.use(protect);

// @route   GET /api/stats/dashboard
// @desc    Dashboard statistikasi
router.get('/dashboard', statsController.getDashboardStats);

// @route   GET /api/stats/monthly-trends
// @desc    Oylik tendensiyalar
router.get('/monthly-trends', statsController.getMonthlyTrends);

// @route   GET /api/stats/activity-log
// @desc    Faoliyat logi
router.get('/activity-log', statsController.getActivityLog);

// @route   GET /api/stats/age-groups
// @desc    Yosh guruhlari statistikasi
router.get('/age-groups', statsController.getAgeGroupStats);

// @route   GET /api/stats/users-by-role
// @desc    Foydalanuvchilar rollar bo'yicha
router.get('/users-by-role', statsController.getUsersByRole);

// @route   GET /api/stats/forma60-by-diagnosis
// @desc    Forma60 diagnozlar bo'yicha
router.get('/forma60-by-diagnosis', statsController.getForma60ByDiagnosis);

// @route   GET /api/stats/disinfections-by-status
// @desc    Dezinfeksiya holatlari
router.get('/disinfections-by-status', statsController.getDisinfectionsByStatus);

// @route   GET /api/stats/districts
// @desc    Tumanlar bo'yicha
router.get('/districts', statsController.getDistrictStats);

// @route   GET /api/stats/performance
// @desc    Performance metrics
router.get('/performance', statsController.getPerformanceMetrics);

module.exports = router;
