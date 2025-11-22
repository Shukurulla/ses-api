const XLSX = require('xlsx');
const Forma60 = require('../models/Forma60');

/**
 * Excel Hisobot Generator Service
 * 3 xil kasallik uchun hisobotlar:
 * 1. Salmonellyoz
 * 2. Ich burug' (Shigellyoz)
 * 3. O'tkir yuqumli ichak kasalliklari (O'YuIK)
 */

class ExcelReportGenerator {
  /**
   * Umumiy helper funksiyalar
   */

  // Yosh guruhlarini ajratish
  static getAgeGroup(age) {
    if (age < 1) return '1 yoshgacha';
    if (age <= 2) return '1-2';
    if (age <= 6) return '3-6';
    if (age <= 14) return '7-14';
    if (age <= 17) return '15-17';
    if (age <= 19) return '18-19';
    if (age <= 29) return '20-29';
    if (age <= 39) return '30-39';
    if (age <= 49) return '40-49';
    if (age <= 59) return '50-59';
    return '60+';
  }

  // Kasbni aniqlash
  static getOccupationCategory(forma60) {
    const { patientStatus, educationType, workType } = forma60;

    if (patientStatus === 'oqiydi') {
      if (!educationType) return 'Oqiydi - boshqa';
      if (educationType === 'detsat') return 'Oqiydi - DPM';
      if (educationType === 'maktab') return 'Oqiydi - maktab';
      if (['universitet', 'texnikum', 'kolej'].includes(educationType)) {
        return 'Oqiydi - oliy va o\'rta maxsus';
      }
      return 'Oqiydi - boshqa';
    }

    if (patientStatus === 'ishlaydi') {
      if (!workType) return 'Ishlaydi - boshqa';
      if (workType === 'medic') return 'Ishlaydi - tibbiy xodimlar';
      if (workType === 'restoran') return 'Ishlaydi - umumiy ovqatlanish';
      if (workType === 'suv') return 'Ishlaydi - suv ta\'minoti';
      return 'Ishlaydi - boshqa';
    }

    return 'Boshqa';
  }

  /**
   * 1. SALMONELLYOZ HISOBOTI
   */
  static async generateSalmonellyozReport(year, region = null) {
    try {
      // Yil bo'yicha barcha salmonellyoz holatlarini olish
      const startDate = new Date(`${year}-01-01`);
      const endDate = new Date(`${year}-12-31T23:59:59`);

      const query = {
        primaryDiagnosis: { $regex: /salmonell/i },
        illnessDate: { $gte: startDate, $lte: endDate }
      };

      if (region) {
        query.address = { $regex: region, $options: 'i' };
      }

      const cases = await Forma60.find(query);

      // Excel workbook yaratish
      const wb = XLSX.utils.book_new();

      // Jadval 1: Oylik dinamika
      const table1 = this.createSalmonellyozTable1(cases, year);
      const ws1 = XLSX.utils.aoa_to_sheet(table1);
      XLSX.utils.book_append_sheet(wb, ws1, 'Jadval 1 - Oylik');

      // Jadval 2: Yosh guruhlari bo'yicha
      const table2 = this.createSalmonellyozTable2(cases);
      const ws2 = XLSX.utils.aoa_to_sheet(table2);
      XLSX.utils.book_append_sheet(wb, ws2, 'Jadval 2 - Yosh');

      // Jadval 3: Kasblar bo'yicha
      const table3 = this.createSalmonellyozTable3(cases);
      const ws3 = XLSX.utils.aoa_to_sheet(table3);
      XLSX.utils.book_append_sheet(wb, ws3, 'Jadval 3 - Kasblar');

      // Jadval 4: Yuqish omillari
      const table4 = this.createSalmonellyozTable4(cases);
      const ws4 = XLSX.utils.aoa_to_sheet(table4);
      XLSX.utils.book_append_sheet(wb, ws4, 'Jadval 4 - Yuqish');

      // Jadval 5: Kasallik turlari
      const table5 = this.createSalmonellyozTable5(cases);
      const ws5 = XLSX.utils.aoa_to_sheet(table5);
      XLSX.utils.book_append_sheet(wb, ws5, 'Jadval 5 - Turlar');

      // Jadval 6: Yuqish joylari
      const table6 = this.createSalmonellyozTable6(cases);
      const ws6 = XLSX.utils.aoa_to_sheet(table6);
      XLSX.utils.book_append_sheet(wb, ws6, 'Jadval 6 - Joylar');

      // Jadval 7: O'choqlar
      const table7 = this.createSalmonellyozTable7(cases);
      const ws7 = XLSX.utils.aoa_to_sheet(table7);
      XLSX.utils.book_append_sheet(wb, ws7, 'Jadval 7 - Ochoqlar');

      // Jadval 8: Kontaktlar
      const table8 = this.createSalmonellyozTable8(cases);
      const ws8 = XLSX.utils.aoa_to_sheet(table8);
      XLSX.utils.book_append_sheet(wb, ws8, 'Jadval 8 - Kontaktlar');

      // Jadval 9: Lab natijalar
      const table9 = this.createSalmonellyozTable9(cases);
      const ws9 = XLSX.utils.aoa_to_sheet(table9);
      XLSX.utils.book_append_sheet(wb, ws9, 'Jadval 9 - Lab');

      return wb;
    } catch (error) {
      throw new Error(`Salmonellyoz hisoboti yaratishda xatolik: ${error.message}`);
    }
  }

