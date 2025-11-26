const Forma60 = require('../models/Forma60');
const Karta = require('../models/Karta');
const User = require('../models/User');
const Disinfection = require('../models/Disinfection');

/**
 * Stats Controller
 * Dashboard va statistika uchun
 */

// @desc    Dashboard statistikasi
// @route   GET /api/stats/dashboard
// @access  Private
exports.getDashboardStats = async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    const startOfMonth = new Date(currentYear, currentMonth, 1);
    const startOfYear = new Date(currentYear, 0, 1);

    // Jami holatlar
    const totalForma60 = await Forma60.countDocuments();
    const totalKarta = await Karta.countDocuments();

    // Bu oyda yaratilgan
    const thisMonthForma60 = await Forma60.countDocuments({
      createdAt: { $gte: startOfMonth }
    });
    const thisMonthKarta = await Karta.countDocuments({
      createdAt: { $gte: startOfMonth }
    });

    // Bu yilda yaratilgan
    const thisYearForma60 = await Forma60.countDocuments({
      createdAt: { $gte: startOfYear }
    });

    // Kasallik turlari bo'yicha
    const salmonellyozCount = await Forma60.countDocuments({
      primaryDiagnosis: { $regex: /salmonell/i },
      illnessDate: { $gte: startOfYear }
    });

    const ichBurugCount = await Forma60.countDocuments({
      primaryDiagnosis: { $regex: /shigell|ich.*burug/i },
      illnessDate: { $gte: startOfYear }
    });

    const oyuikCount = await Forma60.countDocuments({
      $or: [
        { primaryDiagnosis: { $regex: /EPKP/i } },
        { primaryDiagnosis: { $regex: /rotavirus/i } },
        { primaryDiagnosis: { $regex: /o.*tkir.*ichak/i } }
      ],
      illnessDate: { $gte: startOfYear }
    });

    // Foydalanuvchilar soni
    const totalUsers = await User.countDocuments();

    // Pending kontaktlar
    const pendingContacts = await Forma60.aggregate([
      { $unwind: '$contactsStatus' },
      { $match: { 'contactsStatus.diseaseStatus': 'pending' } },
      { $count: 'total' }
    ]);

    // Pending oziq-ovqat tekshiruvlari
    const pendingFoodInspections = await Forma60.countDocuments({
      transmissionFactor: {
        $in: ['Oziq-ovqat', 'Suv', 'Sut mahsulotlari', 'Gosht mahsulotlari', 'Baliq', 'Salat', 'Meva va sabzavot']
      },
      'foodInspection.water': null,
      'foodInspection.meat': null,
      'foodInspection.milk': null
    });

    // O'tgan oy bilan taqqoslash
    const lastMonth = new Date(currentYear, currentMonth - 1, 1);
    const lastMonthEnd = new Date(currentYear, currentMonth, 0);

    const lastMonthForma60 = await Forma60.countDocuments({
      createdAt: { $gte: lastMonth, $lte: lastMonthEnd }
    });

    const lastMonthKarta = await Karta.countDocuments({
      createdAt: { $gte: lastMonth, $lte: lastMonthEnd }
    });

    // Foiz hisobash
    const forma60ChangePercent = lastMonthForma60 > 0
      ? (((thisMonthForma60 - lastMonthForma60) / lastMonthForma60) * 100).toFixed(1)
      : 0;

    const kartaChangePercent = lastMonthKarta > 0
      ? (((thisMonthKarta - lastMonthKarta) / lastMonthKarta) * 100).toFixed(1)
      : 0;

    res.status(200).json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          changePercent: 0 // Users jami o'zgarmaydi
        },
        forma60: {
          total: totalForma60,
          thisMonth: thisMonthForma60,
          changePercent: parseFloat(forma60ChangePercent)
        },
        karta: {
          total: totalKarta,
          thisMonth: thisMonthKarta,
          changePercent: parseFloat(kartaChangePercent)
        },
        disinfection: {
          total: await Disinfection.countDocuments({ isDeleted: { $ne: true } }),
          completed: await Disinfection.countDocuments({ status: 'qilindi', isDeleted: { $ne: true } }),
          changePercent: 0
        },
        diseases: {
          salmonellyoz: salmonellyozCount,
          ichBurug: ichBurugCount,
          oyuik: oyuikCount
        },
        pending: {
          contacts: pendingContacts.length > 0 ? pendingContacts[0].total : 0,
          foodInspections: pendingFoodInspections
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

// @desc    Oylik tendensiyalar
// @route   GET /api/stats/monthly-trends
// @access  Private
exports.getMonthlyTrends = async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;

    const startDate = new Date(`${year}-01-01`);
    const endDate = new Date(`${year}-12-31T23:59:59`);

    const monthlyData = await Forma60.aggregate([
      {
        $match: {
          illnessDate: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: { $month: '$illnessDate' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Barcha oylar uchun ma'lumot (0 bilan)
    const months = Array.from({ length: 12 }, (_, i) => {
      const monthData = monthlyData.find(m => m._id === i + 1);
      return {
        month: i + 1,
        count: monthData ? monthData.count : 0
      };
    });

    res.status(200).json({
      success: true,
      data: months
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server xatosi',
      error: error.message
    });
  }
};

// @desc    Faoliyat logi
// @route   GET /api/stats/activity-log
// @access  Private
exports.getActivityLog = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    // So'nggi yaratilgan Forma60 lar
    const recentForma60 = await Forma60.find()
      .select('formNumber fullName primaryDiagnosis createdAt createdBy')
      .populate('createdBy', 'fullName username')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    // So'nggi yaratilgan Kartalar
    const recentKarta = await Karta.find()
      .select('forma60 pdfType createdAt createdBy')
      .populate('forma60', 'formNumber fullName')
      .populate('createdBy', 'fullName username')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    // Birlashtirib, sanaga ko'ra tartiblash
    const activities = [
      ...recentForma60.map(f => ({
        type: 'forma60',
        id: f._id,
        title: `Forma60 #${f.formNumber}`,
        description: `${f.fullName} - ${f.primaryDiagnosis}`,
        user: f.createdBy?.fullName || 'Noma\'lum',
        createdAt: f.createdAt
      })),
      ...recentKarta.map(k => ({
        type: 'karta',
        id: k._id,
        title: `Karta - ${k.forma60?.formNumber || 'N/A'}`,
        description: `PDF yuklandi: ${k.pdfType}`,
        user: k.createdBy?.fullName || 'Noma\'lum',
        createdAt: k.createdAt
      }))
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, parseInt(limit));

    res.status(200).json({
      success: true,
      data: activities
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server xatosi',
      error: error.message
    });
  }
};

// @desc    Yosh guruhlari statistikasi
// @route   GET /api/stats/age-groups
// @access  Private
exports.getAgeGroupStats = async (req, res) => {
  try {
    const ageGroups = [
      { name: '0-1', min: 0, max: 1 },
      { name: '1-2', min: 1, max: 2 },
      { name: '3-6', min: 3, max: 6 },
      { name: '7-14', min: 7, max: 14 },
      { name: '15-17', min: 15, max: 17 },
      { name: '18+', min: 18, max: 200 }
    ];

    const results = await Promise.all(
      ageGroups.map(async (group) => {
        const count = await Forma60.countDocuments({
          age: { $gte: group.min, $lte: group.max }
        });
        return {
          group: group.name,
          count
        };
      })
    );

    res.status(200).json({
      success: true,
      data: results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server xatosi',
      error: error.message
    });
  }
};

// @desc    Foydalanuvchilar rollar bo'yicha
// @route   GET /api/stats/users-by-role
// @access  Private
exports.getUsersByRole = async (req, res) => {
  try {
    const users = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    const roleNames = {
      'admin': 'Admin',
      'forma60_filler': 'Forma60 to\'ldiruvchi',
      'karta_filler': 'Karta to\'ldiruvchi',
      'dezinfektor': 'Dezinfektor',
      'vrach_yordamchisi': 'Vrach yordamchisi',
      'oziq_ovqat_tekshiruvchi': 'Oziq-ovqat tekshiruvchi'
    };

    const result = users.map(u => ({
      role: roleNames[u._id] || u._id,
      count: u.count
    }));

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server xatosi',
      error: error.message
    });
  }
};

