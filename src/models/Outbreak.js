const mongoose = require('mongoose');

/**
 * Outbreak (O'choq) Model
 * Kasallik o'choqlarini kuzatish uchun
 */

const outbreakSchema = new mongoose.Schema({
  // O'choq raqami - avtomatik generatsiya
  outbreakNumber: {
    type: String,
    unique: true,
    sparse: true
  },

  // Kasallik turi
  diseaseType: {
    type: String,
    enum: ['salmonellyoz', 'ichburug', 'oyuik', 'boshqa'],
    required: true
  },

  // O'choq joylashuvi
  locationType: {
    type: String,
    enum: ['uyda', 'MTT', 'maktab', 'DPM', 'umumiy_ovqatlanish', 'boshqa'],
    required: true
  },

  // Manzil
  address: {
    mahalla: { type: mongoose.Schema.Types.ObjectId, ref: 'District' },
    fullAddress: String,
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: [Number] // [longitude, latitude]
    }
  },

  // Bemorlar soni va ro'yxati
  caseCount: {
    type: Number,
    default: 1
  },
  patients: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Forma60'
  }],

  // O'choq holati
  status: {
    type: String,
    enum: ['aktiv', 'kuzatuvda', 'tugatilgan'],
    default: 'aktiv'
  },

  // Ro'yxatga olingan sana
  registeredDate: {
    type: Date,
    default: Date.now
  },

  // Tugatilgan sana
  closedDate: Date,

  // Epidemiolog ma'lumotlari
  epidemiologist: {
    name: String,
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    inspectionDate: Date
  },

  // Epidemiolog yordamchisi
  epidemiologistAssistant: {
    name: String,
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    inspectionDate: Date
  },

  // Dezinfeksiya
  disinfection: {
    required: { type: Boolean, default: true },
    completed: { type: Boolean, default: false },
    completedDate: Date,
    completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },

  // Kontaktlar
  contactsInfo: {
    totalContacts: { type: Number, default: 0 },
    testedContacts: { type: Number, default: 0 },
    positiveContacts: { type: Number, default: 0 },
    carriersFound: { type: Number, default: 0 }
  },

  // Qo'shimcha ma'lumotlar
  notes: String,

  // Soft delete
  isDeleted: { type: Boolean, default: false },
  deletedAt: Date,
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // Kimlar tomonidan yaratilgan/o'zgartirilgan
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true
});

// Geospatial index
outbreakSchema.index({ 'address.location': '2dsphere' });

// O'choq raqamini avtomatik generatsiya
outbreakSchema.pre('save', async function(next) {
  if (this.isNew && !this.outbreakNumber) {
    try {
      const currentYear = new Date().getFullYear();

      // Joriy yildagi oxirgi o'choqni topish
      const lastOutbreak = await this.constructor.findOne({
        outbreakNumber: new RegExp(`^OCH-${currentYear}-`)
      }).sort({ outbreakNumber: -1 });

      let nextNumber = 1;
      if (lastOutbreak && lastOutbreak.outbreakNumber) {
        const lastNumber = parseInt(lastOutbreak.outbreakNumber.split('-')[2]);
        nextNumber = lastNumber + 1;
      }

      // Format: OCH-YYYY-NNNN (masalan: OCH-2024-0001)
      this.outbreakNumber = `OCH-${currentYear}-${String(nextNumber).padStart(4, '0')}`;
    } catch (error) {
      console.error('O\'choq raqami generatsiyasida xatolik:', error);
    }
  }
  next();
});

// Soft delete uchun query middleware
outbreakSchema.pre(/^find/, function(next) {
  this.where({ isDeleted: false });
  next();
});

outbreakSchema.pre('countDocuments', function(next) {
  this.where({ isDeleted: false });
  next();
});

// Soft delete metodi
outbreakSchema.methods.softDelete = function(userId) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = userId;
  return this.save();
};

module.exports = mongoose.model('Outbreak', outbreakSchema);
