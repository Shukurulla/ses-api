const mongoose = require('mongoose');

/**
 * ParsedData Model
 * PDF fayllardan parse qilingan ma'lumotlarni saqlash uchun
 * 3 xil PDF type mavjud: type1, type2, type3
 */

const parsedDataSchema = new mongoose.Schema({
  // PDF type (type1, type2, type3)
  pdfType: {
    type: String,
    required: true,
    enum: ['type1', 'type2', 'type3'],
    index: true
  },

  // Bog'langan Forma60 ID (agar mavjud bo'lsa)
  forma60: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Forma60',
    index: true
  },

  // Bog'langan Karta ID (agar mavjud bo'lsa)
  karta: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Karta',
    index: true
  },

  // Raw PDF text (to'liq matn)
  rawText: {
    type: String,
    required: true
  },

  // Parse qilingan ma'lumotlar (label-value massivi)
  // Har bir type uchun alohida structure
  parsedFields: [{
    label: {
      type: String,
      required: true
    },
    value: {
      type: mongoose.Schema.Types.Mixed, // String, Number, Object, Array bo'lishi mumkin
      default: ''
    }
  }],

  // PDF metadata
  metadata: {
    numPages: Number,
    pdfInfo: mongoose.Schema.Types.Mixed
  },

  // PDF fayl ma'lumotlari
  pdfFile: {
    originalName: String,
    fileName: String, // Serverda saqlangan fayl nomi
    filePath: String, // Fayl yo'li
    fileSize: Number, // Bytes
    mimeType: String,
    uploadDate: {
      type: Date,
      default: Date.now
    }
  },

  // Parse qilish holati
  parseStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'completed'
  },

  // Parse qilish xatoliklari (agar bo'lsa)
  parseErrors: [{
    field: String,
    message: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],

  // Validatsiya natijalari (Forma60/Karta bilan solishtirish)
  validation: {
    isValidated: {
      type: Boolean,
      default: false
    },
    hasWarnings: {
      type: Boolean,
      default: false
    },
    issues: [{
      field: String,
      forma60Value: mongoose.Schema.Types.Mixed,
      pdfValue: mongoose.Schema.Types.Mixed,
      message: String
    }],
    warnings: [{
      field: String,
      forma60Value: mongoose.Schema.Types.Mixed,
      pdfValue: mongoose.Schema.Types.Mixed,
      message: String
    }]
  },

  // Kim tomonidan yuklangan
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Kim tomonidan tasdiqlangan (agar tasdiqlangan bo'lsa)
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  verifiedAt: Date,

  // Status (aktiv/arxivlangan)
  status: {
    type: String,
    enum: ['active', 'archived', 'deleted'],
    default: 'active'
  },

  // Izohlar
  notes: String

}, {
  timestamps: true, // createdAt, updatedAt avtomatik qo'shiladi
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
parsedDataSchema.index({ createdAt: -1 });
parsedDataSchema.index({ 'pdfFile.uploadDate': -1 });
parsedDataSchema.index({ uploadedBy: 1, createdAt: -1 });

// Virtual: Parse qilingan ma'lumotlarni object ko'rinishida qaytarish
parsedDataSchema.virtual('parsedData').get(function() {
  if (!this.parsedFields || this.parsedFields.length === 0) {
    return {};
  }

  const data = {};
  this.parsedFields.forEach(field => {
    data[field.label] = field.value;
  });
  return data;
});

// Method: Forma60 bilan validatsiya qilish
parsedDataSchema.methods.validateWithForma60 = async function(forma60) {
  const issues = [];
  const warnings = [];

  // Ism tekshirish
  const fullNameField = this.parsedFields.find(f => f.label === 'F.I.SH' || f.label === 'Familiyasi, ismi, otasining ismi');
  if (fullNameField && forma60.fullName) {
    if (fullNameField.value.toLowerCase() !== forma60.fullName.toLowerCase()) {
      warnings.push({
        field: 'fullName',
        forma60Value: forma60.fullName,
        pdfValue: fullNameField.value,
        message: 'Ismlar mos kelmayapti'
      });
    }
  }

  // Kasallangan sana tekshirish
  const illnessDateField = this.parsedFields.find(f => f.label === 'Kasallangan sana' || f.label === 'Kasallangan sanasi');
  if (illnessDateField && forma60.illnessDate) {
    const pdfDate = new Date(illnessDateField.value);
    const forma60Date = new Date(forma60.illnessDate);

    if (Math.abs(pdfDate - forma60Date) > 86400000) { // 1 kun farq
      warnings.push({
        field: 'illnessDate',
        forma60Value: forma60.illnessDate,
        pdfValue: illnessDateField.value,
        message: 'Kasallangan sanalar mos kelmayapti'
      });
    }
  }

  // Validatsiya natijalarini saqlash
  this.validation = {
    isValidated: true,
    hasWarnings: warnings.length > 0,
    issues: issues,
    warnings: warnings
  };

  await this.save();

  return {
    isValid: issues.length === 0,
    hasWarnings: warnings.length > 0,
    issues,
    warnings
  };
};

// Static method: Type bo'yicha statistika
parsedDataSchema.statics.getStatsByType = async function() {
  return await this.aggregate([
    {
      $group: {
        _id: '$pdfType',
        count: { $sum: 1 },
        completed: {
          $sum: { $cond: [{ $eq: ['$parseStatus', 'completed'] }, 1, 0] }
        },
        failed: {
          $sum: { $cond: [{ $eq: ['$parseStatus', 'failed'] }, 1, 0] }
        }
      }
    },
    {
      $project: {
        type: '$_id',
        count: 1,
        completed: 1,
        failed: 1,
        _id: 0
      }
    }
  ]);
};

// Static method: Forma60 bilan bog'lanmagan parse qilingan ma'lumotlar
parsedDataSchema.statics.getUnlinkedData = async function(limit = 50) {
  return await this.find({
    forma60: null,
    karta: null,
    status: 'active',
    parseStatus: 'completed'
  })
  .populate('uploadedBy', 'fullName email')
  .sort({ createdAt: -1 })
  .limit(limit);
};

const ParsedData = mongoose.model('ParsedData', parsedDataSchema);

module.exports = ParsedData;
