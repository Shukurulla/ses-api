const pdf = require('pdf-parse');
const fs = require('fs').promises;

/**
 * Type 3 PDF Parser: Yuqumli Kasalliklar Kartasi (Qisqacha)
 * Bu parser 3.pdf formatidagi PDF fayllarni parse qiladi
 */

class Type3PDFParser {
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
      facilityName: this.extractField(fullText, /^([^\n]+)\s+muassasa nomi/m),
      caseNumber: this.extractCaseNumber(fullText),
      primaryDiagnosis: this.extractField(fullText, /Birlamchi tashxis\s+(.+?)(?=\n|$)/),
      diseaseAgent: this.extractField(fullText, /Kasallik qo'zg'atuvchisining turi, xili\s+(.+)/),
      patientOrigin: this.extractField(fullText, /Bemor:\s*(shu yerlik|boshqa joydan kelgan)/),
      fullName: this.extractField(fullText, /F\.I\.SH\s+([А-ЯЁа-яёA-Za-z\s]+)/),
      gender: this.extractField(fullText, /Jinsi\s+(Erkak|Ayol)/),
      birthDate: this.extractDate(fullText, /Tug'ilgan sanasi\s+(\d{2}-\d{2}-\d{4})/),
      permanentAddress: this.extractAddress(fullText, 'Doimiy yashash joyi'),
      currentAddress: this.extractAddress(fullText, 'Hozirgi yashash joyi'),
      workplace: this.extractField(fullText, /Ishlash, o'qish joyi, bog'cha\s+([^\n]+)/),
      lastWorkplaceVisit: this.extractDate(fullText, /Ishlash, o'qish joyiga, bog'chaga so'ngi marta borgan vaqti\s+(\d{2}-\d{2}-\d{4})/),
      medicalFacility: {
        region: this.extractField(fullText, /Turar joyi bo'yicha davolash muassasasi:\s*Viloyati\s+([^\s]+)/),
        district: this.extractField(fullText, /Tumani\s+([^\s]+)/),
        polyclinic: this.extractField(fullText, /Poliklinika\s+([^\n]+)/)
      },
      reportReceived: this.extractDateTime(fullText, /Bemor haqida habar olinganligi \(kuni, soati\)\s+(\d{2}-\d{2}-\d{4}\s+\d{2}:\d{2})/),
      referredBy: this.extractField(fullText, /Kim tomonidan yuborilgan \(muassasa nomi\)\s+([^\n]+)/),
      initialSymptoms: this.extractField(fullText, /Kasallikning birinchi kunlaridagi asosiy belgilari\s+([^\n]+)/),
      patientDetection: this.extractField(fullText, /Bemor aniqlandi\s+([^\n]+)/),
      epidemiologicalInspection: {
        date: this.extractDateTime(fullText, /Epidemiologik tekshiruv o'tkazilgan vaqt \(kuni, soati\)\s+(\d{2}-\d{2}-\d{4}\s+\d{2}:\d{2})/),
        endDate: this.extractDateTime(fullText, /Kuzatuv tamomlangan vaqt\s+(\d{2}-\d{2}-\d{4}\s+\d{2}:\d{2})/)
      },
      dates: {
        illness: this.extractDateTime(fullText, /Kasallangan\s+sana\s+(\d{2}-\d{2}-\d{4}\s+\d{2}:\d{2})/),
        contact: this.extractDateTime(fullText, /Murojaat\s+etgan vaqt\s+(\d{2}-\d{2}-\d{4}\s+\d{2}:\d{2})/),
        emergencyNotification: this.extractDateTime(fullText, /Shoshilinch xabarnoma\s+yuborilganda tashxis qo'yilgan sana\s+(\d{2}-\d{2}-\d{4}\s+\d{2}:\d{2})/),
        hospitalization: this.extractDateTime(fullText, /Kasalxonaga\s+yotqizilgan sana\s+(\d{2}-\d{2}-\d{4}\s+\d{2}:\d{2})/),
        finalDiagnosis: this.extractDateTime(fullText, /Yakunlovchi tashxis\s+qo'yilgan sana\s+(\d{2}-\d{2}-\d{4}\s+\d{2}:\d{2})/)
      },
      hospital: this.extractField(fullText, /Yotqizilgan kasalxona,\s*qaysi transport vositasi bilan\s+(.+)/),
      transportType: this.extractField(fullText, /qaysi transport vositasi bilan\s+(.+)/),
      homeRetention: this.extractField(fullText, /Uyida qoldirilish \(sababi\):\s+(.+)/),
      lateHospitalizationReason: this.extractField(fullText, /Kech yotqizilish sabablari\s+(.+)/),
      labTestConducted: this.extractField(fullText, /Laboratoriya tekshiruvi:\s*(o'tkazildi|o'tkazilmadi)/) === "o'tkazildi",
      lastVaccination: {
        type: this.extractField(fullText, /Turi\s+([^\s]+)/),
        preparat: this.extractField(fullText, /Preparat nomi\s+([^\s]+)/),
        series: this.extractField(fullText, /Seriyasi\s+([^\s]+)/),
        date: this.extractDate(fullText, /Vaqti\s+(\d{2}-\d{2}-\d{4})/),
        dose: this.extractField(fullText, /Dozasi\s+([^\n]+)/)
      },
      presumedInfectionPeriod: {
        from: this.extractDate(fullText, /Taxminiy yuqqan muddati:\s+(\d{2}-\d{2}-\d{4})/),
        to: this.extractDate(fullText, /dan\s+(\d{2}-\d{2}-\d{4})\s+gacha/)
      },
      unfavorableConditions: this.extractUnfavorableConditions(fullText),
      housingConditions: this.extractHousingConditions(fullText),
      disinfectionMeasures: this.extractDisinfectionMeasures(fullText),
      conclusion: this.extractConclusion(fullText),
      submittedToStatistics: this.extractDate(fullText, /Kartani medstatistikka topshirilgan vaqt\s+(\d{2}-\d{2}-\d{4})/),
      epidemiologist: this.extractEpidemiologist(fullText)
    };

    return extracted;
  }

  static extractCaseNumber(text) {
    const match = text.match(/№\s*(\d+)/);
    return match ? match[1] : null;
  }

  static extractAddress(text, addressType) {
    const regionMatch = new RegExp(`${addressType}:\\s*Viloyati\\s+([^\\s]+)`).exec(text);
    const districtMatch = /Tumani\s+([^\n]+?)\s+mahalla/.exec(text);
    const neighborhoodMatch = /mahalla\s+([^\s]+)/.exec(text);
    const streetMatch = /Ko'cha\s+([^\s]+)/.exec(text);
    const houseMatch = /Uy\s+(\d+)/.exec(text);
    const apartmentMatch = /Xonadon\s+(.+)/.exec(text);

    return {
      region: regionMatch ? regionMatch[1] : null,
      district: districtMatch ? districtMatch[1].trim() : null,
      neighborhood: neighborhoodMatch ? neighborhoodMatch[1] : null,
      street: streetMatch ? streetMatch[1] : null,
      house: houseMatch ? houseMatch[1] : null,
      apartment: apartmentMatch ? apartmentMatch[1].trim() : null
    };
  }

  static extractHousingConditions(text) {
    return {
      type: this.extractField(text, /Yashash sharoiti\s+(.+)/),
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

  static extractUnfavorableConditions(text) {
    // Noqulay sharoit-sharoitlar jadvalini parse qilish
    return [];
  }

  static extractDisinfectionMeasures(text) {
    // Dezinfeksiya choralari jadvalini parse qilish
    return [];
  }

  static extractConclusion(text) {
    return {
      infectionLocation: this.extractField(text, /Kasallik chaqiruvchisini yuqtirishga gumon qilingan joy\s+(.+)/),
      infectionPlace: this.extractField(text, /Kasallikni yuqtirilishi ehtimol qilingan joy\s+(.+)/),
      mainFactor: this.extractField(text, /Kasallik chaqiruvchisini yuqtirishga ehtimol qilingan asosiy faktor\s+(.+)/),
      diseaseConditions: this.extractField(text, /Kasallikni yuqtirishga sabab bo'lgan sharoitlar\s+(.+)/),
      outbreakCases: {
        home: this.extractField(text, /Turar joyida:\s+(birlamchi|ikkilamchi)/),
        workPlace: this.extractField(text, /Ish, o'qish, tarbiya, dam olish, va davolash joylarida:\s+(birlamchi|ikkilamchi)/)
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
      if (datePart && timePart) {
        const [day, month, year] = datePart.split('-');
        return new Date(`${year}-${month}-${day}T${timePart}`);
      }
    }
    return null;
  }

  static extractNumber(text, regex) {
    const match = text.match(regex);
    return match && match[1] ? parseInt(match[1]) : null;
  }
}

module.exports = Type3PDFParser;
