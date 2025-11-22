const mongoose = require('mongoose');

// Aloqada bo'lgan shaxslar schema
const contactPersonSchema = new mongoose.Schema({
  fullName: { type: String }, // F.I.O (To'liq ism)
  contactType: {
    type: String,
    enum: ['oila', 'ish', 'do\'st', 'boshqa']
  },
  occupation: { type: String }, // Ishi (kasbiy faoliyat)
  isFamily: { type: Boolean, default: false } // Oila a'zosimi
});

const forma60Schema = new mongoose.Schema({
  // Forma raqami - Avtomatik generatsiya qilinadi
  formNumber: { type: String, unique: true, sparse: true },

  // 1. Ism Familiya Otasining ismi
  fullName: { type: String, trim: true },

  // 2. Tug'ilgan sanasi
  birthDate: { type: Date },
  age: Number, // Avtomatik hisoblanadi

  // Identifikatsiya hujjati (Pasport / JSHSHIR / Metrika)
  identification: {
    type: {
      type: String,
      enum: ['pasport', 'jshshir', 'metrika', 'boshqa'],
    },
    pasportSeries: { type: String }, // Pasport seriya (AA/AB...)
    pasportNumber: { type: String }, // Pasport raqami
    jshshir: { type: String }, // JSHSHIR (14 xonali)
    metrikaNumber: { type: String }, // Tug'ilganlik haqida guvohnoma
    otherDocument: { type: String } // Boshqa hujjat
  },

  // Qaysi poliklinikadan kelgan
  polyclinic: {
    name: { type: String }, // Poliklinika nomi
    district: { type: String }, // Tuman/shahar
    referralDate: { type: Date } // Yuborilgan sana
  },

  // 3. Yashash manzili & 12. Aymaqlar (MFY/OFY)
  address: {
    mahalla: { type: mongoose.Schema.Types.ObjectId, ref: 'District' }, // Mahalla ID (nukus_districts.json dan)
    fullAddress: { type: String }, // Yashash manzili - to'liq manzil qo'lda kiritiladi
    location: {
      type: { type: String, enum: ['Point'] },
      coordinates: [Number] // [longitude, latitude]
    }
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

  // 11. Aloqada bo'lgan shaxslar soni (faqat son)
  contactsCount: { type: Number, default: 0 }, // Aloqada bo'lganlar soni

  // 11. Aloqada bo'lgan shaxslar (eski - endi ishlatilmaydi, lekin compatibility uchun qoldirilgan)
  contactedPersons: [contactPersonSchema],

  // 11.1 PDF dan olingan kontaktlar va ularning holati
  contactsStatus: [{
    name: String, // PDF dan olingan FIO
    age: Number, // PDF dan olingan yosh
    address: String, // PDF dan olingan manzil
    workCharacter: String, // PDF dan - ish xarakteri
    workLocation: String, // PDF dan - ish joyi
    diseaseStatus: {
      type: String,
      enum: ['pending', 'disease_found', 'no_disease'],
      default: 'pending'
    },
    checkedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    checkedAt: Date,
    notes: String // Qo'shimcha eslatmalar
  }],

  // 12. Bemor holati (o'qiydi yoki ishlaydi)
  patientStatus: {
    type: String,
    enum: ['oqiydi', 'ishlaydi', 'boshqa']
  },
  // Agar o'qiydi bo'lsa:
  educationType: {
    type: String,
    enum: ['detsat', 'maktab', 'universitet', 'texnikum', 'kolej']
  },
  // Agar ishlaydi bo'lsa:
  workType: {
    type: String,
    enum: ['medic', 'restoran', 'suv', 'boshqa']
  },

  // 13. Yuqish omili va manbai
  infectionSource: {
    type: String,
    enum: [
      'Turar joyida',
      'Ish joyida',
      'Talim muassasasida',
      'Sayohat paytida',
      'Jamoat joyida',
      'Noma\'lum',
      'Boshqa'
    ]
  },
  transmissionFactor: {
    type: String,
    enum: [
      'Suv',
      'Oziq-ovqat',
      'Sut mahsulotlari',
      'Gosht mahsulotlari',
      'Baliq',
      'Salat',
      'Meva va sabzavot',
      'Parranda va tuxum',
      'Tortlar va kremli mahsulotlar',
      'Muzqaymoq',
      'Bolalar uchun ozuqa',
      'Kontakt yoli',
      'Havo-tomchi yoli',
      'Qon, zardoba, plazma',
      'Hayvon xomashyosi',
      'Hayvon otkazuvchi',
      'Maishiy muloqot',
      'Boshqa'
    ]
  },
  foodCategory: String, // Agar oziq-ovqat bo'lsa - aniq kategoriya
  foodLocation: {
    type: String,
    enum: ['umumiy_ovqatlanish', 'uyda', 'boshqa']
  }, // Qayerda tayyorlangan

  // 14. Qayerga jo'natildi (Referral)
  referralType: {
    type: String,
    enum: ['Infeksiya', 'Bolnitsa', 'Ekstren', 'Poliklinika', 'Boshqa']
  },
  referralClinic: {
    // Poliklinika tanlanganda ses_database.json dan olingan ma'lumot
    institutionType: String, // "Поликлиника"
    fullName: String, // To'liq ism
    username: String,
    phoneNumber: String,
    institutionName: String, // Poliklinika nomi
    address: String,
    landmark: String,
    latitude: Number,
    longitude: Number
  },

  // 15. Oziq-ovqat tekshiruvi (Oziq-ovqat tekshiruvchi tomonidan)
  foodInspection: {
    water: { type: Boolean, default: null },
    meat: { type: Boolean, default: null },
    milk: { type: Boolean, default: null },
    fish: { type: Boolean, default: null },
    vegetables: { type: Boolean, default: null },
    fruits: { type: Boolean, default: null },
    eggs: { type: Boolean, default: null },
    cakes: { type: Boolean, default: null },
    iceCream: { type: Boolean, default: null },
    babyFood: { type: Boolean, default: null },
    other: String,
    inspectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    inspectedAt: Date,
    notes: String
  },

  // 16. Laboratoriya natijalari (7-jadval uchun)
  laboratoryResults: {
    confirmed: { type: Boolean, default: false }, // Laboratorda tasdiqlandi
    cultureType: {
      type: String,
      enum: [
        // Salmonellyoz uchun
        'Salmonella tifimurium',
        'Salmonella enteriditis',
        'Salmonella arizona',
        'Salmonella nyuport',
        // Ich burug' uchun
        'Fleksner shigellasi',
        'Nyukasl shigellasi',
        'Zonne shigellasi',
        'Grigorev-Shiga shigellasi',
        'Iersiniya',
        'SPP',
        'Boyda',
        // O'YuIK uchun
        'EPKP',
        'Citrobakter',
        'Enterobakter',
        'Klebsiella',
        'Serraciya',
        'Gafniya',
        'Enterokokk',
        'Protey',
        'E.coli',
        'Edvardsiella',
        'Stafilokokk',
        'Ko\'k yiring tayoqchasi',
        'Rotavirus',
        'Boshqa'
      ]
    },
    testDate: Date,
    notes: String
  },

  // 17. O'choq ma'lumotlari
  outbreak: {
    outbreakNumber: String, // O'choq raqami
    locationType: {
      type: String,
      enum: ['uyda', 'MTT', 'maktab', 'DPM', 'umumiy_ovqatlanish', 'boshqa']
    },
    relatedCases: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Forma60' }] // Shu o'choqdagi boshqa bemorlar
  },

  // 13. Epidemiolog (faqat ism-familiya)
  epidemiologistName: { type: String }, // Faqat ism-familiya

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

  // 16. Karta toldiruvchi shaxslarga biriktirish (bir nechta)
  assignedToCardFillers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  // Eski field - backward compatibility uchun
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

// Forma raqamini avtomatik generatsiya qilish
forma60Schema.pre('save', async function(next) {
  // Yangi forma yaratilganda va raqam yo'q bo'lsa
  if (this.isNew && !this.formNumber) {
    try {
      const currentYear = new Date().getFullYear();

      // Joriy yildagi oxirgi formani topish
      const lastForm = await this.constructor.findOne({
        formNumber: new RegExp(`^F60-${currentYear}-`)
      }).sort({ formNumber: -1 });

      let nextNumber = 1;
      if (lastForm && lastForm.formNumber) {
        const lastNumber = parseInt(lastForm.formNumber.split('-')[2]);
        nextNumber = lastNumber + 1;
      }

      // Format: F60-YYYY-NNNN (masalan: F60-2024-0001)
      this.formNumber = `F60-${currentYear}-${String(nextNumber).padStart(4, '0')}`;
    } catch (error) {
      console.error('Forma raqami generatsiyasida xatolik:', error);
    }
  }

  // Yosh avtomatik hisoblanadi
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

// Geospatial indexes
forma60Schema.index({ 'address.location': '2dsphere' });
forma60Schema.index({ 'workplace.location': '2dsphere' });

module.exports = mongoose.model('Forma60', forma60Schema);
