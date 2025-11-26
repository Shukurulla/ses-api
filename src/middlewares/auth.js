const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Authentication & Authorization Middleware
 * Roles: admin, forma60_filler, karta_filler, dezinfektor, vrach_assistant, food_inspector
 */

// Token tekshirish (protect bilan bir xil)
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
      req.user = await User.findById(decoded.id).select('-password');

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

// Authenticate (protect bilan bir xil, faqat alias)
exports.authenticate = exports.protect;

// Rolni tekshirish
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' uchun ruxsat yo'q. Kerakli role: ${roles.join(', ')}`
      });
    }
    next();
  };
};

// Admin tekshirish
exports.isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Bu funksiya faqat admin uchun'
    });
  }
  next();
};

// Forma60 filler role tekshirish
exports.isForma60Filler = (req, res, next) => {
  if (!req.user || (req.user.role !== 'forma60_filler' && req.user.role !== 'admin')) {
    return res.status(403).json({
      success: false,
      message: 'Bu funksiya faqat Forma60 toldiruvchilar uchun'
    });
  }
  next();
};

// Karta filler role tekshirish
exports.isKartaFiller = (req, res, next) => {
  if (!req.user || (req.user.role !== 'karta_filler' && req.user.role !== 'admin')) {
    return res.status(403).json({
      success: false,
      message: 'Bu funksiya faqat Karta toldiruvchilar uchun'
    });
  }
  next();
};

// Dezinfektor role tekshirish
exports.isDezinfektor = (req, res, next) => {
  if (!req.user || (req.user.role !== 'dezinfektor' && req.user.role !== 'admin')) {
    return res.status(403).json({
      success: false,
      message: 'Bu funksiya faqat Dezinfektorlar uchun'
    });
  }
  next();
};

// O'z yozuvlarini o'zgartirish (yoki admin)
exports.canModify = (resourceUserIdField = 'createdBy') => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Tizimga kirish uchun login qiling'
      });
    }

    // Admin barchani o'zgartirishi mumkin
    if (req.user.role === 'admin') {
      return next();
    }

    try {
      const resourceId = req.params.id;
      const Model = req.model;

      if (!Model) {
        return res.status(500).json({
          success: false,
          message: 'Model not provided'
        });
      }

      const resource = await Model.findById(resourceId);

      if (!resource) {
        return res.status(404).json({
          success: false,
          message: 'Yozuv topilmadi'
        });
      }

      const resourceUserId = resource[resourceUserIdField];

      if (resourceUserId && resourceUserId.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Siz faqat o\'z yozuvlaringizni o\'zgartirishingiz mumkin'
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Server xatosi',
        error: error.message
      });
    }
  };
};

// Assigned user tekshirish (Karta filler uchun)
exports.isAssignedUser = (resourceField = 'assignedToCardFiller') => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Tizimga kirish uchun login qiling'
      });
    }

    // Admin barchani ko'rishi mumkin
    if (req.user.role === 'admin') {
      return next();
    }

    try {
      const resourceId = req.params.id;
      const Model = req.model;

      if (!Model) {
        return res.status(500).json({
          success: false,
          message: 'Model not provided'
        });
      }

      const resource = await Model.findById(resourceId);

      if (!resource) {
        return res.status(404).json({
          success: false,
          message: 'Yozuv topilmadi'
        });
      }

      const assignedUserId = resource[resourceField];

      if (assignedUserId && assignedUserId.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Sizga bu yozuv biriktirulmagan'
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Server xatosi',
        error: error.message
      });
    }
  };
};

// Optional authentication
exports.optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');

      if (user && user.isActive) {
        req.user = user;
      }
    }

    next();
  } catch (error) {
    next();
  }
};
