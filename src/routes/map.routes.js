const express = require('express');
const router = express.Router();
const mapController = require('../controllers/map.controller');
const { protect } = require('../middlewares/auth');

/**
 * Map Routes
 * Xarita funksiyalari
 */

// Barcha route'lar authenticate bo'lishi kerak
router.use(protect);

// @route   GET /api/map/diseases
// @desc    Kasalliklar xaritasi
router.get('/diseases', mapController.getDiseasesMap);

// @route   GET /api/map/food-inspection
// @desc    Oziq-ovqat tekshiruvlari xaritasi
router.get('/food-inspection', mapController.getFoodInspectionMap);

// @route   GET /api/map/nearby
// @desc    Yaqin atrofdagi holatlar
router.get('/nearby', mapController.getNearbyCases);

// @route   GET /api/map/heatmap
// @desc    Heatmap ma'lumotlari
router.get('/heatmap', mapController.getHeatmapData);

// @route   GET /api/map/stats
// @desc    Xarita statistikasi
router.get('/stats', mapController.getMapStats);

module.exports = router;
