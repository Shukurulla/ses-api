const pdf = require('pdf-parse');
const fs = require('fs').promises;

/**
 * Type 2 PDF Parser: Sil Kasalligini Epidemiologik Tekshirish va Kuzatish Kartasi
 * Bu parser 2.pdf formatidagi PDF fayllarni parse qiladi
 */

class Type2PDFParser {
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
      fullName: this.extractField(fullText, /Familiyasi, ismi, otasining ismi\s+([А-ЯЁа-яёA-Za-z\s]+)/),
      permanentAddress: this.extractPermanentAddress(fullText),
      currentAddress: this.extractCurrentAddress(fullText),
      birthDate: this.extractDate(fullText, /Tug'ilgan yili\s+(\d{2}-\d{2}-\d{4})/),
      profession: this.extractField(fullText, /Kasbi\s+([^\n]+)/),
      workplace: this.extractField(fullText, /Ish joyi\s+([^\n]+)/),
      illnessDate: this.extractDateTime(fullText, /Kasallangan sanasi\s+(\d{2}-\d{2}-\d{4}\s+\d{2}:\d{2})/),
      dispensaryRegistration: {
        date: this.extractDate(fullText, /Silga qarshi dispanser ro'yxatidan birlamchi o'tkazilgan sana\s+(\d{2}-\d{2}-\d{4})/),
        dispensaryName: this.extractField(fullText, /va dispanser nomi\s+([^\n]+)/)
      },
      diagnosisAtRegistration: this.extractField(fullText, /Sanitariya-epidemiologiya xizmatida ro'yxatdan o'tish vaqtidagi tashxisi\s+([^\n]+)/),
      firstIsolationDate: this.extractDate(fullText, /Mikrobakteriyalarni birinchi ajratib olingan sanasi\s+(\d{2}-\d{2}-\d{4})/),
      mbtIsolationMethod: this.extractField(fullText, /va usuli\s+([^\n]+)/),
      registrationDate: this.extractDate(fullText, /Sanitariya-epidemiologiya xizmatida MKB ajratuvchi bemorni ro'yxatdan o'tkazilgan sana\s+(\d{2}-\d{2}-\d{4})/),
      registeredBy: this.extractField(fullText, /Kim tomonidan ro'yxatdan o'tkazilgan\s+([^\n]+)/),
      hospitalizationDate: this.extractDate(fullText, /Kasalxonaga yotqizilgan sana\s+(\d{2}-\d{2}-\d{4})/),
      hospitalName: this.extractField(fullText, /Bemor yotqizilgan shifoxona nomi\s+([^\n]+)/),
      finalDisinfectionDate: this.extractDate(fullText, /Yakuniy dezinfeksiya sanasi\s+(\d{2}-\d{2}-\d{4})/),
      homeRetentionReason: this.extractField(fullText, /Bemorni uyda qoldirilganligini sababi\s+([^\n]+)/),
      dischargeDate: this.extractDate(fullText, /Kasalxonadan chiqarilgan sana\s+(\d{2}-\d{2}-\d{4})/),
      vaccination: {
        name: this.extractField(fullText, /Silga qarshi emlash: vaksinatsiya nomi:\s+([^,]+)/),
        series: this.extractField(fullText, /seriyasi:\s+([^,]+)/),
        date: this.extractDate(fullText, /vaqti:\s+(\d{2}-\d{2}-\d{4})/),
        dose: this.extractField(fullText, /dozasi:\s+([^\n]+)/)
      },
      lastXrayInfo: {
        date: this.extractDate(fullText, /Sil kasalligini MBT aniqlanmagunga qadar bemorning oxirgi rentgen tekshiruvi o'tgan sanasi\s+(\d{2}-\d{2}-\d{4})/),
        location: this.extractField(fullText, /joyi\s+([^,]+)/),
        result: this.extractField(fullText, /va natijasi\s+([^\n]+)/)
      },
      previousTbHistory: {
        hadBefore: this.extractField(fullText, /Ilgari sil bilan kasallangangaligi, qayerda\s+([^\n]+)/),
        when: this.extractDate(fullText, /qaysi yilda\s+(\d{4})/),
        diagnosis: this.extractField(fullText, /tashxisi\s+([^,]+)/),
        dispensaryGroup: this.extractField(fullText, /ro'yxatga olish guruhi\s+([^\n]+)/)
      },
      convertedFromClosed: {
        converted: this.extractField(fullText, /Silning yopiq shakllarini ochiq shaklga o'tishi/) !== null,
        fromGroup: this.extractField(fullText, /qaysi guruh dispanser ro'yxatidan turgan\s+([^\n]+)/)
      },
      lastTwoYearsScreening: this.extractLastTwoYearsScreening(fullText),
      retreatmentDates: {
        dates: this.extractRetreatmentDates(fullText),
        duration: this.extractField(fullText, /davomiyligi:\s+([^\n]+)/)
      },
      workSuspensionDate: this.extractDate(fullText, /Ishdan chetlatilgan sana:\s+(\d{2}-\d{2}-\d{4})/),
      notificationToWorkplace: {
        date: this.extractDate(fullText, /Dispanser tomonidan bemorning ish joyiga bemor to'g'risidagi ma'lumotlar berilgan sana:\s+(\d{2}-\d{2}-\d{4})/),
        receivedBy: this.extractField(fullText, /Kim qabul qildi\s+([^\n]+)/)
      },
      notificationToClinic: this.extractDate(fullText, /Bemor yashash joyiga \(poliklinika\) ma'lumotlar berilgan sana:\s+(\d{2}-\d{2}-\d{4})/),
      nutrition: this.extractField(fullText, /Ovqatlanish \(muntazam, uyda, umumiy ovqatlanish joyida\)\s+([^\n]+)/),
      workplaceConditions: this.extractField(fullText, /Ish joyi sharoitlari:\s+([^\n]+)/),
      familyBudget: this.extractField(fullText, /Oila budjeti:\s+([^\n]+)/),
      harmfulHabits: this.extractHarmfulHabits(fullText),
      possibleSource: {
        contactWithTb: this.extractField(fullText, /Sil bilan kasallangan bemor bilan aloqa qilish/) !== null,
        sourceName: this.extractField(fullText, /Manbaning familiyasi va ismi:\s+([^\n]+)/),
        contactTime: this.extractField(fullText, /Bemor bilan muloqat vaqti\s+([^\n]+)/),
        contactDuration: this.extractField(fullText, /va davomiyligi:\s+([^\n]+)/)
      },
      housingConditions: this.extractHousingConditions(fullText),
      sanitaryHygiene: this.extractSanitaryHygiene(fullText),
      contactMonitoring: this.extractContactMonitoring(fullText),
      rehabilitationPlan: this.extractRehabilitationPlan(fullText),
      epidemiologist: this.extractEpidemiologist(fullText)
    };

    return extracted;
  }

  static extractCaseNumber(text) {
    const match = text.match(/№\s*(\d+)/);
    return match ? match[1] : null;
  }

  static extractPermanentAddress(text) {
    return {
      region: this.extractField(text, /Manzil \(asosiy ro'yxatda turgan\):\s*Viloyati\s+([^\s]+)/),
      district: this.extractField(text, /Tumani\s+([^\n]+?)\s+mahalla/),
      neighborhood: this.extractField(text, /mahalla\s+([^\s]+)/),
      street: this.extractField(text, /Ko'cha\s+([^\s]+)/),
      house: this.extractField(text, /Uy\s+(\d+)/),
      apartment: this.extractField(text, /Xonadon\s+(.+)/)
    };
  }

  static extractCurrentAddress(text) {
    return {
      region: this.extractField(text, /Yashab turgan manzil:\s*Viloyati\s+([^\s]+)/),
      district: this.extractField(text, /Tumani\s+([^\n]+?)\s+mahalla/),
      neighborhood: this.extractField(text, /mahalla\s+([^\s]+)/),
      street: this.extractField(text, /Ko'cha\s+([^\s]+)/),
      house: this.extractField(text, /Uy\s+(\d+)/),
      apartment: this.extractField(text, /Xonadon\s+(.+)/)
    };
  }

  static extractHousingConditions(text) {
    return {
      type: this.extractField(text, /Uy-joy turi \(([^)]+)\)/),
      rooms: this.extractNumber(text, /Xonalar soni\s+(\d+)/),
      floors: this.extractNumber(text, /Qavatlar soni\s+(\d+)/),
      elevator: this.extractField(text, /Lift\s+(Yo'q|Bor)/) === "Bor",
      occupants: {
        total: this.extractNumber(text, /Bemor bilan aloqada bo'lganlar jami kishilar soni\s+(\d+)/),
        familyMembers: this.extractNumber(text, /bemor bilan aloqada bo'lgan jami oila a'zolari soni\s+(\d+)/),
        adults: this.extractNumber(text, /Kattalar soni\s+(\d+)/),
        teenagers: this.extractNumber(text, /o'smirlar soni\s+(\d+)/),
        under14: this.extractNumber(text, /14 yoshgacha bo'lgan bolalar soni\s+(\d+)/),
        pregnant: this.extractNumber(text, /Homilador ayollar soni\s+(\d+)/),
        foodWorkers: this.extractNumber(text, /Bolalar muassasasi, oziq-ovqat va shunga o'xshash sohalarda ishchilar soni\s+(\d+)/)
      },
      roomsOccupied: this.extractNumber(text, /Bemorning oilasi egallagan xonalar soni\s+(\d+)/),
      roomArea: this.extractNumber(text, /har bir xona maydoni\(kv\.m\)\s+(\d+)/),
      totalArea: this.extractNumber(text, /umumiy maydon \(kv\.m\)\s+(\d+)/),
      isolatedRoomArea: this.extractNumber(text, /Bemor alohida \(qo'yilgan xonalarda, alohidalangan\) xonani egallaydi \(kv\.m\)\s+(\d+)/),
      peopleInRoom: this.extractNumber(text, /Xonada bemor bilan birga yashaydigan kishilar soni\s+(\d+)/),
      childrenInRoom: this.extractNumber(text, /shu jumladan bolalar soni\s+(\d+)/),
      apartmentCondition: this.extractField(text, /Kvartirani, bemor xonasini sanitariya-gigiyenik holatini baholash:\s+([^\n]+)/),
      heating: this.extractField(text, /Isitish:\s+([^\s]+)/),
      sewerage: this.extractField(text, /Kanalizatsiya:\s+([^\s]+)/),
      ventilation: this.extractField(text, /Ventilyatsiya\s+([^\s]+)/),
      repairNeeded: this.extractField(text, /Xonani ta'mirlash kerak:\s+(Yo'q|Kerak)/) === "Kerak",
      suitableForLiving: this.extractField(text, /Yashash uchun yaroqliligi:\s+([^\n]+)/),
      housingImprovedYear: this.extractNumber(text, /Qaysi yilda yashash sharoiti yaxshilandi\s+(\d{4})/),
      oldHousingConditions: this.extractField(text, /Eski manzilidagi uy-joy va yashash sharoitlarning xususiyatlari\s+([^\n]+)/)
    };
  }

  static extractSanitaryHygiene(text) {
    return {
      coughEtiquette: this.extractField(text, /Bemor yo'talga qarshi ehtiyot choralarini qo'llaydimi/) === "ha",
      sputumContainer: {
        has: this.extractField(text, /Cho'ntak tupukdoni bormi: ha\/yo'q \(sonini ko'rsating\)\s+Ha\s+(\d+)/) !== null,
        count: this.extractNumber(text, /Ha\s+(\d+)/),
        usedAt: {
          work: this.extractField(text, /Ishda\s+-\s+(Yo'q|Ha)/) === "Ha",
          home: this.extractField(text, /Uyda\s+-\s+(Yo'q|Ha)/) === "Ha",
          public: this.extractField(text, /Jamoat joylarida\s+-\s+(Yo'q|Ha)/) === "Ha"
        }
      },
      sputumDisinfection: this.extractField(text, /Balg'am va tupuriklarni zararsizlantirish usuli:\s+([^\n]+)/),
      disinfectedBy: this.extractField(text, /Tupurish va balg'amlarni kim dezinfeksiya qiladi\s+([^\n]+)/),
      receivesDisinfectant: this.extractField(text, /Bemor dezinfeksiya vositalarini olishi:\s+(Olmaydi|Oladi)/) === "Oladi",
      disinfectantProvider: this.extractField(text, /Dezinfeksiyalovchi vosita kim tomonidan beriladi:\s+([^\n]+)/),
      monthlyAmount: this.extractNumber(text, /Dezinfeksiyalovchi vosita miqdori \(oyiga\):\s+(\d+)/),
      nurseVisitFrequency: this.extractField(text, /Hududiy dispanser hamshirasi bemorga har\s+(\d+)\s+bir marta tashrif buyuradi/),
      doctorVisitFrequency: this.extractField(text, /Hududiy dispanser ftiziatori bemorga har\s+(\d+)\s+bir marta tashrif buyuradi/)
    };
  }

  static extractHarmfulHabits(text) {
    const habits = [];
    if (text.includes('Zararli ovqatlarga qaramlik')) habits.push('Zararli ovqatlarga qaramlik');
    return habits;
  }

  static extractLastTwoYearsScreening(text) {
    // Bu yerda oxirgi 2 yil davomida tekshiruvlarni extract qilish
    return [];
  }

  static extractRetreatmentDates(text) {
    // Qayta davolanish sanalarini extract qilish
    return [];
  }

  static extractContactMonitoring(text) {
    // Aloqadagilarni kuzatish jadvalini extract qilish
    return [];
  }

  static extractRehabilitationPlan(text) {
    // Sog'lomlashtirish rejasini extract qilish
    return [];
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

module.exports = Type2PDFParser;
