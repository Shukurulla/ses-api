const express = require('express');
const router = express.Router();
const {
  upload,
  uploadAndParsePDF,
  getAllParsedData,
  getParsedDataById,
  updateParsedData,
  deleteParsedData,
  linkToForma60,
  getStats,
  getUnlinkedData
} = require('../controllers/parsedData.controller');
const { protect, authorize } = require('../middlewares/auth');

// Barcha routelar authentication talab qiladi
router.use(protect);

/**
 * @route   GET /api/parsed-data/stats
 * @desc    Statistika olish
 * @access  Private
 */
router.get('/stats', getStats);

/**
 * @route   GET /api/parsed-data/unlinked
 * @desc    Bog'lanmagan ma'lumotlarni olish
 * @access  Private
 */
router.get('/unlinked', getUnlinkedData);

/**
 * @route   POST /api/parsed-data/upload
 * @desc    PDF faylni yuklash va parse qilish
 * @access  Private
 */
router.post('/upload', upload.single('pdf'), uploadAndParsePDF);

/**
 * @route   GET /api/parsed-data
 * @desc    Barcha parse qilingan ma'lumotlarni olish
 * @access  Private
 */
router.get('/', getAllParsedData);

/**
 * @route   GET /api/parsed-data/:id
 * @desc    Bitta parse qilingan ma'lumotni olish
 * @access  Private
 */
router.get('/:id', getParsedDataById);

/**
 * @route   PUT /api/parsed-data/:id
 * @desc    Parse qilingan ma'lumotni yangilash
 * @access  Private
 */
router.put('/:id', updateParsedData);

/**
 * @route   DELETE /api/parsed-data/:id
 * @desc    Parse qilingan ma'lumotni o'chirish
 * @access  Private (Admin only)
 */
router.delete('/:id', authorize('admin', 'moderator'), deleteParsedData);

/**
 * @route   POST /api/parsed-data/:id/link-forma60
 * @desc    Forma60 bilan bog'lash
 * @access  Private
 */
router.post('/:id/link-forma60', linkToForma60);

module.exports = router;
