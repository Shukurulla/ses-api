const express = require('express');
const router = express.Router();
const {
  getAllForma60,
  getForma60ById,
  createForma60,
  updateForma60,
  deleteForma60,
  restoreForma60,
  getForma60History,
  restoreToVersion,
  undoForma60,
  redoForma60,
  assignToCardFiller,
  getAssignedForma60s,
  getForma60Stats
} = require('../controllers/forma60.controller');

const {
  protect,
  authorize,
  isAdmin,
  isForma60Filler,
  canModify
} = require('../middlewares/auth');

/**
 * Forma60 Routes
 * Roles.tz talablariga muvofiq
 */

// Public routes (require authentication only)
router.use(protect);

// Statistics (Admin, Forma60 filler)
router.get('/stats', authorize('admin', 'forma60_filler'), getForma60Stats);

// Assigned Forma60s (for Karta fillers)
router.get('/assigned-to-me', authorize('karta_filler'), getAssignedForma60s);

// Get all Forma60s (Admin, Forma60 filler)
router.get('/', authorize('admin', 'forma60_filler'), getAllForma60);

// Get single Forma60
router.get('/:id', getForma60ById);

// Create Forma60 (Forma60 filler only)
router.post('/', isForma60Filler, createForma60);

// Update Forma60 (Owner or Admin)
router.put('/:id', updateForma60);

// Assign to Card Filler (Forma60 filler or Admin)
router.post('/:id/assign', authorize('admin', 'forma60_filler'), assignToCardFiller);

// Get history
router.get('/:id/history', getForma60History);

// Restore to version
router.post('/:id/restore-version', restoreToVersion);

// Undo
router.post('/:id/undo', undoForma60);

// Redo
router.post('/:id/redo', redoForma60);

// Delete (soft delete, Admin only)
router.delete('/:id', isAdmin, deleteForma60);

// Restore (Admin only)
router.post('/:id/restore', isAdmin, restoreForma60);

module.exports = router;
