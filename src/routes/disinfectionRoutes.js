const express = require('express');
const {
  getDisinfections,
  getDisinfection,
  createDisinfection,
  updateDisinfection,
  deleteDisinfection,
  getDisinfectionStats
} = require('../controllers/disinfectionController');

const router = express.Router();

const { protect } = require('../middlewares/auth');

router.use(protect);

router.get('/stats/summary', getDisinfectionStats);

router
  .route('/')
  .get(getDisinfections)
  .post(createDisinfection);

router
  .route('/:id')
  .get(getDisinfection)
  .put(updateDisinfection)
  .delete(deleteDisinfection);

module.exports = router;
