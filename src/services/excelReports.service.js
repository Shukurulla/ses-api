const XLSX = require('xlsx');
const path = require('path');
const Karta = require('../models/Karta');
const Forma60 = require('../models/Forma60');

/**
 * Excel hisobotlar uchun service
 * Template fayllardan nusxa olib, ma'lumotlarni to'ldiradi
 */

class ExcelReportsService {
  constructor() {
    this.templatesPath = path.join(__dirname, '../../templates');
  }

  /**
   * Yilni olish va validatsiya qilish
   */
  parseYear(yearParam) {
    const year = parseInt(yearParam);
    if (isNaN(year) || year < 2000 || year > 2100) {
      return new Date().getFullYear();
    }
    return year;
  }

  /**
   * Oylar nomlarini olish
   */
  getMonthNames() {
    return [
      'yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun',
      'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'
    ];
  }

  /**
   * Salmonellyoz hisoboti
   */
  async generateSalmonellyozReport(year) {
    const templatePath = path.join(this.templatesPath, 'salmonellyoz_template.xlsx');
    const workbook = XLSX.readFile(templatePath);

    // Forma60 va Karta ma'lumotlarini olish
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);

    const forma60s = await Forma60.find({
      primaryDiagnosis: { $regex: /salmonell/i },
      illnessDate: { $gte: startDate, $lte: endDate },
      isDeleted: false
    }).populate('address.mahalla createdBy');

    const kartas = await Karta.find({
      'laboratoryResults.cultureType': { $regex: /salmonell/i },
      createdAt: { $gte: startDate, $lte: endDate },
      isDeleted: false
    }).populate('forma60 createdBy');

    // 1-jadval: Yosh guruhlari bo'yicha tahlil
    this.fillTable1_AgeAnalysis(workbook, forma60s, kartas);

    // 2-jadval: Oylik dinamika
    this.fillTable2_MonthlyDynamics(workbook, forma60s, kartas);

    // 3-jadval: Kasblar bo'yicha
    this.fillTable3_ByProfession(workbook, forma60s, kartas);

    // 4-jadval: Yuqish omillari
    this.fillTable4_InfectionFactors(workbook, forma60s, kartas);

    // 5-jadval: Yuqish joylari
    this.fillTable5_InfectionPlaces(workbook, forma60s, kartas);

    // 6-jadval: Oziq-ovqat mahsulotlari
    this.fillTable6_FoodProducts(workbook, forma60s, kartas);

    // 7-jadval: Laboratoriya natijalari
    this.fillTable7_LabResults(workbook, forma60s, kartas);

    // 8-jadval: O'choqlar
    this.fillTable8_Outbreaks(workbook, forma60s, kartas);

    // 9-jadval: Kontaktlar
    this.fillTable9_Contacts(workbook, forma60s, kartas);

