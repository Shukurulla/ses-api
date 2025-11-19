const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Token yaratish
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

// Token yuborish
const sendTokenResponse = (user, statusCode, res) => {
  const token = signToken(user._id);

  const userData = {
    _id: user._id,
    fullName: user.fullName,
    username: user.username,
    email: user.email,
    role: user.role,
    workplace: user.workplace
  };

  res.status(statusCode).json({
    success: true,
    token,
    user: userData
  });
};

// @desc    Ro'yxatdan o'tish
// @route   POST /api/auth/register
// @access  Admin
exports.register = async (req, res, next) => {
  try {
    const { fullName, username, email, password, role, workplace, workplaceDetails, phone } = req.body;

    // Username yoki email mavjudligini tekshirish
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Username yoki email allaqachon mavjud'
      });
    }

    const user = await User.create({
      fullName,
      username,
      email,
      password,
      role,
      workplace,
      workplaceDetails,
      phone
    });

    sendTokenResponse(user, 201, res);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ro\'yxatdan o\'tishda xatolik',
      error: error.message
    });
  }
};

// @desc    Tizimga kirish
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    // Username va parolni tekshirish
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username va parolni kiriting'
      });
    }

    // Foydalanuvchini topish
    const user = await User.findOne({ username }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Noto\'g\'ri username yoki parol'
      });
    }

    // Parolni tekshirish
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Noto\'g\'ri username yoki parol'
      });
    }

    // Oxirgi kirish vaqtini yangilash
    user.lastLogin = Date.now();
    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Tizimga kirishda xatolik',
      error: error.message
    });
  }
};

// @desc    Joriy foydalanuvchi ma'lumotlarini olish
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Xatolik yuz berdi',
      error: error.message
    });
  }
};

// @desc    Parolni o'zgartirish
// @route   PUT /api/auth/update-password
// @access  Private
exports.updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select('+password');

    // Joriy parolni tekshirish
    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Joriy parol noto\'g\'ri'
      });
    }

    user.password = newPassword;
    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Parolni o\'zgartirishda xatolik',
      error: error.message
    });
  }
};
