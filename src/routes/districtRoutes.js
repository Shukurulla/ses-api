const express = require('express');
const router = express.Router();
const {
  getDistricts,
  getDistrict,
  createDistrict
} = require('../controllers/districtController');
const { protect, authorize } = require('../middlewares/auth');

// Public routes
router.get('/', getDistricts);
router.get('/:id', getDistrict);

// Protected routes
router.post('/', protect, authorize('admin'), createDistrict);

module.exports = router;
