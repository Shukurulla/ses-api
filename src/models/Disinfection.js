const mongoose = require('mongoose');

const disinfectionSchema = new mongoose.Schema({
  // Forma60 ga reference
  forma60: { type: mongoose.Schema.Types.ObjectId, ref: 'Forma60', required: true },

  // Ish joyi ma'lumotlari (Forma60 dan olinadi)
  workplace: {
    name: { type: String, required: true },
    address: String,
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: [Number] // [longitude, latitude]
    },
    lat: Number,
    lon: Number
  },

  status: {
    type: String,
    enum: ['kerak', 'qabul_qilindi', 'jarayonda', 'qilindi', 'bekor_qilindi'],
    default: 'kerak'
  },

  // Dezinfektor tomonidan qabul qilinganda
  acceptedDate: Date, // Qabul qilish sanasi
  acceptedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // Tayinlangan sana
  assignedDate: Date,
  scheduledDate: Date,
  completedDate: Date,

  // Dezinfektor
  disinfector: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // Dezinfeksiya jarayonida to'plangan location (dezinfektor joyga kelganda)
  actualLocation: {
    lat: Number,
    lon: Number,
    accuracy: Number,
    timestamp: Date
  },

  // Dezinfeksiya ma'lumotlari
  disinfectionType: {
    type: String,
    enum: ['uchqun', 'sogichli', 'profilaktik', 'yakuniy']
  },
  chemicals: [String],
  area: Number, // metr kvadratda

  // Dezinfeksiyadan oldin rasmlar (web camera orqali, gallery ga saqlanmaydi)
  photoBefore: [{
    filename: String,
    path: String,
    mimetype: String,
    size: Number,
    takenAt: { type: Date, default: Date.now },
    location: {
      lat: Number,
      lon: Number
    }
  }],

  // Dezinfeksiyadan keyin rasmlar
  photoAfter: [{
    filename: String,
    path: String,
    mimetype: String,
    size: Number,
    takenAt: { type: Date, default: Date.now },
    location: {
      lat: Number,
      lon: Number
    }
  }],

  // Bekor qilish ma'lumotlari
  cancellationInfo: {
    reason: String, // Nima uchun bekor qilindi
    rejectedBy: String, // Kim ruhsat bermadi
    cancellationDate: Date,
    notes: String
  },

  notes: String,

  // Soft delete va history tracking
  isDeleted: { type: Boolean, default: false },
  deletedAt: Date,
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // O'zgarishlar tarixi
  editHistory: [{
    editedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    editedAt: { type: Date, default: Date.now },
    changes: mongoose.Schema.Types.Mixed,
    previousData: mongoose.Schema.Types.Mixed,
    action: { type: String, enum: ['created', 'updated', 'restored', 'deleted', 'accepted', 'completed', 'cancelled'] }
  }]
}, {
  timestamps: true
});

// Index for geospatial queries
disinfectionSchema.index({ 'workplace.location': '2dsphere' });

// O'zgarishlarni history ga saqlash
disinfectionSchema.pre('save', function(next) {
  if (!this.isNew && this.isModified()) {
    const changes = {};
    const previousData = {};

    this.modifiedPaths().forEach(path => {
      if (path !== 'editHistory' && path !== 'updatedAt') {
        changes[path] = this.get(path);
        if (this._original) {
          previousData[path] = this._original.get(path);
        }
      }
    });

    if (Object.keys(changes).length > 0) {
      // Action ni aniqlash
      let action = 'updated';
      if (this.isModified('status')) {
        if (this.status === 'qabul_qilindi') action = 'accepted';
        else if (this.status === 'qilindi') action = 'completed';
        else if (this.status === 'bekor_qilindi') action = 'cancelled';
      }

      this.editHistory.push({
        editedBy: this.updatedBy,
        editedAt: new Date(),
        changes: changes,
        previousData: previousData,
        action: action
      });
    }
  }
  next();
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

  this.editHistory.push({
    editedBy: userId,
    editedAt: new Date(),
    action: 'deleted'
  });

  return this.save();
};

// Restore metodi
disinfectionSchema.methods.restore = function(userId) {
  this.isDeleted = false;
  this.deletedAt = undefined;
  this.deletedBy = undefined;

  this.editHistory.push({
    editedBy: userId,
    editedAt: new Date(),
    action: 'restored'
  });

  return this.save();
};

// Ma'lum bir vaqtdagi holatga qaytarish
disinfectionSchema.methods.restoreToVersion = function(historyIndex, userId) {
  if (historyIndex >= 0 && historyIndex < this.editHistory.length) {
    const historyItem = this.editHistory[historyIndex];

    if (historyItem.previousData) {
      Object.keys(historyItem.previousData).forEach(key => {
        this.set(key, historyItem.previousData[key]);
      });

      this.updatedBy = userId;
      return this.save();
    }
  }

  throw new Error('Invalid history index');
};

module.exports = mongoose.model('Disinfection', disinfectionSchema);
