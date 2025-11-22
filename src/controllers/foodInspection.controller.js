const Forma60 = require('../models/Forma60');

/**
 * Food Inspection Controller
 * Oziq-ovqat tekshiruvchi uchun - Oziq-ovqat mahsulotlarini tekshirish
 */

// @desc    Oziq-ovqat tekshiruvi kerak bo'lgan Forma60 larni olish
// @route   GET /api/food-inspection/forma60-list
// @access  Private (Oziq-ovqat tekshiruvchi)
exports.getForma60ForFoodInspection = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      search,
      transmissionFactor
    } = req.query;

    const filter = {};

    // Faqat oziq-ovqat bilan bog'liq yuqish omili bo'lganlarni ko'rsatish
    const foodRelatedFactors = [
      'Oziq-ovqat',
      'Suv',
      'Sut mahsulotlari',
      'Gosht mahsulotlari',
      'Baliq',
      'Salat',
      'Meva va sabzavot'
    ];

    if (transmissionFactor) {
      filter.transmissionFactor = transmissionFactor;
    } else {
      filter.transmissionFactor = { $in: foodRelatedFactors };
    }

    // Status bo'yicha filter
    if (status === 'pending') {
      filter['foodInspection.water'] = null;
      filter['foodInspection.meat'] = null;
      filter['foodInspection.milk'] = null;
      filter['foodInspection.fish'] = null;
      filter['foodInspection.vegetables'] = null;
      filter['foodInspection.fruits'] = null;
    } else if (status === 'completed') {
      filter.$or = [
        { 'foodInspection.water': { $ne: null } },
        { 'foodInspection.meat': { $ne: null } },
        { 'foodInspection.milk': { $ne: null } },
        { 'foodInspection.fish': { $ne: null } },
        { 'foodInspection.vegetables': { $ne: null } },
        { 'foodInspection.fruits': { $ne: null } }
      ];
    }

    // Search bo'yicha
    if (search) {
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: [
          { fullName: { $regex: search, $options: 'i' } },
          { formNumber: { $regex: search, $options: 'i' } },
          { address: { $regex: search, $options: 'i' } }
        ]
      });
    }

    const skip = (page - 1) * limit;

    const forma60s = await Forma60.find(filter)
      .select('formNumber fullName birthDate age address primaryDiagnosis finalDiagnosis transmissionFactor foodInspection illnessDate')
      .populate('foodInspection.inspectedBy', 'fullName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Forma60.countDocuments(filter);

    // Har bir Forma60 uchun tekshiruv holatini hisoblash
    const forma60sWithStats = forma60s.map(f => {
      const obj = f.toObject();
      const inspection = f.foodInspection || {};

      const allNull = inspection.water === null &&
                      inspection.meat === null &&
                      inspection.milk === null &&
                      inspection.fish === null &&
                      inspection.vegetables === null &&
                      inspection.fruits === null;

      obj.inspectionStatus = allNull ? 'pending' : 'completed';

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

// @desc    Bitta Forma60 ning oziq-ovqat tekshiruvi ma'lumotlarini olish
// @route   GET /api/food-inspection/forma60/:id
// @access  Private (Oziq-ovqat tekshiruvchi)
exports.getForma60FoodInspection = async (req, res) => {
  try {
    const forma60 = await Forma60.findById(req.params.id)
      .select('formNumber fullName birthDate age address primaryDiagnosis finalDiagnosis transmissionFactor foodInspection illnessDate infectionSource')
      .populate('foodInspection.inspectedBy', 'fullName');

    if (!forma60) {
      return res.status(404).json({
        success: false,
        message: 'Forma60 topilmadi'
      });
    }

    res.status(200).json({
      success: true,
      data: forma60
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server xatosi',
      error: error.message
    });
  }
};

// @desc    Oziq-ovqat tekshiruvi natijalarini yangilash
// @route   PUT /api/food-inspection/forma60/:id/inspection
// @access  Private (Oziq-ovqat tekshiruvchi)
exports.updateFoodInspection = async (req, res) => {
  try {
    const {
      water,
      meat,
      milk,
      fish,
      vegetables,
      fruits,
      notes
    } = req.body;

    const forma60 = await Forma60.findById(req.params.id);

    if (!forma60) {
      return res.status(404).json({
        success: false,
        message: 'Forma60 topilmadi'
      });
    }

    // Oziq-ovqat tekshiruvi natijalarini yangilash
    forma60.foodInspection = {
      water: water !== undefined ? water : forma60.foodInspection?.water,
      meat: meat !== undefined ? meat : forma60.foodInspection?.meat,
      milk: milk !== undefined ? milk : forma60.foodInspection?.milk,
      fish: fish !== undefined ? fish : forma60.foodInspection?.fish,
      vegetables: vegetables !== undefined ? vegetables : forma60.foodInspection?.vegetables,
      fruits: fruits !== undefined ? fruits : forma60.foodInspection?.fruits,
      inspectedBy: req.user._id,
      inspectedAt: new Date(),
      notes: notes || forma60.foodInspection?.notes
    };

    forma60.updatedBy = req.user._id;

    // History ga qo'shish
    forma60.editHistory.push({
      editedBy: req.user._id,
      editedAt: new Date(),
      changes: {
        foodInspection: {
          water,
          meat,
          milk,
          fish,
          vegetables,
          fruits
        }
      },
      action: 'updated'
    });

    await forma60.save();

    await forma60.populate('foodInspection.inspectedBy', 'fullName');

    res.status(200).json({
      success: true,
      message: 'Oziq-ovqat tekshiruvi natijalari muvaffaqiyatli saqlandi',
      data: forma60
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server xatosi',
      error: error.message
    });
  }
};

// @desc    Statistika - Oziq-ovqat tekshiruvchi uchun dashboard
// @route   GET /api/food-inspection/stats
// @access  Private (Oziq-ovqat tekshiruvchi)
exports.getFoodInspectionStatistics = async (req, res) => {
  try {
    // Oziq-ovqat bilan bog'liq yuqish omillari
    const foodRelatedFactors = [
      'Oziq-ovqat',
      'Suv',
      'Sut mahsulotlari',
      'Gosht mahsulotlari',
      'Baliq',
      'Salat',
      'Meva va sabzavot'
    ];

    // Jami oziq-ovqat tekshiruvi kerak bo'lgan forma60 lar
    const totalFoodRelatedCases = await Forma60.countDocuments({
      transmissionFactor: { $in: foodRelatedFactors }
    });

    // Pending (tekshirilmagan) holatlar
    const pendingInspections = await Forma60.countDocuments({
      transmissionFactor: { $in: foodRelatedFactors },
      'foodInspection.water': null,
      'foodInspection.meat': null,
      'foodInspection.milk': null,
      'foodInspection.fish': null,
      'foodInspection.vegetables': null,
      'foodInspection.fruits': null
    });

    // Tekshirilgan holatlar
    const completedInspections = totalFoodRelatedCases - pendingInspections;

    // Bugungi tekshirilgan holatlar (faqat joriy user uchun)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayInspected = await Forma60.countDocuments({
      transmissionFactor: { $in: foodRelatedFactors },
      'foodInspection.inspectedBy': req.user._id,
      'foodInspection.inspectedAt': { $gte: today }
    });

    // Yuqish omillari bo'yicha statistika
    const byTransmissionFactor = await Forma60.aggregate([
      {
        $match: {
          transmissionFactor: { $in: foodRelatedFactors }
        }
      },
      {
        $group: {
          _id: '$transmissionFactor',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    // Musbat natijalar (contaminated food)
    const contaminatedCases = await Forma60.countDocuments({
      transmissionFactor: { $in: foodRelatedFactors },
      $or: [
        { 'foodInspection.water': true },
        { 'foodInspection.meat': true },
        { 'foodInspection.milk': true },
        { 'foodInspection.fish': true },
        { 'foodInspection.vegetables': true },
        { 'foodInspection.fruits': true }
      ]
    });

    res.status(200).json({
      success: true,
      data: {
        totalFoodRelatedCases,
        pendingInspections,
        completedInspections,
        contaminatedCases,
        todayInspectedByMe: todayInspected,
        byTransmissionFactor: byTransmissionFactor.map(item => ({
          factor: item._id,
          count: item.count
        }))
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