  // Jadval 1: Oylik dinamika
  static createSalmonellyozTable1(cases, year) {
    const months = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
                    'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];

    const header = ['Oy', 'Jami holatlar', 'Bolalar (0-17)', 'Kattalar (18+)', 'Gospitallashtirilgan', 'O\'limlar'];
    const rows = [header];

    months.forEach((month, index) => {
      const monthlyCases = cases.filter(c => {
        const date = new Date(c.illnessDate);
        return date.getMonth() === index;
      });

      const children = monthlyCases.filter(c => c.age < 18).length;
      const adults = monthlyCases.filter(c => c.age >= 18).length;
      const hospitalized = monthlyCases.filter(c => c.hospitalizationStatus === 'gospitallashtirilgan').length;
      const deaths = monthlyCases.filter(c => c.outcome === 'o\'lim').length;

      rows.push([month, monthlyCases.length, children, adults, hospitalized, deaths]);
    });

    // Jami qator
    const total = cases.length;
    const totalChildren = cases.filter(c => c.age < 18).length;
    const totalAdults = cases.filter(c => c.age >= 18).length;
    const totalHospitalized = cases.filter(c => c.hospitalizationStatus === 'gospitallashtirilgan').length;
    const totalDeaths = cases.filter(c => c.outcome === 'o\'lim').length;

    rows.push(['JAMI', total, totalChildren, totalAdults, totalHospitalized, totalDeaths]);

    return rows;
  }

  // Jadval 2: Yosh guruhlari
  static createSalmonellyozTable2(cases) {
    const ageGroups = ['1 yoshgacha', '1-2', '3-6', '7-14', '15-17', '18-19', '20-29', '30-39', '40-49', '50-59', '60+'];

    const header = ['Yosh guruhi', 'Jami', 'Erkak', 'Ayol'];
    const rows = [header];

    ageGroups.forEach(group => {
      const groupCases = cases.filter(c => this.getAgeGroup(c.age) === group);
      const male = groupCases.filter(c => c.gender === 'erkak').length;
      const female = groupCases.filter(c => c.gender === 'ayol').length;

      rows.push([group, groupCases.length, male, female]);
    });

    // Jami
    const total = cases.length;
    const totalMale = cases.filter(c => c.gender === 'erkak').length;
    const totalFemale = cases.filter(c => c.gender === 'ayol').length;

    rows.push(['JAMI', total, totalMale, totalFemale]);

    return rows;
  }

