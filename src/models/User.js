const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true },
  username: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, select: false },
  phone: String,

  role: {
    type: String,
    enum: ['admin', 'epidemiolog', 'laborant', 'shifokor', 'statistik'],
    default: 'epidemiolog'
  },

  // Ish joyi
  workplace: {
    type: String,
    enum: ['SES', 'Poliklinika', 'Shifoxona', 'Laboratoriya', 'Boshqarma'],
    default: 'SES'
  },
  workplaceDetails: String,

  // Faollik
  isActive: { type: Boolean, default: true },
  lastLogin: Date,

  // Soft delete
  isDeleted: { type: Boolean, default: false },
  deletedAt: Date,
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true
});

// Parolni hashlash
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Parolni tekshirish
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Soft delete uchun query middleware
userSchema.pre(/^find/, function(next) {
  this.where({ isDeleted: false });
  next();
});

userSchema.pre('countDocuments', function(next) {
  this.where({ isDeleted: false });
  next();
});

// Soft delete metodi
userSchema.methods.softDelete = function(userId) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = userId;
  return this.save();
};

module.exports = mongoose.model('User', userSchema);
