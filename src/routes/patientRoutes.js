const express = require('express');
const router = express.Router();
const {
  getPatients,
  getPatient,
  createPatient,
  updatePatient,
  deletePatient,
  restorePatient,
  addContactedDoctor,
  addLabTest,
  addContact,
  getStats
} = require('../controllers/patientController');
const { protect, authorize } = require('../middlewares/auth');

// Barcha routelar protected
router.use(protect);

// Statistika
router.get('/stats', getStats);

// CRUD operatsiyalar
router.route('/')
  .get(getPatients)
  .post(authorize('admin', 'epidemiolog', 'shifokor'), createPatient);

router.route('/:id')
  .get(getPatient)
  .put(authorize('admin', 'epidemiolog', 'shifokor'), updatePatient)
  .delete(authorize('admin', 'epidemiolog'), deletePatient);

// Tiklash (faqat admin)
router.put('/:id/restore', authorize('admin'), restorePatient);

// Qo'shimcha operatsiyalar
router.post('/:id/doctors', authorize('admin', 'epidemiolog', 'shifokor'), addContactedDoctor);
router.post('/:id/lab-tests', authorize('admin', 'epidemiolog', 'laborant'), addLabTest);
router.post('/:id/contacts', authorize('admin', 'epidemiolog'), addContact);

module.exports = router;