  // Jadval 3: Kasblar
  static createSalmonellyozTable3(cases) {
    const header = ['Kasb kategoriyasi', 'Soni'];
    const rows = [header];

    const categories = [
      'Oqiydi - DPM',
      'Oqiydi - maktab',
      'Oqiydi - oliy va o\'rta maxsus',
      'Oqiydi - boshqa',
      'Ishlaydi - tibbiy xodimlar',
      'Ishlaydi - umumiy ovqatlanish',
      'Ishlaydi - suv ta\'minoti',
      'Ishlaydi - boshqa',
      'Boshqa'
    ];

    categories.forEach(category => {
      const count = cases.filter(c => this.getOccupationCategory(c) === category).length;
      rows.push([category, count]);
    });

    rows.push(['JAMI', cases.length]);

    return rows;
  }

  // Jadval 4: Yuqish omillari
  static createSalmonellyozTable4(cases) {
    const header = ['Yuqish omili', 'Soni', 'Foizi'];
    const rows = [header];

    const factors = [
      'Suv',
      'Oziq-ovqat',
      'Sut mahsulotlari',
      'Gosht mahsulotlari',
      'Baliq',
      'Salat',
      'Meva va sabzavot',
      'Kontakt yoli',
      'Boshqa'
    ];

    factors.forEach(factor => {
      const count = cases.filter(c => c.transmissionFactor === factor).length;
      const percent = cases.length > 0 ? ((count / cases.length) * 100).toFixed(1) : 0;
      rows.push([factor, count, `${percent}%`]);
    });

    rows.push(['JAMI', cases.length, '100%']);

    return rows;
  }

  // Jadval 5: Kasallik turlari (Salmonella turlari)
  static createSalmonellyozTable5(cases) {
    const header = ['Salmonella turi', 'Soni'];
    const rows = [header];

    const types = [
      'Salmonella tifimurium',
      'Salmonella enteriditis',
      'Boshqa turlar',
      'Aniqlanmagan'
    ];

    types.forEach(type => {
      let count = 0;
      if (type === 'Aniqlanmagan') {
        count = cases.filter(c => !c.laboratoryResults || !c.laboratoryResults.cultureType).length;
      } else if (type === 'Boshqa turlar') {
        count = cases.filter(c =>
          c.laboratoryResults?.cultureType &&
          c.laboratoryResults.cultureType !== 'Salmonella tifimurium' &&
          c.laboratoryResults.cultureType !== 'Salmonella enteriditis'
        ).length;
      } else {
        count = cases.filter(c => c.laboratoryResults?.cultureType === type).length;
      }
      rows.push([type, count]);
    });

    rows.push(['JAMI', cases.length]);

    return rows;
  }

  // Jadval 6: Yuqish joylari
  static createSalmonellyozTable6(cases) {
    const header = ['Yuqish joyi', 'Soni'];
    const rows = [header];

    const places = [
      'uyda',
      'MTT',
      'maktab',
      'DPM',
      'umumiy_ovqatlanish',
      'boshqa'
    ];

    places.forEach(place => {
      const count = cases.filter(c => c.infectionSource === place).length;
      const label = place === 'uyda' ? 'Uyda' :
                    place === 'MTT' ? 'MTT' :
                    place === 'maktab' ? 'Maktab' :
                    place === 'DPM' ? 'DPM' :
                    place === 'umumiy_ovqatlanish' ? 'Umumiy ovqatlanish' : 'Boshqa';
      rows.push([label, count]);
    });

    rows.push(['JAMI', cases.length]);

    return rows;
  }

  // Jadval 7: O'choqlar
  static createSalmonellyozTable7(cases) {
    const header = ['O\'choq turi', 'Soni', 'Bemorlar soni'];
    const rows = [header];

    // O'choqlarni guruhlash (outbreak maydoniga asoslangan)
    const outbreaks = {};
    cases.forEach(c => {
      if (c.outbreak) {
        const key = c.outbreak.toString();
        if (!outbreaks[key]) {
          outbreaks[key] = [];
        }
        outbreaks[key].push(c);
      }
    });

    const types = ['uyda', 'MTT', 'maktab', 'DPM', 'umumiy_ovqatlanish', 'boshqa'];

    types.forEach(type => {
      const typeOutbreaks = Object.values(outbreaks).filter(outbreak =>
        outbreak[0]?.infectionSource === type
      );
      const totalPatients = typeOutbreaks.reduce((sum, outbreak) => sum + outbreak.length, 0);

      const label = type === 'uyda' ? 'Uyda' :
                    type === 'MTT' ? 'MTT' :
                    type === 'maktab' ? 'Maktab' :
                    type === 'DPM' ? 'DPM' :
                    type === 'umumiy_ovqatlanish' ? 'Umumiy ovqatlanish' : 'Boshqa';

      rows.push([label, typeOutbreaks.length, totalPatients]);
    });

    const totalOutbreaks = Object.keys(outbreaks).length;
    const totalPatients = Object.values(outbreaks).reduce((sum, outbreak) => sum + outbreak.length, 0);

    rows.push(['JAMI', totalOutbreaks, totalPatients]);

    return rows;
  }

