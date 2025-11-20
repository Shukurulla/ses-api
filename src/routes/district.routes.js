const express = require('express');
const router = express.Router();
const {
  getAllDistricts,
  getDistrictById,
  createDistrict,
  updateDistrict,
  deleteDistrict,
  getDistrictStats
} = require('../controllers/district.controller');

const { protect, isAdmin } = require('../middlewares/auth');

/**
 * District Routes
 * Tumanlar bilan ishlash
 */

// Public routes
router.get('/', getAllDistricts);
router.get('/stats', protect, getDistrictStats);
router.get('/:id', getDistrictById);

// Admin only routes
router.post('/', protect, isAdmin, createDistrict);
router.put('/:id', protect, isAdmin, updateDistrict);
router.delete('/:id', protect, isAdmin, deleteDistrict);

module.exports = router;
