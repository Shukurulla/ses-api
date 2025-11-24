const express = require('express');
const router = express.Router();
const reportsController = require('../controllers/reportsNew.controller');
const { protect } = require('../middlewares/auth');

// Barcha routelar autentifikatsiya talab qiladi
router.use(protect);

// Statistika
router.get('/stats', reportsController.getStats);

// Mavjud yillar
router.get('/available-years', reportsController.getAvailableYears);

// Jadval statistikalari
router.get('/table-stats/:reportType/:tableName/:year', reportsController.getTableStats);

// Excel hisobotlarini export qilish (year parameter bilan)
router.get('/salmonellyoz/:year', reportsController.exportSalmonellyoz);
router.get('/ich-burug/:year', reportsController.exportIchBurug);
router.get('/oyuik/:year', reportsController.exportOYuIK);

module.exports = router;