    return workbook;
  }

  /**
   * 1-jadval: Yosh guruhlari bo'yicha tahlil
   */
  fillTable1_AgeAnalysis(workbook, forma60s, kartas) {
    const sheet = workbook.Sheets['1-жадвал'];
    if (!sheet) return;

    // Oylar bo'yicha yosh guruhlarini hisoblash
    const monthNames = this.getMonthNames();

    monthNames.forEach((monthName, monthIndex) => {
      const rowNum = monthIndex + 5; // 5-qatordan boshlanadi

      // Shu oyga tegishli forma60larni filtrlash
      const monthData = forma60s.filter(f => {
        const date = new Date(f.illnessDate);
        return date.getMonth() === monthIndex;
      });

      // Yosh guruhlari
      const ageGroups = {
        under1: monthData.filter(f => f.age < 1),
        age1to2: monthData.filter(f => f.age >= 1 && f.age <= 2),
        age3to5: monthData.filter(f => f.age >= 3 && f.age <= 5),
        age6to14: monthData.filter(f => f.age >= 6 && f.age <= 14),
        age15to17: monthData.filter(f => f.age >= 15 && f.age <= 17),
        age18plus: monthData.filter(f => f.age >= 18)
      };

      // Ma'lumotlarni yozish
      const cellPrefix = String.fromCharCode(65); // 'A'

      // Absolute sonlar
      sheet[`C${rowNum}`] = { t: 'n', v: ageGroups.under1.length };
      sheet[`E${rowNum}`] = { t: 'n', v: ageGroups.age1to2.length };
      sheet[`G${rowNum}`] = { t: 'n', v: ageGroups.age3to5.length };
      sheet[`I${rowNum}`] = { t: 'n', v: ageGroups.age6to14.length };
      sheet[`K${rowNum}`] = { t: 'n', v: ageGroups.age15to17.length };
      sheet[`M${rowNum}`] = { t: 'n', v: ageGroups.age18plus.length };

      // Jami
      const total = monthData.length;
      sheet[`O${rowNum}`] = { t: 'n', v: total };

      // Intensiv ko'rsatkich (int.) - 100,000 ga nisbatan
      // Bu yerda aholini hisoblamasangiz, 0 qo'yamiz
      sheet[`D${rowNum}`] = { t: 'n', v: 0, z: '0.0' };
      sheet[`F${rowNum}`] = { t: 'n', v: 0, z: '0.0' };
      sheet[`H${rowNum}`] = { t: 'n', v: 0, z: '0.0' };
      sheet[`J${rowNum}`] = { t: 'n', v: 0, z: '0.0' };
      sheet[`L${rowNum}`] = { t: 'n', v: 0, z: '0.0' };
      sheet[`N${rowNum}`] = { t: 'n', v: 0, z: '0.0' };
      sheet[`P${rowNum}`] = { t: 'n', v: 0, z: '0.0' };
    });

    // Jami qator (17-qator)
    const totalRow = 17;
    let totalUnder1 = 0, total1to2 = 0, total3to5 = 0;
    let total6to14 = 0, total15to17 = 0, total18plus = 0;

    forma60s.forEach(f => {
      if (f.age < 1) totalUnder1++;
      else if (f.age >= 1 && f.age <= 2) total1to2++;
      else if (f.age >= 3 && f.age <= 5) total3to5++;
      else if (f.age >= 6 && f.age <= 14) total6to14++;
      else if (f.age >= 15 && f.age <= 17) total15to17++;
      else if (f.age >= 18) total18plus++;
    });

    sheet[`C${totalRow}`] = { t: 'n', v: totalUnder1 };
    sheet[`E${totalRow}`] = { t: 'n', v: total1to2 };
    sheet[`G${totalRow}`] = { t: 'n', v: total3to5 };
    sheet[`I${totalRow}`] = { t: 'n', v: total6to14 };
    sheet[`K${totalRow}`] = { t: 'n', v: total15to17 };
    sheet[`M${totalRow}`] = { t: 'n', v: total18plus };
    sheet[`O${totalRow}`] = { t: 'n', v: forma60s.length };
  }

  /**
   * 2-jadval: Oylik dinamika
   */
  fillTable2_MonthlyDynamics(workbook, forma60s, kartas) {
    const sheet = workbook.Sheets['2-жадвал'];
    if (!sheet) return;

    const monthNames = this.getMonthNames();

    monthNames.forEach((monthName, monthIndex) => {
      const rowNum = monthIndex + 5;

      const monthData = forma60s.filter(f => {
        const date = new Date(f.illnessDate);
        return date.getMonth() === monthIndex;
      });

      // Kasallanganlar soni
      sheet[`C${rowNum}`] = { t: 'n', v: monthData.length };

      // Vafot etganlar (agar forma60 da treatmentOutcome maydoni bo'lsa)
      const deceased = monthData.filter(f => f.treatmentOutcome === 'o\'lim').length;
      sheet[`D${rowNum}`] = { t: 'n', v: deceased };

      // Boshqa ustunlar uchun ham xuddi shunday logika
    });
  }

  /**
   * 3-jadval: Kasblar bo'yicha
   */
  fillTable3_ByProfession(workbook, forma60s, kartas) {
    const sheet = workbook.Sheets['3-жадвал'];
    if (!sheet) return;

    // Kartalardan kasb ma'lumotlarini olish
    const professionGroups = {
      students: 0,
      workers: 0,
      medical: 0,
      food: 0,
      others: 0
    };

    kartas.forEach(k => {
      if (k.patientStatus === 'oqiydi') professionGroups.students++;
      else if (k.workType === 'medic') professionGroups.medical++;
      else if (k.workType === 'restoran') professionGroups.food++;
      else if (k.patientStatus === 'ishlaydi') professionGroups.workers++;
      else professionGroups.others++;
    });

    // Ma'lumotlarni yozish
    // Qator raqamlari template ga qarab sozlanadi
  }

  /**
   * 4-jadval: Yuqish omillari
   */
  fillTable4_InfectionFactors(workbook, forma60s, kartas) {
    const sheet = workbook.Sheets['4-жадвал'];
    if (!sheet) return;

    // Kartalardan transmissionFactor ni hisoblash
    const factors = {};
    kartas.forEach(k => {
      const factor = k.transmissionFactor || 'Boshqa';
      factors[factor] = (factors[factor] || 0) + 1;
    });

    // Template ga mos ravishda to'ldirish
  }

  /**
   * 5-jadval: Yuqish joylari
   */
  fillTable5_InfectionPlaces(workbook, forma60s, kartas) {
    const sheet = workbook.Sheets['5-жадвал'];
    if (!sheet) return;

    // Kartalardan infectionSource ni hisoblash
    const sources = {};
    kartas.forEach(k => {
      const source = k.infectionSource || 'Boshqa';
      sources[source] = (sources[source] || 0) + 1;
    });
  }

  /**
   * 6-jadval: Oziq-ovqat mahsulotlari
   */
  fillTable6_FoodProducts(workbook, forma60s, kartas) {
    const sheet = workbook.Sheets['6-жадвал'];
    if (!sheet) return;

    // Forma60 dan foodInspection ma'lumotlarini hisoblash
  }

  /**
   * 7-jadval: Laboratoriya natijalari
   */
  fillTable7_LabResults(workbook, forma60s, kartas) {
    const sheet = workbook.Sheets['7-жадвал'];
    if (!sheet) return;

    // Kartalardan laboratoryResults.cultureType ni hisoblash
    const cultureTypes = {};
    kartas.forEach(k => {
      if (k.laboratoryResults && k.laboratoryResults.cultureType) {
        const type = k.laboratoryResults.cultureType;
        cultureTypes[type] = (cultureTypes[type] || 0) + 1;
      }
    });
  }

  /**
   * 8-jadval: O'choqlar
   */
  fillTable8_Outbreaks(workbook, forma60s, kartas) {
    const sheet = workbook.Sheets['8-жадвал'];
    if (!sheet) return;

    // Kartalardan outbreak ma'lumotlarini hisoblash
    const outbreaks = kartas.filter(k => k.outbreak && k.outbreak.hasOutbreak);
  }

  /**
   * 9-jadval: Kontaktlar
   */
  fillTable9_Contacts(workbook, forma60s, kartas) {
    const sheet = workbook.Sheets['9-жадвал'];
    if (!sheet) return;

    // Forma60 dan contactsCount ni hisoblash
    const totalContacts = forma60s.reduce((sum, f) => sum + (f.contactsCount || 0), 0);
  }

  /**
   * Ich burug' hisoboti
   */
  async generateIchBurugReport(year) {
    const templatePath = path.join(this.templatesPath, 'ich-burug_template.xlsx');
    const workbook = XLSX.readFile(templatePath);

    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);

    const forma60s = await Forma60.find({
      primaryDiagnosis: { $regex: /burug|shigellyoz|dizenteriya/i },
      illnessDate: { $gte: startDate, $lte: endDate },
      isDeleted: false
    }).populate('address.mahalla createdBy');

    const kartas = await Karta.find({
      'laboratoryResults.cultureType': { $regex: /shigella|fleksner|zonne/i },
      createdAt: { $gte: startDate, $lte: endDate },
      isDeleted: false
    }).populate('forma60 createdBy');

    // Jadvallarni to'ldirish (Salmonellyoz bilan bir xil logika)
    this.fillTable1_AgeAnalysis(workbook, forma60s, kartas);
    // ... qolgan jadvallar

    return workbook;
  }

  /**
   * O'YuIK hisoboti
   */
  async generateOYuIKReport(year) {
    const templatePath = path.join(this.templatesPath, 'oyuik_template.xlsx');
    const workbook = XLSX.readFile(templatePath);

    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);

    const forma60s = await Forma60.find({
      primaryDiagnosis: { $regex: /yuqumli ich|o'yuik|ich infeksiya/i },
      illnessDate: { $gte: startDate, $lte: endDate },
      isDeleted: false
    }).populate('address.mahalla createdBy');

    const kartas = await Karta.find({
      'laboratoryResults.cultureType': {
        $in: ['EPKP', 'Citrobakter', 'Enterobakter', 'Klebsiella', 'E.coli', 'Rotavirus']
      },
      createdAt: { $gte: startDate, $lte: endDate },
      isDeleted: false
    }).populate('forma60 createdBy');

    // Jadvallarni to'ldirish
    this.fillTable1_AgeAnalysis(workbook, forma60s, kartas);
    // ... qolgan jadvallar (11 ta jadval)

    return workbook;
  }
}

module.exports = new ExcelReportsService();
