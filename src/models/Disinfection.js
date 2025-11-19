const mongoose = require('mongoose');

const disinfectionSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  address: { type: String, required: true },
  coordinates: {
    lat: Number,
    lng: Number
  },

  status: {
    type: String,
    enum: ['yangi', 'tayinlangan', 'jarayonda', 'bajarildi', 'bekor qilingan'],
    default: 'yangi'
  },

  assignedDate: Date,
  scheduledDate: Date,
  completedDate: Date,

  disinfector: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // Dezinfeksiya ma'lumotlari
  disinfectionType: {
    type: String,
    enum: ['uchqun', 'sogichli', 'profilaktik', 'yakuniy']
  },
  chemicals: [String],
  area: Number, // metr kvadratda

  photos: [String], // Rasm fayllari yo'li
  notes: String,

  // Soft delete
  isDeleted: { type: Boolean, default: false },
  deletedAt: Date,
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true
});

// Soft delete uchun query middleware
disinfectionSchema.pre(/^find/, function(next) {
  this.where({ isDeleted: false });
  next();
});

disinfectionSchema.pre('countDocuments', function(next) {
  this.where({ isDeleted: false });
  next();
});

// Soft delete metodi
disinfectionSchema.methods.softDelete = function(userId) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = userId;
  return this.save();
};

module.exports = mongoose.model('Disinfection', disinfectionSchema);
