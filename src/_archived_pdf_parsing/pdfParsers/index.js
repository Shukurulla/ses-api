// Use Python-based parsers for better PDF extraction
const {
  Type1PDFParser,
  Type2PDFParser,
  Type3PDFParser
} = require('./pythonParserBridge');

/**
 * PDF Parser Manager
 * 3 xil PDF formatini parse qilish uchun
 */

class PDFParserManager {
  /**
   * PDF ni type bo'yicha parse qilish
   * @param {string} pdfPath - PDF fayl yo'li
   * @param {string} type - PDF turi ('type1', 'type2', 'type3')
   * @returns {Promise<Object>} - Parse qilingan ma'lumotlar
   */
  static async parsePDF(pdfPath, type) {
    switch (type) {
      case 'type1':
        return await Type1PDFParser.parse(pdfPath);

      case 'type2':
        return await Type2PDFParser.parse(pdfPath);

      case 'type3':
        return await Type3PDFParser.parse(pdfPath);

      default:
        throw new Error(`Unsupported PDF type: ${type}. Supported types: type1, type2, type3`);
    }
  }

  /**
   * Forma60 va PDF ma'lumotlarini merge qilish
   * @param {Object} forma60Data - Forma60 dan olingan ma'lumotlar
   * @param {Object} pdfData - PDF dan parse qilingan ma'lumotlar
   * @param {string} pdfType - PDF turi
   * @returns {Object} - Merge qilingan ma'lumotlar
   */
  static mergeWithForma60(forma60Data, pdfData, pdfType) {
    const merged = {
      // Forma60 dan asosiy ma'lumotlar
      forma60: {
        fullName: forma60Data.fullName,
        birthDate: forma60Data.birthDate,
        age: forma60Data.age,
        address: forma60Data.address,
        workplace: forma60Data.workplace,
        illnessDate: forma60Data.illnessDate,
        contactDate: forma60Data.contactDate,
        hospitalizationDate: forma60Data.hospitalizationDate,
        primaryDiagnosis: forma60Data.primaryDiagnosis,
        finalDiagnosis: forma60Data.finalDiagnosis,
        laboratoryResult: forma60Data.laboratoryResult,
        contactedPersons: forma60Data.contactedPersons,
        district: forma60Data.district,
        epidemiologist: forma60Data.epidemiologist,
        lastWorkplaceVisit: forma60Data.lastWorkplaceVisit,
        disinfectionRequired: forma60Data.disinfectionRequired,
        disinfectionStatus: forma60Data.disinfectionStatus
      },
      // PDF dan qo'shimcha ma'lumotlar
      pdf: pdfData.parsed,
      // Type
      pdfType: pdfType,
      // Umumiy ma'lumotlar (validation uchun)
      validation: this.validateMergedData(forma60Data, pdfData.parsed, pdfType)
    };

    return merged;
  }

  /**
   * Merge qilingan ma'lumotlarni validatsiya qilish
   * @param {Object} forma60Data - Forma60 ma'lumotlari
   * @param {Object} pdfData - PDF ma'lumotlari
   * @param {string} pdfType - PDF turi
   * @returns {Object} - Validatsiya natijalari
   */
  static validateMergedData(forma60Data, pdfData, pdfType) {
    const issues = [];
    const warnings = [];

    // Ism tekshirish
    if (forma60Data.fullName && pdfData.fullName) {
      if (forma60Data.fullName.toLowerCase() !== pdfData.fullName.toLowerCase()) {
        warnings.push({
          field: 'fullName',
          forma60Value: forma60Data.fullName,
          pdfValue: pdfData.fullName,
          message: 'Ismlar mos kelmayapti'
        });
      }
    }

    // Tug'ilgan sana tekshirish
    if (forma60Data.birthDate && pdfData.birthDate) {
      const forma60Date = new Date(forma60Data.birthDate).getTime();
      const pdfDate = new Date(pdfData.birthDate).getTime();

      if (forma60Date !== pdfDate) {
        warnings.push({
          field: 'birthDate',
          forma60Value: forma60Data.birthDate,
          pdfValue: pdfData.birthDate,
          message: 'Tug\'ilgan sanalar mos kelmayapti'
        });
      }
    }

    // Kasallangan sana tekshirish
    if (forma60Data.illnessDate && pdfData.illnessDate) {
      const forma60Date = new Date(forma60Data.illnessDate).getTime();
      const pdfDate = new Date(pdfData.illnessDate).getTime();

      if (forma60Date !== pdfDate) {
        warnings.push({
          field: 'illnessDate',
          forma60Value: forma60Data.illnessDate,
          pdfValue: pdfData.illnessDate,
          message: 'Kasallangan sanalar mos kelmayapti'
        });
      }
    }

    // Type-specific validatsiyalar
    if (pdfType === 'type1') {
      // Type 1 uchun maxsus validatsiyalar
      if (!pdfData.patientInfo) {
        issues.push({
          field: 'patientInfo',
          message: 'PDF da bemor ma\'lumotlari topilmadi'
        });
      }
    } else if (pdfType === 'type2') {
      // Type 2 uchun maxsus validatsiyalar
      if (!pdfData.housingConditions) {
        warnings.push({
          field: 'housingConditions',
          message: 'PDF da yashash sharoitlari to\'liq emas'
        });
      }
    } else if (pdfType === 'type3') {
      // Type 3 uchun maxsus validatsiyalar
      if (!pdfData.facilityName) {
        warnings.push({
          field: 'facilityName',
          message: 'PDF da muassasa nomi topilmadi'
        });
      }
    }

    return {
      isValid: issues.length === 0,
      hasWarnings: warnings.length > 0,
      issues: issues,
      warnings: warnings,
      summary: {
        totalIssues: issues.length,
        totalWarnings: warnings.length
      }
    };
  }

  /**
   * PDF type ni avtomatik aniqlash (fayl ichidagi pattern bo'yicha)
   * @param {string} pdfPath - PDF fayl yo'li
   * @returns {Promise<string>} - PDF turi ('type1', 'type2', 'type3')
   */
  static async detectPDFType(pdfPath) {
    const pdfParse = require('pdf-parse');
    const fs = require('fs').promises;

    try {
      const dataBuffer = await fs.readFile(pdfPath);
      const data = await pdfParse(dataBuffer);
      const text = data.text;

      // Type 1: Yuqumli va Parazitar Kasalliklar O'chog'in
      if (text.includes('YUQUMLI VA PARAZITAR KASALLIKLAR O\'CHOG\'IN EPIDEMIOLOGIK TEKSHIRISH KARTASI')) {
        return 'type1';
      }

      // Type 2: Sil Kasalligi
      if (text.includes('SIL KASALLIGINI EPIDEMIOLOGIK TEKSHIRISH VA KUZATISH KARTASI')) {
        return 'type2';
      }

      // Type 3: Qisqacha forma (default)
      if (text.includes('YUQUMLI VA PARAZITAR KASALLIKLAR')) {
        return 'type3';
      }

      // Agar hech qaysi pattern topilmasa, type3 deb hisoblaymiz
      return 'type3';
    } catch (error) {
      throw new Error(`PDF type detection error: ${error.message}`);
    }
  }
}

module.exports = {
  PDFParserManager,
  Type1PDFParser,
  Type2PDFParser,
  Type3PDFParser
};
