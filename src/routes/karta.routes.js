const express = require('express');
const router = express.Router();
const {
  getAllKartas,
  getKartaById,
  createKarta,
  previewPDFData,
  updateKartaData,
  verifyKarta,
  completeKarta,
  deleteKarta,
  getKartaHistory,
  downloadPDF,
  getValidationWarnings,
  getKartasByForma60,
  getMyAssignedKartas,
  getKartaStats
} = require('../controllers/karta.controller');

const {
  protect,
  authorize,
  isAdmin,
  isKartaFiller
} = require('../middlewares/auth');

const { uploadPDF } = require('../middlewares/upload');

/**
 * Karta Routes
 * Roles.tz talablariga muvofiq: PDF upload, parsing, verification
 */

// Public routes (require authentication only)
router.use(protect);

// Statistics (Admin, Karta filler)
router.get('/stats', authorize('admin', 'karta_filler'), getKartaStats);

// My assigned Kartas (Karta filler)
router.get('/assigned-to-me', isKartaFiller, getMyAssignedKartas);

// Get all Kartas (All authenticated users can view)
router.get('/', getAllKartas);

// Get Kartas by Forma60 ID
router.get('/forma60/:forma60Id', getKartasByForma60);

// Create Karta with PDF upload (Karta filler only)
router.post('/', isKartaFiller, uploadPDF, createKarta);

// Create Karta from Forma60 with PDF upload (Karta filler only)
// IMPORTANT: This route must come BEFORE /:id to avoid matching conflicts
router.post('/from-forma60/:forma60Id', isKartaFiller, uploadPDF, createKarta);

// Get single Karta
router.get('/:id', getKartaById);

// Update Karta data manually (Karta filler)
router.put('/:id', isKartaFiller, updateKartaData);

// Verify Karta (Karta filler)
router.post('/:id/verify', isKartaFiller, verifyKarta);

// Complete Karta (Karta filler)
router.post('/:id/complete', isKartaFiller, completeKarta);

// Get validation warnings
router.get('/:id/validation-warnings', getValidationWarnings);

// Download original PDF
router.get('/:id/download-pdf', downloadPDF);

// Get history
router.get('/:id/history', getKartaHistory);

// Delete (soft delete, Admin only)
router.delete('/:id', isAdmin, deleteKarta);

module.exports = router;
