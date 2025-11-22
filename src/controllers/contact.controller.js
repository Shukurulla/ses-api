const Forma60 = require('../models/Forma60');

/**
 * Contact Controller
 * Vrach yordamchisi uchun - Kontaktlarni tekshirish
 */

// @desc    Kontaktlari bor Forma60 larni olish
// @route   GET /api/contacts/forma60-list
// @access  Private (Vrach yordamchisi)
exports.getForma60WithContacts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      search
    } = req.query;

    const filter = {
      $or: [
        { contactsStatus: { $exists: true, $not: { $size: 0 } } },
        { contactedPersons: { $exists: true, $not: { $size: 0 } } }
      ]
    };

    // Faqat pending holatdagi kontaktlar
    if (status === 'pending') {
      filter['contactsStatus.diseaseStatus'] = 'pending';
    }

    // Search bo'yicha
    if (search) {
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: [
          { fullName: { $regex: search, $options: 'i' } },
          { formNumber: { $regex: search, $options: 'i' } }
        ]
      });
    }

    const skip = (page - 1) * limit;

    const forma60s = await Forma60.find(filter)
      .select('formNumber fullName birthDate age primaryDiagnosis finalDiagnosis contactsStatus illnessDate')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Forma60.countDocuments(filter);

    // Har bir Forma60 uchun pending kontaktlar sonini hisoblash
    const forma60sWithStats = forma60s.map(f => {
      const obj = f.toObject();
      obj.contactsStats = {
        total: f.contactsStatus ? f.contactsStatus.length : 0,
        pending: f.contactsStatus ? f.contactsStatus.filter(c => c.diseaseStatus === 'pending').length : 0,
        diseaseFound: f.contactsStatus ? f.contactsStatus.filter(c => c.diseaseStatus === 'disease_found').length : 0,
        noDisease: f.contactsStatus ? f.contactsStatus.filter(c => c.diseaseStatus === 'no_disease').length : 0
      };
      return obj;
    });

    res.status(200).json({
      success: true,
      count: forma60sWithStats.length,
      total: total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: forma60sWithStats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server xatosi',
      error: error.message
    });
  }
};

// @desc    Bitta Forma60 ning kontaktlarini olish
// @route   GET /api/contacts/forma60/:id/contacts
// @access  Private (Vrach yordamchisi)
exports.getForma60Contacts = async (req, res) => {
  try {
    const forma60 = await Forma60.findById(req.params.id)
      .select('formNumber fullName birthDate age primaryDiagnosis finalDiagnosis contactsStatus illnessDate address')
      .populate('contactsStatus.checkedBy', 'fullName');

    if (!forma60) {
      return res.status(404).json({
        success: false,
        message: 'Forma60 topilmadi'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        forma60Info: {
          formNumber: forma60.formNumber,
          fullName: forma60.fullName,
          age: forma60.age,
          birthDate: forma60.birthDate,
          diagnosis: forma60.finalDiagnosis || forma60.primaryDiagnosis,
          illnessDate: forma60.illnessDate,
          address: forma60.address
        },
        contacts: forma60.contactsStatus || [],
        stats: {
          total: forma60.contactsStatus ? forma60.contactsStatus.length : 0,
          pending: forma60.contactsStatus ? forma60.contactsStatus.filter(c => c.diseaseStatus === 'pending').length : 0,
          diseaseFound: forma60.contactsStatus ? forma60.contactsStatus.filter(c => c.diseaseStatus === 'disease_found').length : 0,
          noDisease: forma60.contactsStatus ? forma60.contactsStatus.filter(c => c.diseaseStatus === 'no_disease').length : 0
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server xatosi',
      error: error.message
    });
  }
};

// @desc    Kontakt holatini yangilash
// @route   PUT /api/contacts/forma60/:id/contact/:contactId/status
// @access  Private (Vrach yordamchisi)
exports.updateContactStatus = async (req, res) => {
  try {
    const { diseaseStatus, notes } = req.body;

    // Validatsiya
    if (!['disease_found', 'no_disease'].includes(diseaseStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Noto\'g\'ri disease status. Faqat "disease_found" yoki "no_disease" bo\'lishi kerak'
      });
    }

    const forma60 = await Forma60.findById(req.params.id);

    if (!forma60) {
      return res.status(404).json({
        success: false,
        message: 'Forma60 topilmadi'
      });
    }

    // Kontaktni topish
    const contact = forma60.contactsStatus.id(req.params.contactId);

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Kontakt topilmadi'
      });
    }

    // Kontakt holatini yangilash
    contact.diseaseStatus = diseaseStatus;
    contact.checkedBy = req.user._id;
    contact.checkedAt = new Date();
    if (notes) contact.notes = notes;

    forma60.updatedBy = req.user._id;

    // History ga qo'shish
    forma60.editHistory.push({
      editedBy: req.user._id,
      editedAt: new Date(),
      changes: {
        contactStatus: {
          contactName: contact.name,
          oldStatus: 'pending',
          newStatus: diseaseStatus
        }
      },
      action: 'updated'
    });

    await forma60.save();

    await forma60.populate('contactsStatus.checkedBy', 'fullName');

    res.status(200).json({
      success: true,
      message: 'Kontakt holati muvaffaqiyatli yangilandi',
      data: {
        contact: forma60.contactsStatus.id(req.params.contactId)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server xatosi',
      error: error.message
    });
  }
};

