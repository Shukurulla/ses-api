const mongoose = require('mongoose');

const contactedDoctorSchema = new mongoose.Schema({
  doctorName: { type: String, required: true },
  doctorPhone: String,
  contactDate: Date,
  contactType: {
    type: String,
    enum: ['konsultatsiya', 'davolash', 'tashxis', 'boshqa'],
    default: 'konsultatsiya'
  },
  hospital: String,
  notes: String
});

const patientSchema = new mongoose.Schema({
  // Shaxsiy ma'lumotlar
  fullName: { type: String, required: true, trim: true },
  gender: { type: String, enum: ['erkak', 'ayol'], required: true },
  birthDate: { type: Date, required: true },
  age: Number, // Avtomatik hisoblanadi
  phone: { type: String, required: true },

  // Manzil ma'lumotlari
  district: { type: String, required: true }, // nukus_districts.json dan
  neighborhood: { type: String, required: true }, // nukus_districts.json dan
  registrationAddress: { type: String, required: true },
  actualAddress: String,
  coordinates: {
    lat: Number,
    lng: Number
  },

  // Ish joyi / O'qish joyi
  workplace: {
    name: String,
    address: String,
    lastVisitDate: Date // 6-talabga javob: Oxirgi marta qachon bordi
  },
  studyPlace: {
    name: String,
    address: String,
    lastVisitDate: Date // 6-talabga javob
  },
  profession: String,

  // Tashxis ma'lumotlari
  diagnosis: {
    type: String,
    required: true,
    default: 'Gepatit' // 5-talabga javob: Faqat "Gepatit" bo'ladi, A, B yo'q
  },
  icd10Code: String,
  illnessDate: Date,
  symptomsStartDate: Date,
  diagnosisDate: Date,
  diseaseNature: {
    type: String,
    enum: ['o\'tkir', 'surunkali', 'qayta'],
    default: 'o\'tkir'
  },
  severity: {
    type: String,
    enum: ['engil', 'o\'rta', 'og\'ir', 'tanqidiy'],
    default: 'o\'rta'
  },
  status: {
    type: String,
    enum: ['shubha', 'tasdiqlangan', 'davolanmoqda', 'tuzalgan', 'vafot etgan'],
    default: 'shubha'
  },

  // 8-talabga javob: Qayerdan kelgani
  referralSource: {
    type: String,
    enum: ['Infeksionniy', 'Ekstrenniy', 'Poliklinika'],
    required: true
  },
  referralClinic: { // Agar poliklinikadan kelgan bo'lsa
    type: String
  },

  // 1-talabga javob: Aloqa bo'lgan shifokorlar
  contactedDoctors: [contactedDoctorSchema],

  // Laboratoriya ma'lumotlari
  labTests: [{
    // 2-talabga javob: Multi-select tahlil turi
    testTypes: [{
      type: String,
      enum: ['PTsR', 'Umumiy qon tahlili', 'Biokimyoviy tahlil',
             'Serologik tahlil', 'Bakteriologik tahlil', 'Immunologik tahlil']
    }],
    materialDate: Date,
    resultDate: Date,
    result: { type: String, enum: ['ijobiy', 'salbiy', 'shubhali', 'kutilmoqda'] },
    laboratory: String,

    // 3-talabga javob: Kultura nomi va turi
    culture: {
      name: { type: String, enum: ['virus', 'bakteriya', 'zamburug', 'parazit', 'boshqa'] },
      specificType: String, // Virus yoki bakteriya turi
      concentration: String,
      antibioticSensitivity: String
    },

    // 7-talabga javob: Gepatit uchun normallar
    hepatitisNormals: {
      hpt: { type: Number, default: 35 }, // Fokal ochag gepatit normali
      alt: Number,
      ast: Number,
      bilirubin: Number
    },

    notes: String
  }],

  // Epidemiologik anamnez
  epidemiologicalAnamnesis: {
    territoryExit: { type: Boolean, default: false },
    exitCountry: String,
    exitDates: {
      from: Date,
      to: Date
    },
    contactWithInfected: { type: Boolean, default: false },
    suspiciousProducts: { type: Boolean, default: false },
    productDetails: String,
    riskFactors: [String]
  },

  // Gospitalizatsiya
  hospitalization: {
    isHospitalized: { type: Boolean, default: false },
    hospitalName: String,
    hospitalizationDate: Date,
    dischargeDate: Date,
    ward: String,
    bedNumber: String
  },

  // Vaksinatsiya
  vaccinations: [{
    vaccineName: String,
    vaccineDate: Date,
    dose: Number,
    nextDoseDate: Date
  }],

  // Kontaktlar
  contacts: [{
    fullName: String,
    phone: String,
    address: String,
    contactLevel: {
      type: String,
      enum: ['oila', 'hamkasblar', 'do\'stlar', 'boshqa']
    },
    contactDate: Date,
    status: {
      type: String,
      enum: ['kuzatuv ostida', 'kasallangan', 'sog\'lom'],
      default: 'kuzatuv ostida'
    }
  }],

  // Soft delete uchun
  isDeleted: { type: Boolean, default: false },
  deletedAt: Date,
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // Kimlar tomonidan yaratilgan/o'zgartirilgan
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true // createdAt, updatedAt avtomatik
});

// 4-talabga javob: Yosh avtomatik hisoblanadi
patientSchema.pre('save', function(next) {
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

// 11-talabga javob: Soft delete uchun query middleware
patientSchema.pre(/^find/, function(next) {
  this.where({ isDeleted: false });
  next();
});

patientSchema.pre('countDocuments', function(next) {
  this.where({ isDeleted: false });
  next();
});

// Soft delete metodi
patientSchema.methods.softDelete = function(userId) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = userId;
  return this.save();
};

// To'liq o'chirish metodi (faqat admin uchun)
patientSchema.methods.forceDelete = function() {
  return this.remove();
};

// Tiklash metodi
patientSchema.methods.restore = function() {
  this.isDeleted = false;
  this.deletedAt = undefined;
  this.deletedBy = undefined;
  return this.save();
};

module.exports = mongoose.model('Patient', patientSchema);
