const mongoose = require('mongoose');

const districtSchema = new mongoose.Schema({
  name: { type: String, required: true },
  region: { type: String, required: true, default: 'Нукус шаҳар' },

  // Soft delete
  isDeleted: { type: Boolean, default: false },
  deletedAt: Date,
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true
});

// Soft delete uchun query middleware
districtSchema.pre(/^find/, function(next) {
  this.where({ isDeleted: false });
  next();
});

districtSchema.pre('countDocuments', function(next) {
  this.where({ isDeleted: false });
  next();
});

// Soft delete metodi
districtSchema.methods.softDelete = function(userId) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = userId;
  return this.save();
};

module.exports = mongoose.model('District', districtSchema);
