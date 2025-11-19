const mongoose = require('mongoose');

const investigationSchema = new mongoose.Schema({
  caseNumber: { type: String, required: true, unique: true },
  disease: { type: String, required: true },

  startDate: { type: Date, required: true, default: Date.now },
  endDate: Date,

  status: {
    type: String,
    enum: ['yangi', 'jarayonda', 'tugatilgan', 'bekor qilingan'],
    default: 'yangi'
  },

  location: { type: String, required: true },
  coordinates: {
    lat: Number,
    lng: Number
  },

  investigator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  team: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  // Bog'liq bemorlар
  patients: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Patient' }],
  casesCount: { type: Number, default: 0 },

  // Tavsiyalar va choralar
  recommendations: [{
    text: String,
    date: Date,
    responsible: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: {
      type: String,
      enum: ['yangi', 'bajarilmoqda', 'bajarildi'],
      default: 'yangi'
    }
  }],

  description: String,
  findings: String,
  conclusion: String,

  // Fayllar
  documents: [{
    name: String,
    path: String,
    uploadDate: { type: Date, default: Date.now }
  }],

  // Soft delete
  isDeleted: { type: Boolean, default: false },
  deletedAt: Date,
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true
});

// Case number avtomatik yaratish
investigationSchema.pre('save', async function(next) {
  if (this.isNew && !this.caseNumber) {
    const year = new Date().getFullYear();
    const count = await this.constructor.countDocuments({
      createdAt: {
        $gte: new Date(year, 0, 1),
        $lt: new Date(year + 1, 0, 1)
      }
    });
    this.caseNumber = `EPI-${year}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

// Soft delete uchun query middleware
investigationSchema.pre(/^find/, function(next) {
  this.where({ isDeleted: false });
  next();
});

investigationSchema.pre('countDocuments', function(next) {
  this.where({ isDeleted: false });
  next();
});

// Soft delete metodi
investigationSchema.methods.softDelete = function(userId) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = userId;
  return this.save();
};

module.exports = mongoose.model('Investigation', investigationSchema);
