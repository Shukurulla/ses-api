/**
 * History Tracking Middleware
 * Roles.tz talabi: Barcha o'zgarishlarni kuzatish, undo/redo imkoniyati
 */

const historyTracker = {
  /**
   * Document ni save qilishdan oldin original datani saqlash
   * Middleware sifatida ishlatiladi
   */
  trackChanges: () => {
    return async function (req, res, next) {
      // Original datani saqlash uchun
      if (req.body && req.params.id) {
        try {
          const Model = req.model; // Controller dan model berilishi kerak

          if (Model) {
            const original = await Model.findById(req.params.id);
            if (original) {
              req.originalData = original.toObject();
            }
          }
        } catch (error) {
          // Silent fail - agar original data topilmasa davom etadi
          console.error('History tracking error:', error);
        }
      }

      next();
    };
  },

  /**
   * O'zgarishlarni taqqoslash va history objectni yaratish
   * @param {Object} originalData - Asl ma'lumot
   * @param {Object} newData - Yangi ma'lumot
   * @param {string} userId - O'zgartirgan user ID
   * @param {string} action - Amal turi
   * @returns {Object} - History object
   */
  createHistoryEntry: (originalData, newData, userId, action = 'updated') => {
    const changes = {};
    const previousData = {};

    // O'zgargan maydonlarni topish
    for (const key in newData) {
      if (key === 'editHistory' || key === 'updatedAt' || key === '__v') {
        continue; // Bu maydonlarni skip qilamiz
      }

      const originalValue = originalData[key];
      const newValue = newData[key];

      // Agar qiymat o'zgarga nbo'lsa
      if (JSON.stringify(originalValue) !== JSON.stringify(newValue)) {
        changes[key] = newValue;
        previousData[key] = originalValue;
      }
    }

    return {
      editedBy: userId,
      editedAt: new Date(),
      changes: changes,
      previousData: previousData,
      action: action
    };
  },

  /**
   * Ma'lum bir vaqtdagi holatga qaytarish
   * @param {Object} document - Document
   * @param {number} historyIndex - History indexi
   * @returns {Object} - Restored document
   */
  restoreToVersion: async (document, historyIndex) => {
    if (!document.editHistory || document.editHistory.length === 0) {
      throw new Error('No history available');
    }

    if (historyIndex < 0 || historyIndex >= document.editHistory.length) {
      throw new Error('Invalid history index');
    }

    const historyItem = document.editHistory[historyIndex];

    if (!historyItem.previousData) {
      throw new Error('No previous data available for this history entry');
    }

    // Asl holatga qaytarish
    for (const key in historyItem.previousData) {
      document[key] = historyItem.previousData[key];
    }

    return document;
  },

  /**
   * Oxirgi o'zgarishni bekor qilish (undo)
   * @param {Object} document - Document
   * @param {string} userId - User ID
   * @returns {Object} - Restored document
   */
  undo: async (document, userId) => {
    if (!document.editHistory || document.editHistory.length === 0) {
      throw new Error('No history to undo');
    }

    // Oxirgi o'zgarishni topish
    const lastHistory = document.editHistory[document.editHistory.length - 1];

    if (!lastHistory.previousData) {
      throw new Error('Cannot undo: No previous data available');
    }

    // Asl holatga qaytarish
    for (const key in lastHistory.previousData) {
      document[key] = lastHistory.previousData[key];
    }

    // Undo action ni history ga qo'shish
    document.editHistory.push({
      editedBy: userId,
      editedAt: new Date(),
      changes: { action: 'undo' },
      previousData: lastHistory.changes,
      action: 'undo'
    });

    document.updatedBy = userId;

    return document;
  },

  /**
   * Bekor qilingan o'zgarishni qaytarish (redo)
   * @param {Object} document - Document
   * @param {string} userId - User ID
   * @returns {Object} - Restored document
   */
  redo: async (document, userId) => {
    if (!document.editHistory || document.editHistory.length === 0) {
      throw new Error('No history to redo');
    }

    // Oxirgi undo actionni topish
    let undoIndex = -1;
    for (let i = document.editHistory.length - 1; i >= 0; i--) {
      if (document.editHistory[i].action === 'undo') {
        undoIndex = i;
        break;
      }
    }

    if (undoIndex === -1) {
      throw new Error('No undo action to redo');
    }

    const undoHistory = document.editHistory[undoIndex];

    if (!undoHistory.previousData) {
      throw new Error('Cannot redo: No data available');
    }

    // Redo qilish
    for (const key in undoHistory.previousData) {
      document[key] = undoHistory.previousData[key];
    }

    // Redo action ni history ga qo'shish
    document.editHistory.push({
      editedBy: userId,
      editedAt: new Date(),
      changes: undoHistory.previousData,
      previousData: undoHistory.changes,
      action: 'redo'
    });

    document.updatedBy = userId;

    return document;
  },

  /**
   * History ni formatlash (frontend uchun)
   * @param {Array} editHistory - Edit history array
   * @returns {Array} - Formatlangan history
   */
  formatHistory: (editHistory) => {
    return editHistory.map((item, index) => {
      return {
        index: index,
        date: item.editedAt,
        user: item.editedBy,
        action: item.action,
        changedFields: Object.keys(item.changes || {}),
        changeCount: Object.keys(item.changes || {}).length,
        canRestore: item.previousData && Object.keys(item.previousData).length > 0
      };
    });
  },

  /**
   * Ikki version ni taqqoslash
   * @param {Object} version1 - Birinchi version
   * @param {Object} version2 - Ikkinchi version
   * @returns {Object} - Farqlar
   */
  compareVersions: (version1, version2) => {
    const differences = {
      added: {},
      modified: {},
      removed: {}
    };

    // Version 2 da qo'shilgan yoki o'zgargan maydonlar
    for (const key in version2) {
      if (key === 'editHistory' || key === 'updatedAt' || key === '__v' || key === '_id') {
        continue;
      }

      if (!(key in version1)) {
        differences.added[key] = version2[key];
      } else if (JSON.stringify(version1[key]) !== JSON.stringify(version2[key])) {
        differences.modified[key] = {
          from: version1[key],
          to: version2[key]
        };
      }
    }

    // Version 1 da bo'lib Version 2 da yo'q bo'lgan maydonlar
    for (const key in version1) {
      if (key === 'editHistory' || key === 'updatedAt' || key === '__v' || key === '_id') {
        continue;
      }

      if (!(key in version2)) {
        differences.removed[key] = version1[key];
      }
    }

    return differences;
  },

  /**
   * History timeline yaratish (barcha o'zgarishlar bo'yicha)
   * @param {Array} editHistory - Edit history
   * @returns {Array} - Timeline
   */
  createTimeline: (editHistory) => {
    // Field nomlarini o'zbek tiliga tarjima qilish
    const fieldLabels = {
      fullName: 'F.I.Sh',
      birthDate: 'Tug\'ilgan sana',
      age: 'Yosh',
      'address.mahalla': 'Mahalla',
      'address.fullAddress': 'To\'liq manzil',
      workplace: 'Ish joyi',
      illnessDate: 'Kasallangan kuni',
      contactDate: 'Murojat qilingan kun',
      hospitalizationDate: 'Davolashga yotgan sanasi',
      primaryDiagnosis: 'Birlamchi tashxis',
      finalDiagnosis: 'Yakuniy tashxis',
      laboratoryResult: 'Laboratoriya natijasi',
      contactedPersons: 'Aloqada bo\'lgan shaxslar',
      epidemiologist: 'Epidemiolog',
      lastWorkplaceVisit: 'Oxirgi ish joyiga tashrif',
      disinfectionRequired: 'Dezinfeksiya talab qilinadi',
      assignedToCardFiller: 'Karta to\'ldiruvchiga tayinlangan',
      status: 'Holat'
    };

    const timeline = editHistory.map((item, index) => {
      let description = '';

      switch (item.action) {
        case 'created':
          description = 'Yangi yozuv yaratildi';
          break;
        case 'updated':
          // O'zgargan maydonlarni ko'rsatish
          if (item.changes && Object.keys(item.changes).length > 0) {
            const changedFields = Object.keys(item.changes)
              .map(field => fieldLabels[field] || field)
              .join(', ');
            description = `O'zgartirildi: ${changedFields}`;
          } else {
            description = `${Object.keys(item.changes || {}).length} ta maydon o'zgartirildi`;
          }
          break;
        case 'deleted':
          description = 'O\'chirildi';
          break;
        case 'restored':
          description = 'Qayta tiklandi';
          break;
        case 'undo':
          description = 'Oxirgi o\'zgarish bekor qilindi';
          break;
        case 'redo':
          description = 'Bekor qilingan o\'zgarish qaytarildi';
          break;
        case 'accepted':
          description = 'Qabul qilindi';
          break;
        case 'completed':
          description = 'Yakunlandi';
          break;
        case 'cancelled':
          description = 'Bekor qilindi';
          break;
        default:
          description = item.action;
      }

      return {
        index: index,
        date: item.editedAt,
        user: item.editedBy,
        action: item.action,
        description: description,
        changes: item.changes,
        previousData: item.previousData
      };
    });

    // Teskari tartibda (eng yangi birinchi)
    return timeline.reverse();
  }
};

module.exports = historyTracker;
