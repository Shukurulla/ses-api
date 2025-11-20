const mongoose = require('mongoose');

// Aloqada bo'lgan shaxslar schema
const contactPersonSchema = new mongoose.Schema({
  fullName: { type: String }, // F.I.O (To'liq ism)
  contactType: {
    type: String,
    enum: ['oila', 'ish', 'do\'st', 'boshqa']
  }
});

const forma60Schema = new mongoose.Schema({
  // 1. Ism Familiya Otasining ismi
  fullName: { type: String, trim: true },

  // 2. Tug'ilgan sanasi
  birthDate: { type: Date },
  age: Number, // Avtomatik hisoblanadi

  // 3. Yashash manzili & 12. Aymaqlar (MFY/OFY)
  address: {
    mahalla: { type: mongoose.Schema.Types.ObjectId, ref: 'District' }, // Mahalla ID (nukus_districts.json dan)
    fullAddress: { type: String } // Yashash manzili - to'liq manzil qo'lda kiritiladi
  },

  // 4. Ish orni - OpenStreetMap integratsiya
  workplace: {
    name: { type: String },
    address: String,
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: [Number] // [longitude, latitude]
    },
    osmData: mongoose.Schema.Types.Mixed // Har qanday object qabul qiladi
  },

  // 5. Kasallangan kuni
  illnessDate: { type: Date },

  // 6. Murojat qilingan kun
  contactDate: { type: Date },

  // 7. Davolashga yotqan sanasi
  hospitalizationDate: { type: Date },

  // 8. Birlamchi diagnoz
  primaryDiagnosis: String,

  // 9. Yakunlovchi diagnoz
  finalDiagnosis: String,

  // 10. Laboratoriya yakuniy natijasi (Diagnoz)
  laboratoryResult: String,

  // 11. Aloqada bo'lgan shaxslar
  contactedPersons: [contactPersonSchema],

  // 13. Epidemiolog
  epidemiologist: {
    name: { type: String },
    phone: String,
    inspectionDate: Date
  },

  // 14. Oxirgi marta ish joyiga qachon bordi
  lastWorkplaceVisit: Date,

  // 15. Dezinfeksiya qilish yoki qilish shart emas
  disinfectionRequired: {
    type: Boolean,
    default: true
  },
  disinfectionStatus: {
    type: String,
    enum: ['kerak', 'qilinmoqda', 'qilindi', 'kerak emas', 'bekor qilindi'],
    default: 'kerak'
  },
  disinfectionDetails: {
    scheduledDate: Date,
    completedDate: Date,
    reason: String, // Nima uchun kerak emas yoki bekor qilindi
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },

  // 16. Karta toldiruvchi shaxsga biriktirish
  assignedToCardFiller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assignedDate: Date,

  // Status
  status: {
    type: String,
    enum: ['yangi', 'karta_toldirishda', 'dezinfeksiya_kutilmoqda', 'tugatilgan'],
    default: 'yangi'
  },

  // Soft delete va history tracking
  isDeleted: { type: Boolean, default: false },
  deletedAt: Date,
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // Kimlar tomonidan yaratilgan/o'zgartirilgan
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // O'zgarishlar tarixi
  editHistory: [{
    editedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    editedAt: { type: Date, default: Date.now },
    changes: mongoose.Schema.Types.Mixed, // Nima o'zgargan
    previousData: mongoose.Schema.Types.Mixed, // Oldingi ma'lumot
    action: { type: String, enum: ['created', 'updated', 'restored', 'deleted'] }
  }]
}, {
  timestamps: true
});

// Index for geospatial queries
forma60Schema.index({ 'workplace.location': '2dsphere' });

// Yosh avtomatik hisoblanadi
forma60Schema.pre('save', function(next) {
  if (this.birthDate) {
    const today = new Date();
    const birthDate = new Date(this.birthDate);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    this.age = age;
  }
  next();
});

// O'zgarishlarni history ga saqlash - Controller da amalga oshiriladi

// Soft delete uchun query middleware
forma60Schema.pre(/^find/, function(next) {
  this.where({ isDeleted: false });
  next();
});

forma60Schema.pre('countDocuments', function(next) {
  this.where({ isDeleted: false });
  next();
});

// Soft delete metodi
forma60Schema.methods.softDelete = function(userId) {
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
forma60Schema.methods.restore = function(userId) {
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
forma60Schema.methods.restoreToVersion = function(historyIndex, userId) {
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

module.exports = mongoose.model('Forma60', forma60Schema);
