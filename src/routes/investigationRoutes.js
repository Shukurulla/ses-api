const express = require('express');
const {
  getInvestigations,
  getInvestigation,
  createInvestigation,
  updateInvestigation,
  deleteInvestigation,
  getInvestigationStats
} = require('../controllers/investigationController');

const router = express.Router();

const { protect } = require('../middlewares/auth');

router.use(protect);

router.get('/stats/summary', getInvestigationStats);

router
  .route('/')
  .get(getInvestigations)
  .post(createInvestigation);

router
  .route('/:id')
  .get(getInvestigation)
  .put(updateInvestigation)
  .delete(deleteInvestigation);

module.exports = router;
