const pdf = require('pdf-parse');
const fs = require('fs').promises;

/**
 * Type 1 PDF Parser: Yuqumli va Parazitar Kasalliklar O'chog'in Epidemiologik Tekshirish Kartasi
 * Bu parser 1.pdf formatidagi PDF fayllarni parse qiladi
 */

class Type1PDFParser {
  /**
   * PDF faylni parse qilish
   * @param {string} pdfPath - PDF fayl yo'li
   * @returns {Promise<Object>} - Parse qilingan ma'lumotlar
   */
  static async parse(pdfPath) {
    try {
      const dataBuffer = await fs.readFile(pdfPath);
      const data = await pdf(dataBuffer);

      // PDF textini qatorlarga bo'lish
      const lines = data.text.split('\n').map(line => line.trim()).filter(line => line);

      const result = {
        raw: data.text,
        parsed: this.extractFields(lines, data.text)
      };

      return result;
    } catch (error) {
      throw new Error(`PDF parsing error: ${error.message}`);
    }
  }

  /**
   * Maydonlarni extract qilish
   * @param {Array<string>} lines - PDF qatorlari
   * @param {string} fullText - To'liq matn
   * @returns {Object} - Extract qilingan ma'lumotlar
   */
  static extractFields(lines, fullText) {
    const extracted = {
      caseNumber: this.extractCaseNumber(fullText),
      patientInfo: this.extractPatientInfo(lines, fullText),
      medicalInfo: this.extractMedicalInfo(lines, fullText),
      epidemiologicalInfo: this.extractEpidemiologicalInfo(lines, fullText),
      sanitaryInfo: this.extractSanitaryInfo(lines, fullText),
      workplaceInfo: this.extractWorkplaceInfo(lines, fullText),
      contacts: this.extractContacts(lines, fullText),
      preventiveMeasures: this.extractPreventiveMeasures(lines, fullText),
      disinfectionMeasures: this.extractDisinfectionMeasures(lines, fullText),
      conclusion: this.extractConclusion(lines, fullText),
      epidemiologist: this.extractEpidemiologist(fullText)
    };

    return extracted;
  }

  static extractCaseNumber(text) {
    const match = text.match(/№\s*(\d+)/);
    return match ? match[1] : null;
  }

