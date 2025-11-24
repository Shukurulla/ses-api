const XLSX = require('xlsx');
const path = require('path');
const Karta = require('../models/Karta');
const Forma60 = require('../models/Forma60');

/**
 * Excel hisobotlar - TEMPLATE FAYLLARNI TO'LIQ SAQLASH
 * Faqat ma'lumot katakchalarini to'ldirish
 */

class ExcelReportsService {
  constructor() {
    this.templatesPath = path.join(__dirname, '../../templates');
  }

  /**
   * Yilni parse qilish
   */
  parseYear(yearParam) {
    const year = parseInt(yearParam);
    if (isNaN(year) || year < 2000 || year > 2100) {
      return new Date().getFullYear();
    }
    return year;
  }

  /**
   * Salmonellyoz hisoboti
   */
  async generateSalmonellyozReport(year) {
    // Templateni o'qish - HECH NARSA O'ZGARTIRMASDAN!
    const templatePath = path.join(this.templatesPath, 'salmonellyoz_template.xlsx');
    const workbook = XLSX.readFile(templatePath, {
      cellStyles: true,
      cellFormula: true,
      cellHTML: false,
      cellNF: true,
      cellDates: true,
      sheetStubs: true
    });

    // Ma'lumotlarni olish
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

    console.log(`Forma60: ${forma60s.length}, Kartas: ${kartas.length}`);

    // 1-JADVAL: Yosh bo'yicha tahlil
    this.fillSheet1_AgeAnalysis(workbook, forma60s);

    // 2-JADVAL: Yasli yosh guruhlari
    this.fillSheet2_PreschoolAge(workbook, forma60s);

    // 3-JADVAL: Yuqish joylari
    this.fillSheet3_InfectionPlaces(workbook, kartas);

    // 4-JADVAL: Kasblar bo'yicha
    this.fillSheet4_Professions(workbook, kartas);

    // 5-JADVAL: Yuqish omillari
    this.fillSheet5_InfectionFactors(workbook, kartas);

    // 6-JADVAL: O'choqlar
    this.fillSheet6_Outbreaks(workbook, kartas);

    // 7-JADVAL: Mikrobiologik peyzaj
    this.fillSheet7_Microbiology(workbook, kartas);

    // 8-JADVAL: Atrof-muhit
    this.fillSheet8_Environment(workbook, forma60s);

    // 9-JADVAL: O'choqlar va kontaktlar
    this.fillSheet9_OutbreaksContacts(workbook, forma60s, kartas);

    return workbook;
  }