// @desc    Forma60 diagnozlar bo'yicha
// @route   GET /api/stats/forma60-by-diagnosis
// @access  Private
exports.getForma60ByDiagnosis = async (req, res) => {
  try {
    const diagnoses = await Forma60.aggregate([
      {
        $group: {
          _id: '$primaryDiagnosis',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 10
      }
    ]);

    const result = diagnoses.map(d => ({
      diagnosis: d._id || 'Noma\'lum',
      count: d.count
    }));

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server xatosi',
      error: error.message
    });
  }
};

// @desc    Dezinfeksiya holatlari bo'yicha
// @route   GET /api/stats/disinfections-by-status
// @access  Private
exports.getDisinfectionsByStatus = async (req, res) => {
  try {
    const Disinfection = require('../models/Disinfection');

    const stats = await Disinfection.aggregate([
      { $match: { isDeleted: { $ne: true } } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const statusNames = {
      'kerak': 'Kerak',
      'qabul_qilindi': 'Qabul qilindi',
      'jarayonda': 'Jarayonda',
      'qilindi': 'Bajarildi',
      'bekor_qilindi': 'Bekor qilindi'
    };

    const result = stats.map(s => ({
      status: statusNames[s._id] || s._id,
      count: s.count
    }));

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server xatosi',
      error: error.message
    });
  }
};

// @desc    Tumanlar bo'yicha statistika
// @route   GET /api/stats/districts
// @access  Private
exports.getDistrictStats = async (req, res) => {
  try {
    const District = require('../models/District');

    const districts = await Forma60.aggregate([
      {
        $lookup: {
          from: 'districts',
          localField: 'address.mahalla',
          foreignField: '_id',
          as: 'districtInfo'
        }
      },
      {
        $unwind: {
          path: '$districtInfo',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $group: {
          _id: '$districtInfo.name',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    const result = districts.map(d => ({
      district: d._id || 'Noma\'lum',
      count: d.count
    }));

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server xatosi',
      error: error.message
    });
  }
};

// @desc    Performance metrics
// @route   GET /api/stats/performance
// @access  Private
exports.getPerformanceMetrics = async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);

    const totalForma60ThisYear = await Forma60.countDocuments({
      createdAt: { $gte: startOfYear }
    });

    const totalKartaThisYear = await Karta.countDocuments({
      createdAt: { $gte: startOfYear }
    });

    // Average processing time (placeholder)
    const metrics = {
      totalForma60: totalForma60ThisYear,
      totalKarta: totalKartaThisYear,
      averageProcessingTime: 2.5, // days
      completionRate: 85, // percentage
      pendingTasks: await Forma60.countDocuments({ status: 'yangi' })
    };

    res.status(200).json({
      success: true,
      data: metrics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server xatosi',
      error: error.message
    });
  }
};

module.exports = exports;
