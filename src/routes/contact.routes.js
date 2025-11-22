const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contact.controller');
const { protect, authorize } = require('../middlewares/auth');

/**
 * Contact Routes
 * Vrach yordamchisi uchun - Kontaktlarni tekshirish
 */

// Barcha route'lar authenticate va vrach_yordamchisi yoki admin bo'lishi kerak
router.use(protect);
router.use(authorize('vrach_yordamchisi', 'admin'));

// @route   GET /api/contacts/forma60-list
// @desc    Kontaktlari bor Forma60 larni olish
router.get('/forma60-list', contactController.getForma60WithContacts);

// @route   GET /api/contacts/forma60/:id/contacts
// @desc    Bitta Forma60 ning kontaktlarini olish
router.get('/forma60/:id/contacts', contactController.getForma60Contacts);

// @route   PUT /api/contacts/forma60/:id/contact/:contactId/status
// @desc    Kontakt holatini yangilash
router.put('/forma60/:id/contact/:contactId/status', contactController.updateContactStatus);

// @route   PUT /api/contacts/forma60/:id/contacts/bulk-update
// @desc    Ko'p kontaktlarning holatini bir vaqtda yangilash
router.put('/forma60/:id/contacts/bulk-update', contactController.bulkUpdateContactStatus);

// @route   GET /api/contacts/stats
// @desc    Statistika - Vrach yordamchisi uchun dashboard
router.get('/stats', contactController.getContactsStatistics);

module.exports = router;