  /**
   * 1-JADVAL: Yosh bo'yicha tahlil
   * Template: Row 5-16 (12 oy), Row 17 (Jami)
   * Columns: C-P (yosh guruhlari)
   */
  fillSheet1_AgeAnalysis(workbook, forma60s) {
    const sheet = workbook.Sheets['1-жадвал'];
    if (!sheet) return;

    // Oylar bo'yicha ma'lumotlarni guruhlash
    for (let month = 0; month < 12; month++) {
      const rowNum = month + 5; // Row 5-16

      // Shu oyga tegishli forma60lar
      const monthData = forma60s.filter(f => {
        const date = new Date(f.illnessDate);
        return date.getMonth() === month;
      });

      // Yosh guruhlari
      const under1 = monthData.filter(f => f.age < 1).length;
      const age1to2 = monthData.filter(f => f.age >= 1 && f.age <= 2).length;
      const age3to5 = monthData.filter(f => f.age >= 3 && f.age <= 5).length;
      const age6to14 = monthData.filter(f => f.age >= 6 && f.age <= 14).length;
      const age15to17 = monthData.filter(f => f.age >= 15 && f.age <= 17).length;
      const age18plus = monthData.filter(f => f.age >= 18).length;
      const total = monthData.length;

      // Ma'lumotlarni yozish (absolute sonlar)
      this.setCellValue(sheet, `C${rowNum}`, under1);      // 1 yoshgacha abs
      this.setCellValue(sheet, `D${rowNum}`, 0);           // 1 yoshgacha int
      this.setCellValue(sheet, `E${rowNum}`, age1to2);     // 1-2 yosh abs
      this.setCellValue(sheet, `F${rowNum}`, 0);           // 1-2 yosh int
      this.setCellValue(sheet, `G${rowNum}`, age3to5);     // 3-5 yosh abs
      this.setCellValue(sheet, `H${rowNum}`, 0);           // 3-5 yosh int
      this.setCellValue(sheet, `I${rowNum}`, age6to14);    // 6-14 yosh abs
      this.setCellValue(sheet, `J${rowNum}`, 0);           // 6-14 yosh int
      this.setCellValue(sheet, `K${rowNum}`, age15to17);   // 15-17 yosh abs
      this.setCellValue(sheet, `L${rowNum}`, 0);           // 15-17 yosh int
      this.setCellValue(sheet, `M${rowNum}`, age18plus);   // 18+ abs
      this.setCellValue(sheet, `N${rowNum}`, 0);           // 18+ int
      this.setCellValue(sheet, `O${rowNum}`, total);       // Jami abs
      this.setCellValue(sheet, `P${rowNum}`, 0);           // Jami int
    }

    // Row 17 - Jami
    const totalUnder1 = forma60s.filter(f => f.age < 1).length;
    const totalAge1to2 = forma60s.filter(f => f.age >= 1 && f.age <= 2).length;
    const totalAge3to5 = forma60s.filter(f => f.age >= 3 && f.age <= 5).length;
    const totalAge6to14 = forma60s.filter(f => f.age >= 6 && f.age <= 14).length;
    const totalAge15to17 = forma60s.filter(f => f.age >= 15 && f.age <= 17).length;
    const totalAge18plus = forma60s.filter(f => f.age >= 18).length;
    const grandTotal = forma60s.length;

    this.setCellValue(sheet, 'C17', totalUnder1);
    this.setCellValue(sheet, 'E17', totalAge1to2);
    this.setCellValue(sheet, 'G17', totalAge3to5);
    this.setCellValue(sheet, 'I17', totalAge6to14);
    this.setCellValue(sheet, 'K17', totalAge15to17);
    this.setCellValue(sheet, 'M17', totalAge18plus);
    this.setCellValue(sheet, 'O17', grandTotal);
  }

  /**
   * 2-JADVAL: Yasli yosh guruhlari
   */
  fillSheet2_PreschoolAge(workbook, forma60s) {
    const sheet = workbook.Sheets['2-жадвал'];
    if (!sheet) return;

    // Row 5-16: oylar
    for (let month = 0; month < 12; month++) {
      const rowNum = month + 5;
      const monthData = forma60s.filter(f => new Date(f.illnessDate).getMonth() === month);

      // Yasli yoshdagilar (organized preschool)
      const organized = monthData.filter(f => f.age < 7).length; // Misol
      // Uyushmagan yasli yoshdagilar
      const unorganized = 0;

      this.setCellValue(sheet, `C${rowNum}`, organized);
      this.setCellValue(sheet, `E${rowNum}`, unorganized);
    }

    // Row 17: Jami
    this.setCellValue(sheet, 'C17', forma60s.filter(f => f.age < 7).length);
  }

