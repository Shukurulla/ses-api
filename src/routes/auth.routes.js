const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getUserStats,
  getKartaFillers
} = require('../controllers/auth.controller');

const { protect, isAdmin } = require('../middlewares/auth');

/**
 * Auth Routes
 * Login, Register, User Management
 */

// Public routes
router.post('/login', login);

// Admin only - User registration
router.post('/register', protect, isAdmin, register);

// Protected routes
router.get('/me', protect, getMe);
router.put('/update-profile', protect, updateProfile);
router.put('/change-password', protect, changePassword);

// Karta fillers - forma60 filler ham admin ham ko'rishi mumkin
router.get('/karta-fillers', protect, getKartaFillers);

// Admin only routes - User management
router.get('/users', protect, isAdmin, getAllUsers);
router.get('/users/:id', protect, isAdmin, getUserById);
router.put('/users/:id', protect, isAdmin, updateUser);
router.delete('/users/:id', protect, isAdmin, deleteUser);
router.get('/stats', protect, isAdmin, getUserStats);

module.exports = router;
