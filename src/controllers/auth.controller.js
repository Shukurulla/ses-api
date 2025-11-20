const User = require('../models/User');
const District = require('../models/District');

/**
 * Auth Controller
 * Login, Register, User Management
 */

// @desc    Register yangi user
// @route   POST /api/auth/register
// @access  Private (Admin only)
exports.register = async (req, res) => {
  try {
    const {
      fullName,
      username,
      password,
      role,
      phone,
      district,
      position,
      workSchedule
    } = req.body;

    // Username mavjudligini tekshirish
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Bu login allaqachon ro\'yxatdan o\'tgan'
      });
    }

    // User yaratish
    const user = await User.create({
      fullName,
      username,
      password,
      plainPassword: password, // Admin ko'rishi uchun
      role,
      phone,
      district,
      position,
      workSchedule
    });

    // Password ni response dan olib tashlash
    user.password = undefined;

    res.status(201).json({
      success: true,
      message: 'Foydalanuvchi muvaffaqiyatli ro\'yxatdan o\'tdi',
      data: user
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Ro\'yxatdan o\'tishda xatolik',
      error: error.message
    });
  }
};

// @desc    Login
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Username va password tekshirish
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Login va parolni kiriting'
      });
    }

    // User ni topish (password bilan)
    const user = await User.findOne({ username: username.toLowerCase() }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Login yoki parol noto\'g\'ri'
      });
    }

    // Password tekshirish
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Login yoki parol noto\'g\'ri'
      });
    }

    // Faol emasligini tekshirish
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Foydalanuvchi faol emas. Admin bilan bog\'laning'
      });
    }

    // Token yaratish
    const token = user.generateToken();

    // Last login ni yangilash
    user.lastLogin = new Date();
    await user.save();

    // Password ni response dan olib tashlash
    user.password = undefined;

    res.status(200).json({
      success: true,
      message: 'Muvaffaqiyatli tizimga kirildi',
      token: token,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Tizimga kirishda xatolik',
      error: error.message
    });
  }
};

// @desc    Hozirgi userni olish
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server xatosi',
      error: error.message
    });
  }
};

// @desc    Profilni yangilash
// @route   PUT /api/auth/update-profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const allowedFields = ['fullName', 'phone', 'position', 'workSchedule'];
    const updates = {};

    // Faqat ruxsat etilgan fieldlarni yangilash
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Profil muvaffaqiyatli yangilandi',
      data: user
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Profilni yangilashda xatolik',
      error: error.message
    });
  }
};

// @desc    Parolni o'zgartirish
// @route   PUT /api/auth/change-password
// @access  Private
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Hozirgi va yangi parolni kiriting'
      });
    }

    // User ni password bilan olish
    const user = await User.findById(req.user._id).select('+password');

    // Hozirgi parolni tekshirish
    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Hozirgi parol noto\'g\'ri'
      });
    }

    // Yangi parolni o'rnatish
    user.password = newPassword;
    user.plainPassword = newPassword; // Admin ko'rishi uchun
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Parol muvaffaqiyatli o\'zgartirildi'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Parolni o\'zgartirishda xatolik',
      error: error.message
    });
  }
};

// @desc    Barcha userlarni olish
// @route   GET /api/auth/users
// @access  Private (Admin)
exports.getAllUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      role,
      workplace,
      isActive,
      search
    } = req.query;

    const filter = {};

    if (role) filter.role = role;
    if (workplace) filter.workplace = workplace;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    // Search (ism yoki username bo'yicha)
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;

    const users = await User.find(filter)
      .select('+plainPassword') // Admin parollarni ko'rishi mumkin
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: users.length,
      total: total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server xatosi',
      error: error.message
    });
  }
};

// @desc    Userni ID bo'yicha olish
// @route   GET /api/auth/users/:id
// @access  Private (Admin)
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('+plainPassword'); // Admin parolni ko'rishi mumkin

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Foydalanuvchi topilmadi'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server xatosi',
      error: error.message
    });
  }
};

// @desc    Userni yangilash (Admin)
// @route   PUT /api/auth/users/:id
// @access  Private (Admin)
exports.updateUser = async (req, res) => {
  try {
    const allowedFields = [
      'fullName',
      'username',
      'role',
      'phone',
      'workplace',
      'workplaceDetails',
      'isActive'
    ];

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Foydalanuvchi topilmadi'
      });
    }

    // Ruxsat etilgan fieldlarni yangilash
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        user[field] = req.body[field];
      }
    }

    // Agar parol o'zgartirilyapti bo'lsa
    if (req.body.password) {
      user.password = req.body.password;
      user.plainPassword = req.body.password;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Foydalanuvchi muvaffaqiyatli yangilandi',
      data: user
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Foydalanuvchini yangilashda xatolik',
      error: error.message
    });
  }
};

// @desc    Userni o'chirish
// @route   DELETE /api/auth/users/:id
// @access  Private (Admin)
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Foydalanuvchi topilmadi'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Foydalanuvchi muvaffaqiyatli o\'chirildi'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Foydalanuvchini o\'chirishda xatolik',
      error: error.message
    });
  }
};

// @desc    Karta fillerlarni olish (Forma60 filler uchun)
// @route   GET /api/auth/karta-fillers
// @access  Private (Admin, Forma60 filler)
exports.getKartaFillers = async (req, res) => {
  try {
    const kartaFillers = await User.find({
      role: 'karta_filler',
      isActive: true
    }).select('fullName username phone role');

    res.status(200).json({
      success: true,
      count: kartaFillers.length,
      data: kartaFillers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Karta fillerlarni olishda xatolik',
      error: error.message
    });
  }
};

// @desc    User statistikasi
// @route   GET /api/auth/stats
// @access  Private (Admin)
exports.getUserStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });

    const usersByRole = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);

    const usersByWorkplace = await User.aggregate([
      {
        $match: { workplace: { $exists: true, $ne: null } }
      },
      {
        $group: {
          _id: '$workplace',
          count: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        total: totalUsers,
        active: activeUsers,
        inactive: totalUsers - activeUsers,
        byRole: usersByRole,
        byWorkplace: usersByWorkplace
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Statistika olishda xatolik',
      error: error.message
    });
  }
};

module.exports = exports;
