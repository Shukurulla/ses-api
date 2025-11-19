const mongoose = require('mongoose');

const clinicSchema = new mongoose.Schema({
  institutionName: { type: String, required: true },
  institutionType: {
    type: String,
    enum: ['Поликлиника', 'Школа', 'Университет', 'Десткий сад', 'Техникум / Колледж'],
    required: true
  },
  fullName: String,
  username: String,
  phone: String,
  telegramId: String,

  address: { type: String, required: true },
  landmark: String,
  coordinates: {
    latitude: Number,
    longitude: Number
  },

  // Statistika
  patientCount: { type: Number, default: 0 },

  // Soft delete
  isDeleted: { type: Boolean, default: false },
  deletedAt: Date,
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true
});

// Soft delete uchun query middleware
clinicSchema.pre(/^find/, function(next) {
  this.where({ isDeleted: false });
  next();
});

clinicSchema.pre('countDocuments', function(next) {
  this.where({ isDeleted: false });
  next();
});

// Soft delete metodi
clinicSchema.methods.softDelete = function(userId) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = userId;
  return this.save();
};

module.exports = mongoose.model('Clinic', clinicSchema);
