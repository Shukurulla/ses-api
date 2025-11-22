const express = require('express');
const router = express.Router();
const nukusLocationController = require('../controllers/nukusLocation.controller');
const { authenticate } = require('../middlewares/auth');

// Qidirish - autentifikatsiya talab qilmaydi (public)
router.get('/search', nukusLocationController.searchLocations);

// Yaqin atrofdagi locationlar - autentifikatsiya talab qilmaydi (public)
router.get('/nearby/search', nukusLocationController.findNearby);

// Qolgan route'lar autentifikatsiya talab qiladi
router.use(authenticate);

// ID bo'yicha olish
router.get('/:id', nukusLocationController.getLocationById);

// Statistika
router.get('/stats/all', nukusLocationController.getStatistics);

module.exports = router;