  // Jadval 8: Kontaktlar
  static createSalmonellyozTable8(cases) {
    const header = ['Ko\'rsatkichlar', 'Soni'];
    const rows = [header];

    const totalContacts = cases.reduce((sum, c) => sum + (c.contactsStatus?.length || 0), 0);
    const testedContacts = cases.reduce((sum, c) => {
      return sum + (c.contactsStatus?.filter(contact =>
        contact.diseaseStatus !== 'pending'
      ).length || 0);
    }, 0);
    const positiveContacts = cases.reduce((sum, c) => {
      return sum + (c.contactsStatus?.filter(contact =>
        contact.diseaseStatus === 'disease_found'
      ).length || 0);
    }, 0);

    rows.push(['Jami kontaktlar', totalContacts]);
    rows.push(['Tekshirilgan kontaktlar', testedContacts]);
    rows.push(['Kasallik topilgan kontaktlar', positiveContacts]);
    rows.push(['Sog\'lom kontaktlar', testedContacts - positiveContacts]);

    return rows;
  }

  // Jadval 9: Laboratoriya natijalari
  static createSalmonellyozTable9(cases) {
    const header = ['Ko\'rsatkichlar', 'Soni', 'Foizi'];
    const rows = [header];

    const totalCases = cases.length;
    const confirmedCases = cases.filter(c => c.laboratoryResults?.confirmed).length;
    const notConfirmedCases = totalCases - confirmedCases;

    rows.push([
      'Laboratoriya tasdiqlangan',
      confirmedCases,
      `${((confirmedCases / totalCases) * 100).toFixed(1)}%`
    ]);
    rows.push([
      'Laboratoriya tasdiqlanmagan',
      notConfirmedCases,
      `${((notConfirmedCases / totalCases) * 100).toFixed(1)}%`
    ]);
    rows.push(['JAMI', totalCases, '100%']);

    return rows;
  }

  /**
   * 2. ICH BURUG' (SHIGELLYOZ) HISOBOTI
   * Salmonellyoz bilan deyarli bir xil struktura
   */
  static async generateIchBurugReport(year, region = null) {
    try {
      const startDate = new Date(`${year}-01-01`);
      const endDate = new Date(`${year}-12-31T23:59:59`);

      const query = {
        primaryDiagnosis: { $regex: /shigell|ich.*burug/i },
        illnessDate: { $gte: startDate, $lte: endDate }
      };

      if (region) {
        query.address = { $regex: region, $options: 'i' };
      }

      const cases = await Forma60.find(query);

      const wb = XLSX.utils.book_new();

      // Bir xil jadvallar, faqat nom o'zgaradi
      const table1 = this.createSalmonellyozTable1(cases, year);
      const ws1 = XLSX.utils.aoa_to_sheet(table1);
      XLSX.utils.book_append_sheet(wb, ws1, 'Jadval 1 - Oylik');

      const table2 = this.createSalmonellyozTable2(cases);
      const ws2 = XLSX.utils.aoa_to_sheet(table2);
      XLSX.utils.book_append_sheet(wb, ws2, 'Jadval 2 - Yosh');

      const table3 = this.createSalmonellyozTable3(cases);
      const ws3 = XLSX.utils.aoa_to_sheet(table3);
      XLSX.utils.book_append_sheet(wb, ws3, 'Jadval 3 - Kasblar');

      const table4 = this.createSalmonellyozTable4(cases);
      const ws4 = XLSX.utils.aoa_to_sheet(table4);
      XLSX.utils.book_append_sheet(wb, ws4, 'Jadval 4 - Yuqish');

      // Shigella turlari uchun maxsus jadval
      const table5 = this.createIchBurugTable5(cases);
      const ws5 = XLSX.utils.aoa_to_sheet(table5);
      XLSX.utils.book_append_sheet(wb, ws5, 'Jadval 5 - Turlar');

      const table6 = this.createSalmonellyozTable6(cases);
      const ws6 = XLSX.utils.aoa_to_sheet(table6);
      XLSX.utils.book_append_sheet(wb, ws6, 'Jadval 6 - Joylar');

      const table7 = this.createSalmonellyozTable7(cases);
      const ws7 = XLSX.utils.aoa_to_sheet(table7);
      XLSX.utils.book_append_sheet(wb, ws7, 'Jadval 7 - Ochoqlar');

      const table8 = this.createSalmonellyozTable8(cases);
      const ws8 = XLSX.utils.aoa_to_sheet(table8);
      XLSX.utils.book_append_sheet(wb, ws8, 'Jadval 8 - Kontaktlar');

      const table9 = this.createSalmonellyozTable9(cases);
      const ws9 = XLSX.utils.aoa_to_sheet(table9);
      XLSX.utils.book_append_sheet(wb, ws9, 'Jadval 9 - Lab');

      return wb;
    } catch (error) {
      throw new Error(`Ich burug' hisoboti yaratishda xatolik: ${error.message}`);
    }
  }

