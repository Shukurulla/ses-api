const express = require('express');
const router = express.Router();
const {
  getAllKartas,
  getKartaById,
  createKarta,
  updateKarta,
  deleteKarta,
  restoreKarta,
  getKartaHistory,
  getKartaByForma60,
  getAssignedKartas,
  getKartaStats,
  restoreKartaToVersion
} = require('../controllers/karta.controller');

const {
  protect,
  authorize,
  isAdmin,
  isKartaFiller
} = require('../middlewares/auth');

/**
 * Karta Routes - TO'LIQ QO'LDA TO'LDIRISH TIZIMI
 * PDF upload routes olib tashlandi
 */

// Barcha routelar authentication talab qiladi
router.use(protect);

// Statistika (Admin, Karta filler)
router.get('/stats', authorize('admin', 'karta_filler', 'forma60_filler'), getKartaStats);

// Menga biriktirilgan Kartalar (Karta filler)
router.get('/assigned-to-me', isKartaFiller, getAssignedKartas);

// Forma60 bo'yicha Karta olish
router.get('/forma60/:forma60Id', getKartaByForma60);

// Barcha Kartalarni olish (pagination bilan)
router.get('/', getAllKartas);

// Bitta Kartani olish
router.get('/:id', getKartaById);

// Karta yaratish (qo'lda to'ldirish)
// IMPORTANT: Bu route /:id dan oldin bo'lishi kerak
router.post('/create/:forma60Id', isKartaFiller, createKarta);

// Kartani yangilash
router.put('/:id', isKartaFiller, updateKarta);

// Karta tarixini olish
router.get('/:id/history', getKartaHistory);

// Kartani o'chirish (soft delete, Admin only)
router.delete('/:id', isAdmin, deleteKarta);

// Kartani tiklash (Admin only)
router.post('/:id/restore', isAdmin, restoreKarta);

// Kartani versiyaga qaytarish (Karta filler, Admin)
router.post('/:id/restore/:historyIndex', isKartaFiller, restoreKartaToVersion);

module.exports = router;
