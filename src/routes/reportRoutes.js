const express = require('express');
const router = express.Router();
const {
  getReports,
  getReport,
  createReport,
  updateReport,
  deleteReport,
  getReportStats
} = require('../controllers/reportController');
const { protect } = require('../middlewares/auth');

// All routes require authentication
router.use(protect);

// Stats route - must be before /:id route
router.get('/stats/summary', getReportStats);

// CRUD routes
router.route('/')
  .get(getReports)
  .post(createReport);

router.route('/:id')
  .get(getReport)
  .put(updateReport)
  .delete(deleteReport);

module.exports = router;