  // Shigella turlari
  static createIchBurugTable5(cases) {
    const header = ['Shigella turi', 'Soni'];
    const rows = [header];

    const types = [
      'Fleksner shigellasi',
      'Zonne shigellasi',
      'Boshqa turlar',
      'Aniqlanmagan'
    ];

    types.forEach(type => {
      let count = 0;
      if (type === 'Aniqlanmagan') {
        count = cases.filter(c => !c.laboratoryResults || !c.laboratoryResults.cultureType).length;
      } else if (type === 'Boshqa turlar') {
        count = cases.filter(c =>
          c.laboratoryResults?.cultureType &&
          c.laboratoryResults.cultureType !== 'Fleksner shigellasi' &&
          c.laboratoryResults.cultureType !== 'Zonne shigellasi'
        ).length;
      } else {
        count = cases.filter(c => c.laboratoryResults?.cultureType === type).length;
      }
      rows.push([type, count]);
    });

    rows.push(['JAMI', cases.length]);

    return rows;
  }

  /**
   * 3. O'YuIK (O'TKIR YUQUMLI ICHAK KASALLIKLARI) HISOBOTI
   */
  static async generateOYuIKReport(year, region = null) {
    try {
      const startDate = new Date(`${year}-01-01`);
      const endDate = new Date(`${year}-12-31T23:59:59`);

      const query = {
        $or: [
          { primaryDiagnosis: { $regex: /EPKP/i } },
          { primaryDiagnosis: { $regex: /rotavirus/i } },
          { primaryDiagnosis: { $regex: /o.*tkir.*ichak/i } }
        ],
        illnessDate: { $gte: startDate, $lte: endDate }
      };

      if (region) {
        query.address = { $regex: region, $options: 'i' };
      }

      const cases = await Forma60.find(query);

      const wb = XLSX.utils.book_new();

      // O'YuIK uchun 11 ta jadval
      const table1 = this.createSalmonellyozTable1(cases, year);
      const ws1 = XLSX.utils.aoa_to_sheet(table1);
      XLSX.utils.book_append_sheet(wb, ws1, 'Jadval 1 - Oylik');

      const table2 = this.createSalmonellyozTable2(cases);
      const ws2 = XLSX.utils.aoa_to_sheet(table2);
      XLSX.utils.book_append_sheet(wb, ws2, 'Jadval 2 - Yosh');

      const table3 = this.createSalmonellyozTable3(cases);
      const ws3 = XLSX.utils.aoa_to_sheet(table3);
      XLSX.utils.book_append_sheet(wb, ws3, 'Jadval 3 - Kasblar');

      const table4 = this.createSalmonellyozTable4(cases);
      const ws4 = XLSX.utils.aoa_to_sheet(table4);
      XLSX.utils.book_append_sheet(wb, ws4, 'Jadval 4 - Yuqish');

      const table5 = this.createOYuIKTable5(cases);
      const ws5 = XLSX.utils.aoa_to_sheet(table5);
      XLSX.utils.book_append_sheet(wb, ws5, 'Jadval 5 - Etiologiya');

      const table6 = this.createSalmonellyozTable6(cases);
      const ws6 = XLSX.utils.aoa_to_sheet(table6);
      XLSX.utils.book_append_sheet(wb, ws6, 'Jadval 6 - Joylar');

      const table7 = this.createSalmonellyozTable7(cases);
      const ws7 = XLSX.utils.aoa_to_sheet(table7);
      XLSX.utils.book_append_sheet(wb, ws7, 'Jadval 7 - Ochoqlar');

      const table8 = this.createSalmonellyozTable8(cases);
      const ws8 = XLSX.utils.aoa_to_sheet(table8);
      XLSX.utils.book_append_sheet(wb, ws8, 'Jadval 8 - Kontaktlar');

      const table9 = this.createSalmonellyozTable9(cases);
      const ws9 = XLSX.utils.aoa_to_sheet(table9);
      XLSX.utils.book_append_sheet(wb, ws9, 'Jadval 9 - Lab');

      // Qo'shimcha 2 ta jadval
      const table10 = this.createOYuIKTable10(cases);
      const ws10 = XLSX.utils.aoa_to_sheet(table10);
      XLSX.utils.book_append_sheet(wb, ws10, 'Jadval 10 - Klinik');

      const table11 = this.createOYuIKTable11(cases);
      const ws11 = XLSX.utils.aoa_to_sheet(table11);
      XLSX.utils.book_append_sheet(wb, ws11, 'Jadval 11 - Davolash');

      return wb;
    } catch (error) {
      throw new Error(`O'YuIK hisoboti yaratishda xatolik: ${error.message}`);
    }
  }

