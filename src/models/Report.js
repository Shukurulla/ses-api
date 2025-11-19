const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Hisobot nomi talab qilinadi'],
      trim: true
    },
    type: {
      type: String,
      enum: ['kunlik', 'haftalik', 'oylik', 'choraklik', 'yillik', 'maxsus'],
      required: [true, 'Hisobot turi talab qilinadi']
    },
    category: {
      type: String,
      enum: ['kasallik', 'hudud', 'umumiy', 'maxsus'],
      default: 'umumiy'
    },
    startDate: {
      type: Date,
      required: [true, 'Boshlanish sanasi talab qilinadi']
    },
    endDate: {
      type: Date,
      required: [true, 'Tugash sanasi talab qilinadi']
    },
    format: {
      type: String,
      enum: ['pdf', 'xlsx', 'docx', 'csv'],
      default: 'pdf'
    },
    status: {
      type: String,
      enum: ['yaratilmoqda', 'tayyor', 'xatolik'],
      default: 'tayyor'
    },
    data: {
      totalCases: { type: Number, default: 0 },
      activeCases: { type: Number, default: 0 },
      recovered: { type: Number, default: 0 },
      deaths: { type: Number, default: 0 },
      newCases: { type: Number, default: 0 },
      investigations: { type: Number, default: 0 },
      disinfections: { type: Number, default: 0 },
      districts: [String],
      diseases: [String]
    },
    fileUrl: {
      type: String
    },
    fileSize: {
      type: Number
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    isDeleted: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Index for faster queries
reportSchema.index({ type: 1, status: 1, createdAt: -1 });
reportSchema.index({ createdBy: 1 });
reportSchema.index({ startDate: 1, endDate: 1 });

// Query middleware to exclude soft deleted documents
reportSchema.pre(/^find/, function(next) {
  this.where({ isDeleted: { $ne: true } });
  next();
});

module.exports = mongoose.model('Report', reportSchema);