  static extractPatientInfo(lines, text) {
    return {
      fullName: this.extractField(text, /4\.\s*F\.I\.SH\s*([А-ЯЁа-яёA-Za-z\s]+?)(?=\n|5\.)/i),
      gender: this.extractField(text, /5\.\s*Jinsi\s*(Erkak|Ayol)/i),
      birthDate: this.extractDate(text, /6\.\s*Tug'ilgan sanasi\s*(\d{2}-\d{2}-\d{4})/i),
      permanentAddress: {
        region: this.extractField(text, /7\.\s*Doimiy yashash joyi:\s*Viloyati\s*([^\n]+?)(?=Tumani|Tuman|$)/i),
        district: this.extractField(text, /Tumani\s*([^\n]+?)(?=mahalla|MFY|$)/i),
        neighborhood: this.extractField(text, /(?:mahalla|MFY)\s*([^\n]+?)(?=Ko'cha|Ko'ch|$)/i),
        street: this.extractField(text, /Ko'cha\s*([^\n]+?)(?=Uy|$)/i),
        house: this.extractField(text, /Uy\s*(\d+)/i),
        apartment: this.extractField(text, /Xonadon\s*([^\n]+?)(?=8\.|$)/i)
      },
      currentAddress: {
        region: this.extractField(text, /8\.\s*Hozirgi yashash joyi:\s*Viloyati\s*([^\n]+?)(?=Tumani|Tuman|$)/i),
        district: this.extractField(text, /8\..*?Tumani\s*([^\n]+?)(?=mahalla|MFY|$)/i),
        neighborhood: this.extractField(text, /8\..*?(?:mahalla|MFY)\s*([^\n]+?)(?=Ko'cha|Ko'ch|$)/i),
        street: this.extractField(text, /8\..*?Ko'cha\s*([^\n]+?)(?=Uy|$)/i),
        house: this.extractField(text, /8\..*?Uy\s*(\d+)/i),
        apartment: this.extractField(text, /8\..*?Xonadon\s*([^\n]+?)(?=9\.|$)/i)
      },
      workplace: this.extractField(text, /9\.\s*Ishlash, o'qish joyi, bog'cha\s*Viloyati\s*([^\n]+?)(?=10\.|$)/i),
      lastWorkplaceVisit: this.extractDate(text, /10\.\s*Ishlash, o'qish joyiga, bog'chaga so'ngi marta borgan vaqti\s*(\d{2}-\d{2}-\d{4})/i)
    };
  }

  static extractMedicalInfo(lines, text) {
    return {
      primaryDiagnosis: this.extractField(text, /1\.\s*Birlamchi tashxis\s*([A-Z0-9].*?)(?=\n|2\.)/i),
      diseaseAgent: this.extractField(text, /2\.\s*Kasallik qo'zg'atuvchisining turi,\s*xili\s*(.+?)(?=\n|3\.)/i),
      patientOrigin: this.extractField(text, /3\.\s*Bemor:\s*(shu yerlik|boshqa joydan kelgan)/i),
      illnessDate: this.extractDate(text, /17\.\s*Kasallangan\s*sana\s*(\d{2}-\d{2}-\d{4})/i),
      contactDate: this.extractDateTime(text, /18\.\s*Murojaat\s*etgan vaqt\s*(\d{2}-\d{2}-\d{4}\s+\d{2}:\d{2})/i),
      emergencyNotificationDate: this.extractDateTime(text, /19\.\s*Shoshilinch xabarnoma.*?sana\s*(\d{2}-\d{2}-\d{4}\s+\d{2}:\d{2})/i),
      hospitalizationDate: this.extractDateTime(text, /20\.\s*Kasalxonaga\s*yotqizilgan sana\s*(\d{2}-\d{2}-\d{4}\s+\d{2}:\d{2})/i),
      finalDiagnosisDate: this.extractDateTime(text, /21\.\s*Yakunlovchi tashxis.*?sana\s*(\d{2}-\d{2}-\d{4}\s+\d{2}:\d{2})/i),
      hospital: this.extractField(text, /22\.\s*Yotqizilgan kasalxona,.*?bilan\s*(.+?)(?=\n|23\.)/i),
      transportType: this.extractField(text, /qaysi transport vositasi bilan\s*(.+?)(?=\n|23\.)/i),
      homeRetentionReason: this.extractField(text, /23\.\s*Uyida qoldirilish.*?:\s*(.+?)(?=\n|24\.)/i),
      lateHospitalizationReason: this.extractField(text, /24\.\s*Kech yotqizilish sabablari\s*(.+?)(?=\n|25\.)/i),
      labTestConducted: this.extractField(text, /25\.\s*Laboratoriya tekshiruvi:\s*(o'tkazildi|o'tkazilmadi)/i) === "o'tkazildi"
    };
  }

  static extractEpidemiologicalInfo(lines, text) {
    return {
      presumedInfectionPeriod: {
        from: this.extractDate(text, /Taxminiy yuqqan muddati:\s+(\d{2}-\d{2}-\d{4})/),
        to: this.extractDate(text, /dan\s+(\d{2}-\d{2}-\d{4})\s+gacha/)
      },
      unfavorableConditions: this.extractUnfavorableConditions(text),
      possibleSources: this.extractPossibleSources(text),
      foodAndWaterData: this.extractFoodAndWaterData(text)
    };
  }

  static extractSanitaryInfo(lines, text) {
    return {
      housingType: this.extractField(text, /Yashash sharoiti\s+(.+)/),
      density: {
        people: this.extractNumber(text, /Kishilar soni\s+(\d+)/),
        rooms: this.extractNumber(text, /Xonalar soni\s+(\d+)/),
        area: this.extractNumber(text, /Maydoni\s+(\d+)/)
      },
      waterSupply: this.extractField(text, /Suv bilan ta'minlanishi\s+(.+)/),
      wasteDisposal: this.extractField(text, /Suyuq chiqindilardan tozalash, yig'ish turi\s+(.+)/),
      solidWasteDisposal: this.extractField(text, /Qattiq chiqindilarni tozalash\s+(.+)/),
      sanitaryCondition: {
        rooms: this.extractField(text, /Xonalar\s+(Qoniqarli|Qoniqarsiz)/),
        yard: this.extractField(text, /Xovli\s+(Qoniqarli|Qoniqarsiz)/),
        area: this.extractField(text, /Hududida\s+(Qoniqarli|Qoniqarsiz)/)
      },
      pests: {
        lice: this.extractField(text, /Bitlash borligi\s+(Yo'q|Bor)/) === "Bor",
        otherInsects: this.extractField(text, /Boshqa hashoratlar\s+(Yo'q|Bor)/) === "Bor",
        rodents: this.extractField(text, /Kemiruvchilar\s+(Yo'q|Bor)/) === "Bor"
      },
      diseaseFactors: this.extractField(text, /Kasallikni kelib chiqishida muhim bo'lgan sabablar\s+(.+)/)
    };
  }

  static extractWorkplaceInfo(lines, text) {
    return {
      objectNames: this.extractField(text, /Bemor bo'lgan ob'ektlar nomi, uning bo'limlari tarkibi\s+(.+)/),
      sanitaryCompliance: {
        density: this.extractField(text, /Zichligi\s+(.+)/),
        separation: this.extractField(text, /Alohidaligi\s+(.+)/),
        waterSupply: this.extractField(text, /Suv bilan ta'minlanganligi\s+(.+)/),
        sewerage: this.extractField(text, /Kanalizatsiyani borligi\s+(.+)/),
        sanitaryCondition: this.extractField(text, /Sanitar xolatni saqlash\s+(.+)/),
        foodStorage: this.extractField(text, /Oziq ovqat mahsulotlarini saqlanishi\s+(.+)/),
        foodPreparation: this.extractField(text, /Ovqatlarni tayyorlash\s+(.+)/)
      },
      diseaseFactors: this.extractField(text, /Kasallikni keltirib chiqargan omillar\s+(.+)/)
    };
  }

  static extractContacts(lines, text) {
    // Bu yerda contacts jadvalidan ma'lumot olish kerak
    // Hozircha oddiy regex bilan
    return [];
  }

  static extractPreventiveMeasures(lines, text) {
    return {
      community: {},
      additionalMeasures: []
    };
  }

  static extractDisinfectionMeasures(lines, text) {
    return [];
  }

  static extractConclusion(lines, text) {
    return {
      infectionLocation: this.extractField(text, /Kasallik chaqiruvchisini yuqtirishga gumon qilingan joy\s+(.+)/),
      infectionPlace: this.extractField(text, /Kasallikni yuqtirilishi ehtimol qilingan joy\s+(.+)/),
      sourceType: {
        notFound: false,
        human: null,
        animal: null
      },
      mainFactor: this.extractField(text, /Kasallik chaqiruvchisini yuqtirishga ehtimol qilingan asosiy faktor\s+(.+)/),
      diseaseConditions: this.extractField(text, /Kasallikni yuqtirishga sabab bo'lgan sharoitlar\s+(.+)/),
      outbreakCases: {
        home: this.extractField(text, /Turar joyida:\s+(birlamchi|ikkilamchi)/),
        workStudyPlace: this.extractField(text, /Ish, o'qish, tarbiya, dam olish, va davolash joylarida:\s+(birlamchi|ikkilamchi)/)
      }
    };
  }

  static extractEpidemiologist(text) {
    return this.extractField(text, /Epidemiolog vrach\s+([А-ЯЁа-яё\s]+)/);
  }

  // Helper functions
  static extractField(text, regex) {
    const match = text.match(regex);
    return match && match[1] ? match[1].trim() : null;
  }

  static extractDate(text, regex) {
    const match = text.match(regex);
    if (match && match[1]) {
      const parts = match[1].split('-');
      if (parts.length === 3) {
        return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      }
    }
    return null;
  }

  static extractDateTime(text, regex) {
    const match = text.match(regex);
    if (match && match[1]) {
      const [datePart, timePart] = match[1].split(' ');
      const [day, month, year] = datePart.split('-');
      return new Date(`${year}-${month}-${day}T${timePart}`);
    }
    return null;
  }

  static extractNumber(text, regex) {
    const match = text.match(regex);
    return match && match[1] ? parseInt(match[1]) : null;
  }

  static extractUnfavorableConditions(text) {
    // Implement table parsing
    return [];
  }

  static extractPossibleSources(text) {
    // Implement table parsing
    return [];
  }

  static extractFoodAndWaterData(text) {
    // Implement table parsing
    return [];
  }
}

module.exports = Type1PDFParser;
