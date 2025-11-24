const mongoose = require('mongoose');

/**
 * KARTA MODEL - TO'LIQ QO'LDA TO'LDIRISH TIZIMI
 * PDF parsing olib tashlandi
 * Barcha maydonlar karta toldiruvchi tomonidan qo'lda kiritiladi
 */

const kartaSchema = new mongoose.Schema({
  // Forma60 ga reference
  forma60: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Forma60',
    required: true
  },

  // ========================================
  // QO'LDA TO'LDIRILGAN MAYDONLAR
  // ========================================

  // 1. KASB MA'LUMOTLARI (Majburiy)
  patientStatus: {
    type: String,
    enum: ['oqiydi', 'ishlaydi', 'boshqa'],
    required: true
  },

  // Agar "oqiydi" tanlangan bo'lsa
  educationType: {
    type: String,
    enum: ['detsat', 'maktab', 'universitet', 'texnikum', 'kolej']
  },

  // Agar "ishlaydi" tanlangan bo'lsa
  workType: {
    type: String,
    enum: ['medic', 'restoran', 'suv', 'boshqa']
  },

  // 2. YUQISH OMILI (Majburiy)
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
    ],
    required: true
  },

  // 3. YUQISH JOYI (Majburiy)
  infectionSource: {
    type: String,
    enum: [
      'Uyda',
      'MTT',
      'Maktab',
      'DPM',
      'Umumiy ovqatlanish korxonalari',
      'Boshqa'
    ],
    required: true
  },

  // 4. LABORATORIYA NATIJALARI (Majburiy)
  laboratoryResults: {
    // Laboratoriya tasdiqlandi yoki yo'q
    confirmed: {
      type: Boolean,
      required: true,
      default: false
    },

    // Kasallik turi (diagnozga qarab)
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
      ],
      required: true
    },

    // Tekshiruv sanasi
    testDate: Date,

    // Izoh
    notes: String
  },

  // 5. O'CHOQ MA'LUMOTLARI (Ixtiyoriy)
  outbreak: {
    // O'choq bor yoki yo'q
    hasOutbreak: {
      type: Boolean,
      default: false
    },

    // O'choq raqami
    outbreakNumber: String,

    // O'choq joyi
    locationType: {
      type: String,
      enum: ['uyda', 'MTT', 'maktab', 'DPM', 'umumiy_ovqatlanish', 'boshqa']
    },

    // Shu o'choqdagi boshqa bemorlar
    relatedCases: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Forma60'
    }]
  },

  // 6. KONTAKTLAR (Ixtiyoriy)
  contactsStatus: [{
    // F.I.Sh (To'liq ism)
    name: {
      type: String,
      required: true
    },

    // Tug'ilgan sanasi
    birthDate: Date,

    // Qarindoshlik darajasi
    relationshipDegree: String,

    // Ish yoki o'qish joyi
    workOrStudyPlace: String,

    // Silga qarshi dispanser tomonidan xabarnoma kim qabul qilgan
    // (ish, o'qish, MTM, DPM va boshqalarga berilgan)
    notificationReceivedBy: String,

    // Holati
    diseaseStatus: {
      type: String,
      enum: ['tekshirilmagan', 'soglom', 'kasal'],
      default: 'tekshirilmagan'
    },

    // Tashxis qo'yilgan sanasi (faqat sog'lom yoki kasal bo'lsa)
    diagnosisDate: Date,

    // Izoh
    notes: String
  }],

  // 7. QO'SHIMCHA MA'LUMOTLAR (Ixtiyoriy)

  // Epidemiolog nomi
  epidemiologistName: String,

  // Umumiy izohlar
  notes: String,

  // ========================================
  // STATUS VA TRACKING
  // ========================================

  // Karta holati
  status: {
    type: String,
    enum: ['draft', 'completed'],
    default: 'draft'
  },

  // Soft delete
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: Date,
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Kim yaratdi/yangiladi
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // O'zgarishlar tarixi
  editHistory: [{
    editedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    editedAt: {
      type: Date,
      default: Date.now
    },
    changes: mongoose.Schema.Types.Mixed,
    previousData: mongoose.Schema.Types.Mixed,
    action: {
      type: String,
      enum: ['created', 'updated', 'restored', 'deleted']
    }
  }]
}, {
  timestamps: true
});

// ========================================
// VALIDATSIYA
// ========================================

// Kasb ma'lumotlarini validatsiya qilish
kartaSchema.pre('save', function(next) {
  // Agar "oqiydi" tanlangan bo'lsa, educationType majburiy
  if (this.patientStatus === 'oqiydi' && !this.educationType) {
    return next(new Error('Ta\'lim turi kiritilishi shart (patientStatus = oqiydi)'));
  }

  // Agar "ishlaydi" tanlangan bo'lsa, workType majburiy
  if (this.patientStatus === 'ishlaydi' && !this.workType) {
    return next(new Error('Ish turi kiritilishi shart (patientStatus = ishlaydi)'));
  }

  // Agar o'choq bor bo'lsa, o'choq raqami va joyi majburiy
  if (this.outbreak?.hasOutbreak) {
    if (!this.outbreak.outbreakNumber) {
      return next(new Error('O\'choq raqami kiritilishi shart'));
    }
    if (!this.outbreak.locationType) {
      return next(new Error('O\'choq joyi tanlanishi shart'));
    }
  }

  next();
});

// O'zgarishlarni history ga saqlash
kartaSchema.pre('save', function(next) {
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
      this.editHistory.push({
        editedBy: this.updatedBy,
        editedAt: new Date(),
        changes: changes,
        previousData: previousData,
        action: 'updated'
      });
    }
  }
  next();
});

// ========================================
// QUERY MIDDLEWARE
// ========================================

// Soft delete uchun
kartaSchema.pre(/^find/, function(next) {
  this.where({ isDeleted: false });
  next();
});

kartaSchema.pre('countDocuments', function(next) {
  this.where({ isDeleted: false });
  next();
});

// deleteOne va deleteMany ni soft delete ga o'tkazish
kartaSchema.pre('deleteOne', { document: false, query: true }, async function(next) {
  const docToDelete = await this.model.findOne(this.getFilter());
  if (docToDelete) {
    this.setUpdate({
      $set: {
        isDeleted: true,
        deletedAt: new Date()
      }
    });
    next();
  } else {
    next();
  }
});

kartaSchema.pre('deleteMany', { document: false, query: true }, async function(next) {
  this.setUpdate({
    $set: {
      isDeleted: true,
      deletedAt: new Date()
    }
  });
  next();
});

// ========================================
// METODLAR
// ========================================

// Soft delete
kartaSchema.methods.softDelete = function(userId) {
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

// Restore
kartaSchema.methods.restore = function(userId) {
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

// Tarixdagi versiyaga qaytarish
kartaSchema.methods.restoreToVersion = function(historyIndex, userId) {
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

module.exports = mongoose.model('Karta', kartaSchema);