// @desc    Ko'p kontaktlarning holatini bir vaqtda yangilash
// @route   PUT /api/contacts/forma60/:id/contacts/bulk-update
// @access  Private (Vrach yordamchisi)
exports.bulkUpdateContactStatus = async (req, res) => {
  try {
    const { updates } = req.body; // Array: [{ contactId, diseaseStatus, notes }]

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Updates array bo\'sh bo\'lmasligi kerak'
      });
    }

    const forma60 = await Forma60.findById(req.params.id);

    if (!forma60) {
      return res.status(404).json({
        success: false,
        message: 'Forma60 topilmadi'
      });
    }

    let updatedCount = 0;

    // Har bir kontaktni yangilash
    updates.forEach(update => {
      const contact = forma60.contactsStatus.id(update.contactId);

      if (contact && ['disease_found', 'no_disease'].includes(update.diseaseStatus)) {
        contact.diseaseStatus = update.diseaseStatus;
        contact.checkedBy = req.user._id;
        contact.checkedAt = new Date();
        if (update.notes) contact.notes = update.notes;
        updatedCount++;
      }
    });

    if (updatedCount === 0) {
      return res.status(400).json({
        success: false,
        message: 'Hech bir kontakt yangilanmadi'
      });
    }

    forma60.updatedBy = req.user._id;

    // History ga qo'shish
    forma60.editHistory.push({
      editedBy: req.user._id,
      editedAt: new Date(),
      changes: {
        bulkContactUpdate: {
          updatedCount: updatedCount,
          totalContacts: updates.length
        }
      },
      action: 'updated'
    });

    await forma60.save();

    res.status(200).json({
      success: true,
      message: `${updatedCount} ta kontakt holati yangilandi`,
      data: {
        updatedCount,
        totalRequested: updates.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server xatosi',
      error: error.message
    });
  }
};

// @desc    Statistika - Vrach yordamchisi uchun dashboard
// @route   GET /api/contacts/stats
// @access  Private (Vrach yordamchisi)
exports.getContactsStatistics = async (req, res) => {
  try {
    // Jami Forma60 lar kontaktlar bilan
    const totalForma60WithContacts = await Forma60.countDocuments({
      contactsStatus: { $exists: true, $not: { $size: 0 } }
    });

    // Pending kontaktlar soni
    const pendingContacts = await Forma60.aggregate([
      { $match: { 'contactsStatus.0': { $exists: true } } },
      { $unwind: '$contactsStatus' },
      { $match: { 'contactsStatus.diseaseStatus': 'pending' } },
      { $count: 'total' }
    ]);

    // Kasallik topilgan kontaktlar
    const diseaseFoundContacts = await Forma60.aggregate([
      { $match: { 'contactsStatus.0': { $exists: true } } },
      { $unwind: '$contactsStatus' },
      { $match: { 'contactsStatus.diseaseStatus': 'disease_found' } },
      { $count: 'total' }
    ]);

    // Kasallik topilmagan kontaktlar
    const noDiseaseContacts = await Forma60.aggregate([
      { $match: { 'contactsStatus.0': { $exists: true } } },
      { $unwind: '$contactsStatus' },
      { $match: { 'contactsStatus.diseaseStatus': 'no_disease' } },
      { $count: 'total' }
    ]);

    // Bugungi tekshirilgan kontaktlar (faqat joriy user uchun)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayChecked = await Forma60.aggregate([
      { $match: { 'contactsStatus.0': { $exists: true } } },
      { $unwind: '$contactsStatus' },
      {
        $match: {
          'contactsStatus.checkedBy': req.user._id,
          'contactsStatus.checkedAt': { $gte: today }
        }
      },
      { $count: 'total' }
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalForma60WithContacts,
        pendingContacts: pendingContacts[0]?.total || 0,
        diseaseFoundContacts: diseaseFoundContacts[0]?.total || 0,
        noDiseaseContacts: noDiseaseContacts[0]?.total || 0,
        todayCheckedByMe: todayChecked[0]?.total || 0
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server xatosi',
      error: error.message
    });
  }
};
