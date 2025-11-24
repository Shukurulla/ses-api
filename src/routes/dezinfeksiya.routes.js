const express = require('express');
const router = express.Router();
const {
  getAllDisinfections,
  getAllDisinfectionsForMap,
  getDisinfectionById,
  createDisinfection,
  assignToDezinfektor,
  acceptDisinfection,
  rejectDisinfection,
  startDisinfection,
  uploadBeforePhotos,
  uploadAfterPhotos,
  uploadWebCameraPhoto,
  completeDisinfection,
  cancelDisinfection,
  getDisinfectionHistory,
  getDisinfectionsForMap,
  getMyDisinfections,
  getDisinfectionStats,
  deleteDisinfection
} = require('../controllers/dezinfeksiya.controller');

const {
  protect,
  authorize,
  isAdmin,
  isDezinfektor
} = require('../middlewares/auth');

const {
  uploadBeforeImages,
  uploadAfterImages,
  uploadWebCamera
} = require('../middlewares/upload');

/**
 * Dezinfeksiya Routes
 * Roles.tz talablariga muvofiq: Mobile-friendly, location-aware, camera integration
 */

// Public routes (require authentication only)
router.use(protect);

// Statistics (Admin, Dezinfektor)
router.get('/stats', authorize('admin', 'dezinfektor'), getDisinfectionStats);

// Get ALL disinfections for MAP (Admin - NO LIMIT)
router.get('/all', authorize('admin'), getAllDisinfectionsForMap);

// Get disinfections for map view (Dezinfektor - mobile)
router.get('/map', isDezinfektor, getDisinfectionsForMap);

// My disinfections (Dezinfektor)
router.get('/my-disinfections', isDezinfektor, getMyDisinfections);

// Get all disinfections (Admin - WITH PAGINATION)
router.get('/', authorize('admin', 'dezinfektor'), getAllDisinfections);

// Create disinfection (Admin, Forma60 filler)
router.post('/', authorize('admin', 'forma60_filler'), createDisinfection);

// Assign to dezinfektor (Admin) - MUST be before /:id routes
router.post('/:id/assign', authorize('admin'), assignToDezinfektor);

// Get single disinfection
router.get('/:id', getDisinfectionById);

// Accept disinfection (Dezinfektor)
router.post('/:id/accept', isDezinfektor, acceptDisinfection);

// Reject disinfection (Dezinfektor)
router.post('/:id/reject', isDezinfektor, rejectDisinfection);

// Start disinfection (Dezinfektor - with location verification)
router.post('/:id/start', isDezinfektor, startDisinfection);

// Upload before photos (Dezinfektor - multiple images)
router.post('/:id/upload-before', isDezinfektor, uploadBeforeImages, uploadBeforePhotos);

// Upload after photos (Dezinfektor - multiple images)
router.post('/:id/upload-after', isDezinfektor, uploadAfterImages, uploadAfterPhotos);

// Upload web camera photo (Dezinfektor - single temp image)
router.post('/:id/camera-upload', isDezinfektor, uploadWebCamera, uploadWebCameraPhoto);

// Complete disinfection (Dezinfektor)
router.post('/:id/complete', isDezinfektor, completeDisinfection);

// Cancel disinfection (Dezinfektor, Admin)
router.post('/:id/cancel', authorize('admin', 'dezinfektor'), cancelDisinfection);

// Get history
router.get('/:id/history', getDisinfectionHistory);

// Delete (soft delete, Admin only)
router.delete('/:id', isAdmin, deleteDisinfection);

module.exports = router;
