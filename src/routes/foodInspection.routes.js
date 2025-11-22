const express = require('express');
const router = express.Router();
const foodInspectionController = require('../controllers/foodInspection.controller');
const { protect, authorize } = require('../middlewares/auth');

/**
 * Food Inspection Routes
 * Oziq-ovqat tekshiruvchi uchun - Oziq-ovqat mahsulotlarini tekshirish
 */

// Barcha route'lar authenticate va oziq_ovqat_tekshiruvchi yoki admin bo'lishi kerak
router.use(protect);
router.use(authorize('oziq_ovqat_tekshiruvchi', 'admin'));

// @route   GET /api/food-inspection/forma60-list
// @desc    Oziq-ovqat tekshiruvi kerak bo'lgan Forma60 larni olish
router.get('/forma60-list', foodInspectionController.getForma60ForFoodInspection);

// @route   GET /api/food-inspection/forma60/:id
// @desc    Bitta Forma60 ning oziq-ovqat tekshiruvi ma'lumotlarini olish
router.get('/forma60/:id', foodInspectionController.getForma60FoodInspection);

// @route   PUT /api/food-inspection/forma60/:id/inspection
// @desc    Oziq-ovqat tekshiruvi natijalarini yangilash
router.put('/forma60/:id/inspection', foodInspectionController.updateFoodInspection);

// @route   GET /api/food-inspection/stats
// @desc    Statistika - Oziq-ovqat tekshiruvchi uchun dashboard
router.get('/stats', foodInspectionController.getFoodInspectionStatistics);

module.exports = router;
