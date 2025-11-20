const mongoose = require('mongoose');

const kartaSchema = new mongoose.Schema({
  // Forma60 ga reference
  forma60: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Forma60',
    required: true
  },

  // PDF turi (1.pdf, 2.pdf, 3.pdf)
  pdfType: {
    type: String,
    enum: ['type1', 'type2', 'type3'],
    required: true
  },

  // Yuklangan PDF fayl
  uploadedPdf: {
    filename: String,
    originalName: String,
    path: String,
    mimetype: String,
    size: Number,
    uploadedAt: { type: Date, default: Date.now }
  },

  // PDF dan parse qilingan ma'lumotlar - Type 1 (Yuqumli va Parazitar Kasalliklar)
  type1Data: {
    caseNumber: String,
    patientInfo: {
      fullName: String,
      gender: String,
      birthDate: Date,
      permanentAddress: {
        region: String,
        district: String,
        neighborhood: String,
        street: String,
        house: String,
        apartment: String
      },
      currentAddress: {
        region: String,
        district: String,
        neighborhood: String,
        street: String,
        house: String,
        apartment: String
      },
      workplace: String,
      lastWorkplaceVisit: Date
    },
    medicalInfo: {
      primaryDiagnosis: String,
      diseaseAgent: String,
      patientOrigin: String, // shu yerlik, boshqa joydan kelgan
      illnessDate: Date,
      contactDate: Date,
      emergencyNotificationDate: Date,
      hospitalizationDate: Date,
      finalDiagnosisDate: Date,
      hospital: String,
      transportType: String,
      homeRetentionReason: String,
      lateHospitalizationReason: String,
      labTestConducted: Boolean,
      lastVaccination: {
        type: String,
        preparat: String,
        series: String,
        date: Date,
        dose: String
      }
    },
    epidemiologicalInfo: {
      presumedInfectionPeriod: {
        from: Date,
        to: Date
      },
      unfavorableConditions: [{
        type: String,
        location: String,
        season: String
      }],
      possibleSources: [{
        fullName: String,
        diagnosis: String,
        contactTime: String,
        contactLocation: String,
        contactNature: String,
        donorAddress: String,
        testResult: String
      }],
      foodAndWaterData: [{
        name: String,
        obtainedLocation: Date,
        usedLocation: Date,
        storageConditions: String,
        qualityInfo: String
      }]
    },
    sanitaryInfo: {
      housingType: String,
      density: {
        people: Number,
        rooms: Number,
        area: Number
      },
      waterSupply: String,
      wasteDisposal: String,
      solidWasteDisposal: String,
      sanitaryCondition: {
        rooms: String,
        yard: String,
        area: String
      },
      pests: {
        lice: Boolean,
        otherInsects: Boolean,
        rodents: Boolean
      },
      diseaseFactors: String
    },
    workplaceInfo: {
      objectNames: [String],
      sanitaryCompliance: {
        density: String,
        separation: String,
        waterSupply: String,
        sewerage: String,
        sanitaryCondition: String,
        foodStorage: String,
        foodPreparation: String
      },
      diseaseFactors: String
    },
    contacts: [{
      fullName: String,
      age: Number,
      address: String,
      workCharacter: String,
      workLocation: String,
      vaccinationInfo: String,
      restrictionMeasures: String
    }],
    preventiveMeasures: {
      community: {
        name: String,
        address: String,
        contactCount: Number,
        prophylaxisNeeded: Number,
        prophylaxisTreated: Number,
        labTestConducted: Number,
        found: {
          patients: Number,
          carriers: Number,
          foundDate: Date
        }
      },
      additionalMeasures: [{
        notification: String,
        nextDiseasePrevention: {
          date: Date,
          preparat: String,
          dose: String,
          series: String
        },
        labTest: {
          date: Date,
          result: String,
          receivedDate: Date
        },
        observation: String
      }]
    },
    disinfectionMeasures: [{
      measure: String,
      preparatType: String,
      time: {
        home: Date,
        work: Date
      },
      executor: String,
      controlResult: String
    }],
    conclusion: {
      infectionLocation: String,
      infectionPlace: String,
      sourceType: {
        notFound: Boolean,
        human: {
          fullName: String,
          diseaseStage: String
        },
        animal: String
      },
      mainFactor: String, // 01-22 codes
      diseaseConditions: String,
      outbreakCases: {
        home: String,
        workStudyPlace: String
      }
    },
    submittedToStatistics: Date,
    epidemiologist: String
  },

  // PDF dan parse qilingan ma'lumotlar - Type 2 (Sil kasalligi)
  type2Data: {
    fullName: String,
    permanentAddress: {
      region: String,
      district: String,
      neighborhood: String,
      street: String,
      house: String,
      apartment: String
    },
    currentAddress: {
      region: String,
      district: String,
      neighborhood: String,
      street: String,
      house: String,
      apartment: String
    },
    birthDate: Date,
    profession: String,
    workplace: String,
    illnessDate: Date,
    dispensaryRegistration: {
      date: Date,
      dispensaryName: String
    },
    diagnosisAtRegistration: String,
    firstIsolationDate: Date,
    mbtIsolationMethod: String,
    registrationDate: Date,
    registeredBy: String,
    hospitalizationDate: Date,
    hospitalName: String,
    finalDisinfectionDate: Date,
    homeRetentionReason: String,
    dischargeDate: Date,
    vaccination: {
      name: String,
      series: String,
      date: Date,
      dose: String
    },
    lastXrayInfo: {
      date: Date,
      location: String,
      result: String
    },
    previousTbHistory: {
      hadBefore: Boolean,
      where: String,
      when: Date,
      diagnosis: String,
      dispensaryGroup: String
    },
    convertedFromClosed: {
      converted: Boolean,
      fromGroup: String
    },
    lastTwoYearsScreening: [Date],
    retreatmentDates: {
      dates: [Date],
      duration: String
    },
    workSuspensionDate: Date,
    notificationToWorkplace: {
      date: Date,
      receivedBy: String
    },
    notificationToClinic: Date,
    nutrition: String,
    workplaceConditions: String,
    familyBudget: String,
    harmfulHabits: [String],
    possibleSource: {
      contactWithTb: Boolean,
      sourceName: String,
      contactTime: String,
      contactDuration: String
    },
    housingConditions: {
      type: String,
      rooms: Number,
      floors: Number,
      elevator: Boolean,
      occupants: {
        total: Number,
        familyMembers: Number,
        adults: Number,
        teenagers: Number,
        under14: Number,
        pregnant: Number,
        foodWorkers: Number
      },
      roomsOccupied: Number,
      roomArea: Number,
      totalArea: Number,
      isolatedRoomArea: Number,
      peopleInRoom: Number,
      childrenInRoom: Number,
      apartmentCondition: String,
      heating: String,
      sewerage: String,
      ventilation: String,
      repairNeeded: Boolean,
      suitableForLiving: String,
      housingImprovedYear: Number,
      oldHousingConditions: String
    },
    sanitaryHygiene: {
      coughEtiquette: Boolean,
      sputumContainer: {
        has: Boolean,
        count: Number,
        usedAt: {
          work: Boolean,
          home: Boolean,
          public: Boolean
        }
      },
      sputumDisinfection: String,
      disinfectedBy: String,
      receivesDisinfectant: Boolean,
      disinfectantProvider: String,
      monthlyAmount: Number,
      nurseVisitFrequency: String,
      doctorVisitFrequency: String
    },
    contactMonitoring: [{
      fullName: String,
      birthDate: Date,
      relationship: String,
      workplace: String,
      notificationSent: {
        to: String,
        receivedBy: String
      },
      diagnosisDate: Date,
      status: String
    }],
    rehabilitationPlan: [{
      measure: String,
      startDate: Date,
      endDate: Date
    }],
    epidemiologist: String
  },

  // PDF dan parse qilingan ma'lumotlar - Type 3 (Qisqacha forma)
  type3Data: {
    facilityName: String,
    caseNumber: String,
    primaryDiagnosis: String,
    diseaseAgent: String,
    patientOrigin: String,
    fullName: String,
    gender: String,
    birthDate: Date,
    permanentAddress: {
      region: String,
      district: String,
      neighborhood: String,
      street: String,
      house: String,
      apartment: String
    },
    currentAddress: {
      region: String,
      district: String,
      neighborhood: String,
      street: String,
      house: String,
      apartment: String
    },
    workplace: String,
    lastWorkplaceVisit: Date,
    medicalFacility: {
      region: String,
      district: String,
      polyclinic: String
    },
    reportReceived: Date,
    referredBy: String,
    initialSymptoms: String,
    patientDetection: String,
    epidemiologicalInspection: {
      date: Date,
      endDate: Date
    },
    dates: {
      illness: Date,
      contact: Date,
      emergencyNotification: Date,
      hospitalization: Date,
      finalDiagnosis: Date
    },
    hospital: String,
    transportType: String,
    homeRetention: String,
    lateHospitalizationReason: String,
    labTestConducted: Boolean,
    lastVaccination: {
      type: String,
      preparat: String,
      series: String,
      date: Date,
      dose: String
    },
    presumedInfectionPeriod: {
      from: Date,
      to: Date
    },
    unfavorableConditions: [{
      type: String,
      location: String,
      season: String
    }],
    housingConditions: {
      type: String,
      density: {
        people: Number,
        rooms: Number,
        area: Number
      },
      waterSupply: String,
      wasteDisposal: String,
      solidWasteDisposal: String,
      sanitaryCondition: {
        rooms: String,
        yard: String,
        area: String
      },
      pests: {
        lice: Boolean,
        otherInsects: Boolean,
        rodents: Boolean
      },
      diseaseFactors: String
    },
    disinfectionMeasures: [{
      measure: String,
      preparatType: String,
      time: {
        home: Date,
        work: Date
      },
      executor: String,
      controlResult: String
    }],
    conclusion: {
      infectionLocation: String,
      infectionPlace: String,
      mainFactor: String,
      diseaseConditions: String,
      outbreakCases: {
        home: String,
        workPlace: String
      }
    },
    submittedToStatistics: Date,
    epidemiologist: String
  },

  // Forma60 ma'lumotlari bilan birlashtirilgan holat
  mergedData: mongoose.Schema.Types.Mixed,

  // Soft delete va history tracking
  isDeleted: { type: Boolean, default: false },
  deletedAt: Date,
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // Kimlar tomonidan yaratilgan/o'zgartirilgan
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // O'zgarishlar tarixi
  editHistory: [{
    editedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    editedAt: { type: Date, default: Date.now },
    changes: mongoose.Schema.Types.Mixed,
    previousData: mongoose.Schema.Types.Mixed,
    action: { type: String, enum: ['created', 'updated', 'restored', 'deleted'] }
  }]
}, {
  timestamps: true
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

// Soft delete uchun query middleware
kartaSchema.pre(/^find/, function(next) {
  this.where({ isDeleted: false });
  next();
});

kartaSchema.pre('countDocuments', function(next) {
  this.where({ isDeleted: false });
  next();
});

// Soft delete metodi
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

// Restore metodi
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

// Ma'lum bir vaqtdagi holatga qaytarish
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
