const express = require('express');
const router = express.Router();
const {
  getClinics,
  getPolyclinics,
  createClinic,
  updateClinic,
  exportPolyclinicsStats,
  getPolyclinicsStats
} = require('../controllers/clinicController');
const { protect, authorize } = require('../middlewares/auth');

// Public routes
router.get('/', getClinics);
router.get('/polyclinics', getPolyclinics);

// Protected routes
router.use(protect);

// Poliklinika statistikasi
router.get('/polyclinics/stats', getPolyclinicsStats);
router.get('/polyclinics/export', exportPolyclinicsStats);

// Admin routes
router.post('/', authorize('admin'), createClinic);
router.put('/:id', authorize('admin'), updateClinic);

module.exports = router;