  // O'YuIK etiologiyasi
  static createOYuIKTable5(cases) {
    const header = ['Etiologiya', 'Soni'];
    const rows = [header];

    const etiologies = [
      'EPKP',
      'Rotavirus',
      'Boshqa',
      'Aniqlanmagan'
    ];

    etiologies.forEach(etiology => {
      let count = 0;
      if (etiology === 'Aniqlanmagan') {
        count = cases.filter(c => !c.laboratoryResults || !c.laboratoryResults.cultureType).length;
      } else if (etiology === 'Boshqa') {
        count = cases.filter(c =>
          c.laboratoryResults?.cultureType &&
          c.laboratoryResults.cultureType !== 'EPKP' &&
          c.laboratoryResults.cultureType !== 'Rotavirus'
        ).length;
      } else {
        count = cases.filter(c => c.laboratoryResults?.cultureType === etiology).length;
      }
      rows.push([etiology, count]);
    });

    rows.push(['JAMI', cases.length]);

    return rows;
  }

  // Klinik shakllari
  static createOYuIKTable10(cases) {
    const header = ['Klinik shakli', 'Soni'];
    const rows = [header];

    rows.push(['Yengil shakl', cases.filter(c => c.clinicalForm === 'yengil').length]);
    rows.push(['O\'rta shakl', cases.filter(c => c.clinicalForm === 'o\'rta').length]);
    rows.push(['Og\'ir shakl', cases.filter(c => c.clinicalForm === 'og\'ir').length]);
    rows.push(['JAMI', cases.length]);

    return rows;
  }

  // Davolash natijalari
  static createOYuIKTable11(cases) {
    const header = ['Natija', 'Soni'];
    const rows = [header];

    rows.push(['Sog\'aydi', cases.filter(c => c.outcome === 'sog\'aydi').length]);
    rows.push(['Davolanmoqda', cases.filter(c => c.outcome === 'davolanmoqda').length]);
    rows.push(['O\'lim', cases.filter(c => c.outcome === 'o\'lim').length]);
    rows.push(['JAMI', cases.length]);

    return rows;
  }
}

module.exports = ExcelReportGenerator;