  /**
   * 3-JADVAL: Yuqish joylari
   */
  fillSheet3_InfectionPlaces(workbook, kartas) {
    const sheet = workbook.Sheets['3-жадвал'];
    if (!sheet) return;

    // Columns: C-I (Jami, Uyda, MTT, Maktab, DPM, Umumiy ovqatlanish, Boshqa)
    for (let month = 0; month < 12; month++) {
      const rowNum = month + 5;
      const monthKartas = kartas.filter(k => new Date(k.createdAt).getMonth() === month);

      const uyda = monthKartas.filter(k => k.infectionSource === 'Uyda').length;
      const mtt = monthKartas.filter(k => k.infectionSource === 'MTT').length;
      const maktab = monthKartas.filter(k => k.infectionSource === 'Maktab').length;
      const dpm = monthKartas.filter(k => k.infectionSource === 'DPM').length;
      const ovqat = monthKartas.filter(k => k.infectionSource === 'Umumiy ovqatlanish korxonalari').length;
      const boshqa = monthKartas.filter(k => k.infectionSource === 'Boshqa').length;
      const total = monthKartas.length;

      this.setCellValue(sheet, `C${rowNum}`, total);
      this.setCellValue(sheet, `D${rowNum}`, uyda);
      this.setCellValue(sheet, `E${rowNum}`, mtt);
      this.setCellValue(sheet, `F${rowNum}`, maktab);
      this.setCellValue(sheet, `G${rowNum}`, dpm);
      this.setCellValue(sheet, `H${rowNum}`, ovqat);
      this.setCellValue(sheet, `I${rowNum}`, boshqa);
    }

    // Row 16: Jami
    const total = kartas.length;
    const uyda = kartas.filter(k => k.infectionSource === 'Uyda').length;
    const mtt = kartas.filter(k => k.infectionSource === 'MTT').length;
    const maktab = kartas.filter(k => k.infectionSource === 'Maktab').length;
    const dpm = kartas.filter(k => k.infectionSource === 'DPM').length;
    const ovqat = kartas.filter(k => k.infectionSource === 'Umumiy ovqatlanish korxonalari').length;
    const boshqa = kartas.filter(k => k.infectionSource === 'Boshqa').length;

    this.setCellValue(sheet, 'C16', total);
    this.setCellValue(sheet, 'D16', uyda);
    this.setCellValue(sheet, 'E16', mtt);
    this.setCellValue(sheet, 'F16', maktab);
    this.setCellValue(sheet, 'G16', dpm);
    this.setCellValue(sheet, 'H16', ovqat);
    this.setCellValue(sheet, 'I16', boshqa);
  }

  /**
   * 4-JADVAL: Kasblar bo'yicha
   */
  fillSheet4_Professions(workbook, kartas) {
    const sheet = workbook.Sheets['4-жадвал'];
    if (!sheet) return;

    // Bu jadval katta va ko'p ustunli
    // Umumiy kasb guruhlarini to'ldirish
    for (let month = 0; month < 12; month++) {
      const rowNum = month + 5;
      const monthKartas = kartas.filter(k => new Date(k.createdAt).getMonth() === month);

      // Kasblar: students, medical, food workers, etc
      const students = monthKartas.filter(k => k.patientStatus === 'oqiydi').length;
      const medical = monthKartas.filter(k => k.workType === 'medic').length;
      const food = monthKartas.filter(k => k.workType === 'restoran').length;
      const water = monthKartas.filter(k => k.workType === 'suv').length;
      const others = monthKartas.filter(k => k.patientStatus === 'boshqa').length;

      this.setCellValue(sheet, `C${rowNum}`, monthKartas.length); // Jami
      // Boshqa ustunlar...
    }
  }

  /**
   * 5-JADVAL: Yuqish omillari
   */
  fillSheet5_InfectionFactors(workbook, kartas) {
    const sheet = workbook.Sheets['5-жадвал'];
    if (!sheet) return;

    for (let month = 0; month < 12; month++) {
      const rowNum = month + 5;
      const monthKartas = kartas.filter(k => new Date(k.createdAt).getMonth() === month);

      const suv = monthKartas.filter(k => k.transmissionFactor === 'Suv').length;
      const ovqat = monthKartas.filter(k => k.transmissionFactor === 'Oziq-ovqat').length;
      const sut = monthKartas.filter(k => k.transmissionFactor === 'Sut mahsulotlari').length;
      const gosht = monthKartas.filter(k => k.transmissionFactor === 'Gosht mahsulotlari').length;

      this.setCellValue(sheet, `C${rowNum}`, monthKartas.length);
      // Yuqish omillarini to'ldirish...
    }
  }

