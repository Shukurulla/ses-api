const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Token tekshirish
exports.protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Avtorizatsiya uchun tizimga kiring'
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('+password');

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Foydalanuvchi topilmadi'
        });
      }

      if (!req.user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Foydalanuvchi faol emas'
        });
      }

      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Token yaroqsiz yoki muddati tugagan'
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server xatosi',
      error: error.message
    });
  }
};

// Rolni tekshirish
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `${req.user.role} roli uchun ruxsat yo'q`
      });
    }
    next();
  };
};