  /**
   * 6-JADVAL: O'choqlar
   */
  fillSheet6_Outbreaks(workbook, kartas) {
    const sheet = workbook.Sheets['6-жадвал'];
    if (!sheet) return;

    for (let month = 0; month < 12; month++) {
      const rowNum = month + 5;
      const monthKartas = kartas.filter(k => new Date(k.createdAt).getMonth() === month);

      const outbreaks = monthKartas.filter(k => k.outbreak && k.outbreak.hasOutbreak).length;

      this.setCellValue(sheet, `C${rowNum}`, outbreaks);
    }
  }

  /**
   * 7-JADVAL: Mikrobiologik peyzaj
   */
  fillSheet7_Microbiology(workbook, kartas) {
    const sheet = workbook.Sheets['7-жадвал'];
    if (!sheet) return;

    for (let month = 0; month < 12; month++) {
      const rowNum = month + 5;
      const monthKartas = kartas.filter(k => new Date(k.createdAt).getMonth() === month);

      const salmonellaTif = monthKartas.filter(k =>
        k.laboratoryResults?.cultureType === 'Salmonella tifimurium'
      ).length;
      const salmonellaEnt = monthKartas.filter(k =>
        k.laboratoryResults?.cultureType === 'Salmonella enteriditis'
      ).length;

      this.setCellValue(sheet, `C${rowNum}`, monthKartas.length);
      this.setCellValue(sheet, `D${rowNum}`, salmonellaTif);
      this.setCellValue(sheet, `E${rowNum}`, salmonellaEnt);
    }
  }

  /**
   * 8-JADVAL: Atrof-muhit
   */
  fillSheet8_Environment(workbook, forma60s) {
    const sheet = workbook.Sheets['8-жадвал'];
    if (!sheet) return;

    // Atrof-muhit tekshiruvlari
    // Bu ma'lumotlar forma60.foodInspection dan olinadi
  }

  /**
   * 9-JADVAL: O'choqlar va kontaktlar
   */
  fillSheet9_OutbreaksContacts(workbook, forma60s, kartas) {
    const sheet = workbook.Sheets['9-жадвал'];
    if (!sheet) return;

    for (let month = 0; month < 12; month++) {
      const rowNum = month + 5;
      const monthForma60s = forma60s.filter(f => new Date(f.illnessDate).getMonth() === month);

      const totalContacts = monthForma60s.reduce((sum, f) => sum + (f.contactsCount || 0), 0);

      this.setCellValue(sheet, `C${rowNum}`, monthForma60s.length);
      this.setCellValue(sheet, `E${rowNum}`, totalContacts);
    }
  }

  /**
   * Helper: Katakchaga qiymat yozish (formatni saqlab)
   */
  setCellValue(sheet, cellAddress, value) {
    const cell = sheet[cellAddress];

    if (cell) {
      // Mavjud katakchani yangilash (format saqlanadi)
      cell.v = value;
      cell.t = typeof value === 'number' ? 'n' : 's';
    } else {
      // Yangi katakcha yaratish
      sheet[cellAddress] = {
        v: value,
        t: typeof value === 'number' ? 'n' : 's'
      };
    }
  }

  /**
   * Ich burug' hisoboti
   */
  async generateIchBurugReport(year) {
    const templatePath = path.join(this.templatesPath, 'ich-burug_template.xlsx');
    const workbook = XLSX.readFile(templatePath, {
      cellStyles: true,
      cellFormula: true
    });

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

    // Xuddi Salmonellyoz kabi jadvallarni to'ldirish
    this.fillSheet1_AgeAnalysis(workbook, forma60s);
    this.fillSheet2_PreschoolAge(workbook, forma60s);
    this.fillSheet3_InfectionPlaces(workbook, kartas);
    // ...

    return workbook;
  }

  /**
   * O'YuIK hisoboti
   */
  async generateOYuIKReport(year) {
    const templatePath = path.join(this.templatesPath, 'oyuik_template.xlsx');
    const workbook = XLSX.readFile(templatePath, {
      cellStyles: true,
      cellFormula: true
    });

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

    // 11 ta jadval to'ldirish
    this.fillSheet1_AgeAnalysis(workbook, forma60s);
    // ...

    return workbook;
  }
}

module.exports = new ExcelReportsService();
