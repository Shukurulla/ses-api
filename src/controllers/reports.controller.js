const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const Forma60 = require('../models/Forma60');
const District = require('../models/District');

// Excel hisobotlarini yaratish uchun controller

/**
 * Salmonellyoz hisoboti (2-ilova)
 */
exports.exportSalmonellyoz = async (req, res) => {
  try {
    const { startDate, endDate, year = 2024 } = req.query;

    // Ma'lumotlarni olish
    const query = {
      primaryDiagnosis: 'Salmonellyoz',
      isDeleted: false
    };

    if (startDate && endDate) {
      query.illnessDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const cases = await Forma60.find(query)
      .populate('address.mahalla', 'name')
      .sort({ illnessDate: 1 });

    // Template faylni o'qish
    const templatePath = path.join(__dirname, '../../templates/2_ilova_2024_yil_Salmonellyoz_xisobot_shakli_xlsx_12_айлык.xlsx');

    let workbook;
    if (fs.existsSync(templatePath)) {
      workbook = XLSX.readFile(templatePath);
    } else {
      // Agar template bo'lmasa, yangi workbook yaratamiz
      workbook = XLSX.utils.book_new();
    }

    // Ma'lumotlarni oylar bo'yicha guruplash
    const monthlyData = {};
    for (let month = 1; month <= 12; month++) {
      monthlyData[month] = {
        total: 0,
        hospitalized: 0,
        children: 0,
        adults: 0,
        deceased: 0,
        byDistrict: {}
      };
    }

    cases.forEach(caseItem => {
      const month = new Date(caseItem.illnessDate).getMonth() + 1;
      const districtName = caseItem.address?.mahalla?.name || 'Noma\'lum';

      monthlyData[month].total++;
      if (caseItem.hospitalized) monthlyData[month].hospitalized++;
      if (caseItem.age < 18) monthlyData[month].children++;
      else monthlyData[month].adults++;
      if (caseItem.treatmentOutcome === 'o\'lim') monthlyData[month].deceased++;

      if (!monthlyData[month].byDistrict[districtName]) {
        monthlyData[month].byDistrict[districtName] = 0;
      }
      monthlyData[month].byDistrict[districtName]++;
    });

    // Excel ma'lumotlarini tayyorlash
    const data = [];

    // Sarlavha
    data.push(['SALMONELLYOZ BO\'YICHA HISOBOT', '', '', '', '', '', '', '', '', '', '', '', '']);
    data.push([`${year} yil`, '', '', '', '', '', '', '', '', '', '', '', '']);
    data.push(['']); // Bo'sh qator

    // Ustun sarlavhalari
    data.push([
      '№',
      'Yanvar',
      'Fevral',
      'Mart',
      'Aprel',
      'May',
      'Iyun',
      'Iyul',
      'Avgust',
      'Sentabr',
      'Oktabr',
      'Noyabr',
      'Dekabr',
      'JAMI'
    ]);

    // Jami holatlar
    const totalRow = ['Jami holatlar'];
    let yearTotal = 0;
    for (let month = 1; month <= 12; month++) {
      totalRow.push(monthlyData[month].total);
      yearTotal += monthlyData[month].total;
    }
    totalRow.push(yearTotal);
    data.push(totalRow);

    // Kasalxonaga yotqizilganlar
    const hospitalizedRow = ['Kasalxonaga yotqizilgan'];
    let yearHospitalized = 0;
    for (let month = 1; month <= 12; month++) {
      hospitalizedRow.push(monthlyData[month].hospitalized);
      yearHospitalized += monthlyData[month].hospitalized;
    }
    hospitalizedRow.push(yearHospitalized);
    data.push(hospitalizedRow);

    // Bolalar
    const childrenRow = ['Bolalar (0-17 yosh)'];
    let yearChildren = 0;
    for (let month = 1; month <= 12; month++) {
      childrenRow.push(monthlyData[month].children);
      yearChildren += monthlyData[month].children;
    }
    childrenRow.push(yearChildren);
    data.push(childrenRow);

    // Kattalar
    const adultsRow = ['Kattalar (18+ yosh)'];
    let yearAdults = 0;
    for (let month = 1; month <= 12; month++) {
      adultsRow.push(monthlyData[month].adults);
      yearAdults += monthlyData[month].adults;
    }
    adultsRow.push(yearAdults);
    data.push(adultsRow);

    // O'lim holatlari
    const deceasedRow = ['O\'lim holatlari'];
    let yearDeceased = 0;
    for (let month = 1; month <= 12; month++) {
      deceasedRow.push(monthlyData[month].deceased);
      yearDeceased += monthlyData[month].deceased;
    }
    deceasedRow.push(yearDeceased);
    data.push(deceasedRow);

    // Worksheet yaratish
    const ws = XLSX.utils.aoa_to_sheet(data);

    // Ustunlar kengligi
    ws['!cols'] = [
      { wch: 30 }, // Ko'rsatkich
      { wch: 10 }, // Yanvar
      { wch: 10 }, // Fevral
      { wch: 10 }, // Mart
      { wch: 10 }, // Aprel
      { wch: 10 }, // May
      { wch: 10 }, // Iyun
      { wch: 10 }, // Iyul
      { wch: 10 }, // Avgust
      { wch: 10 }, // Sentabr
      { wch: 10 }, // Oktabr
      { wch: 10 }, // Noyabr
      { wch: 10 }, // Dekabr
      { wch: 12 }  // JAMI
    ];

    // Workbook ga qo'shish
    if (workbook.SheetNames.includes('Hisobot')) {
      workbook.Sheets['Hisobot'] = ws;
    } else {
      XLSX.utils.book_append_sheet(workbook, ws, 'Hisobot');
    }

    // Buffer ga yozish
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Response
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Salmonellyoz_hisobot_${year}.xlsx`);
    res.send(buffer);

  } catch (error) {
    console.error('Salmonellyoz hisoboti yaratishda xatolik:', error);
    res.status(500).json({ success: false, message: 'Hisobot yaratishda xatolik yuz berdi' });
  }
};

/**
 * Ich burug'i (dizenteriya) hisoboti (3-ilova)
 */
exports.exportIchBurugi = async (req, res) => {
  try {
    const { startDate, endDate, year = 2024 } = req.query;

    const query = {
      primaryDiagnosis: 'Ich burug\'i (dizenteriya)',
      isDeleted: false
    };

    if (startDate && endDate) {
      query.illnessDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const cases = await Forma60.find(query)
      .populate('address.mahalla', 'name')
      .sort({ illnessDate: 1 });

    const templatePath = path.join(__dirname, '../../templates/3_ilova_2024_yil_Ich_burug\'_xisobot shakli (1).xlsx');

    let workbook;
    if (fs.existsSync(templatePath)) {
      workbook = XLSX.readFile(templatePath);
    } else {
      workbook = XLSX.utils.book_new();
    }

    // Ma'lumotlarni oylar bo'yicha guruplash
    const monthlyData = {};
    for (let month = 1; month <= 12; month++) {
      monthlyData[month] = {
        total: 0,
        hospitalized: 0,
        children: 0,
        adults: 0,
        deceased: 0,
        laboratoryConfirmed: 0
      };
    }

    cases.forEach(caseItem => {
      const month = new Date(caseItem.illnessDate).getMonth() + 1;

      monthlyData[month].total++;
      if (caseItem.hospitalized) monthlyData[month].hospitalized++;
      if (caseItem.age < 18) monthlyData[month].children++;
      else monthlyData[month].adults++;
      if (caseItem.treatmentOutcome === 'o\'lim') monthlyData[month].deceased++;
      if (caseItem.diagnosisMethod === 'laboratoriya') monthlyData[month].laboratoryConfirmed++;
    });

    const data = [];
    data.push(['ICH BURUG\'I (DIZENTERIYA) BO\'YICHA HISOBOT', '', '', '', '', '', '', '', '', '', '', '', '']);
    data.push([`${year} yil`, '', '', '', '', '', '', '', '', '', '', '', '']);
    data.push(['']);

    data.push([
      '№',
      'Yanvar',
      'Fevral',
      'Mart',
      'Aprel',
      'May',
      'Iyun',
      'Iyul',
      'Avgust',
      'Sentabr',
      'Oktabr',
      'Noyabr',
      'Dekabr',
      'JAMI'
    ]);

    // Jami holatlar
    const totalRow = ['Jami holatlar'];
    let yearTotal = 0;
    for (let month = 1; month <= 12; month++) {
      totalRow.push(monthlyData[month].total);
      yearTotal += monthlyData[month].total;
    }
    totalRow.push(yearTotal);
    data.push(totalRow);

    // Kasalxonaga yotqizilgan
    const hospitalizedRow = ['Kasalxonaga yotqizilgan'];
    let yearHospitalized = 0;
    for (let month = 1; month <= 12; month++) {
      hospitalizedRow.push(monthlyData[month].hospitalized);
      yearHospitalized += monthlyData[month].hospitalized;
    }
    hospitalizedRow.push(yearHospitalized);
    data.push(hospitalizedRow);

    // Laboratoriya tasdiqlangan
    const labRow = ['Laboratoriya tasdiqlangan'];
    let yearLab = 0;
    for (let month = 1; month <= 12; month++) {
      labRow.push(monthlyData[month].laboratoryConfirmed);
      yearLab += monthlyData[month].laboratoryConfirmed;
    }
    labRow.push(yearLab);
    data.push(labRow);

    // Bolalar
    const childrenRow = ['Bolalar (0-17 yosh)'];
    let yearChildren = 0;
    for (let month = 1; month <= 12; month++) {
      childrenRow.push(monthlyData[month].children);
      yearChildren += monthlyData[month].children;
    }
    childrenRow.push(yearChildren);
    data.push(childrenRow);

    // O'lim holatlari
    const deceasedRow = ['O\'lim holatlari'];
    let yearDeceased = 0;
    for (let month = 1; month <= 12; month++) {
      deceasedRow.push(monthlyData[month].deceased);
      yearDeceased += monthlyData[month].deceased;
    }
    deceasedRow.push(yearDeceased);
    data.push(deceasedRow);

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = Array(14).fill({ wch: 10 });
    ws['!cols'][0] = { wch: 30 };

    if (workbook.SheetNames.includes('Hisobot')) {
      workbook.Sheets['Hisobot'] = ws;
    } else {
      XLSX.utils.book_append_sheet(workbook, ws, 'Hisobot');
    }

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Ich_burugi_hisobot_${year}.xlsx`);
    res.send(buffer);

  } catch (error) {
    console.error('Ich burug\'i hisoboti yaratishda xatolik:', error);
    res.status(500).json({ success: false, message: 'Hisobot yaratishda xatolik yuz berdi' });
  }
};

/**
 * O'tkir Yuqumli Ich Kasalliklari (O'YuIK) hisoboti (4-ilova)
 */
exports.exportOYuIK = async (req, res) => {
  try {
    const { startDate, endDate, year = 2024 } = req.query;

    const query = {
      primaryDiagnosis: 'O\'tkir ich infeksiyasi',
      isDeleted: false
    };

    if (startDate && endDate) {
      query.illnessDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const cases = await Forma60.find(query)
      .populate('address.mahalla', 'name')
      .sort({ illnessDate: 1 });

    const templatePath = path.join(__dirname, '../../templates/4_ilova_2024_yil_O\'YuIK_xisobot_shakli_3_xlsx_12_айлык.xlsx');

    let workbook;
    if (fs.existsSync(templatePath)) {
      workbook = XLSX.readFile(templatePath);
    } else {
      workbook = XLSX.utils.book_new();
    }

    // Ma'lumotlarni oylar bo'yicha guruplash
    const monthlyData = {};
    for (let month = 1; month <= 12; month++) {
      monthlyData[month] = {
        total: 0,
        hospitalized: 0,
        children: 0,
        children0to2: 0,
        children3to6: 0,
        children7to14: 0,
        adults: 0,
        deceased: 0,
        foodRelated: 0
      };
    }

    cases.forEach(caseItem => {
      const month = new Date(caseItem.illnessDate).getMonth() + 1;
      const age = caseItem.age;

      monthlyData[month].total++;
      if (caseItem.hospitalized) monthlyData[month].hospitalized++;

      if (age < 18) {
        monthlyData[month].children++;
        if (age <= 2) monthlyData[month].children0to2++;
        else if (age <= 6) monthlyData[month].children3to6++;
        else if (age <= 14) monthlyData[month].children7to14++;
      } else {
        monthlyData[month].adults++;
      }

      if (caseItem.treatmentOutcome === 'o\'lim') monthlyData[month].deceased++;

      // Oziq-ovqat bilan bog'liq
      if (caseItem.foodInspection && Object.keys(caseItem.foodInspection).length > 0) {
        monthlyData[month].foodRelated++;
      }
    });

    const data = [];
    data.push(['O\'TKIR YUQUMLI ICH KASALLIKLARI (O\'YuIK) BO\'YICHA HISOBOT', '', '', '', '', '', '', '', '', '', '', '', '']);
    data.push([`${year} yil`, '', '', '', '', '', '', '', '', '', '', '', '']);
    data.push(['']);

    data.push([
      '№',
      'Yanvar',
      'Fevral',
      'Mart',
      'Aprel',
      'May',
      'Iyun',
      'Iyul',
      'Avgust',
      'Sentabr',
      'Oktabr',
      'Noyabr',
      'Dekabr',
      'JAMI'
    ]);

    // Jami holatlar
    const totalRow = ['Jami holatlar'];
    let yearTotal = 0;
    for (let month = 1; month <= 12; month++) {
      totalRow.push(monthlyData[month].total);
      yearTotal += monthlyData[month].total;
    }
    totalRow.push(yearTotal);
    data.push(totalRow);

    // Kasalxonaga yotqizilgan
    const hospitalizedRow = ['Kasalxonaga yotqizilgan'];
    let yearHospitalized = 0;
    for (let month = 1; month <= 12; month++) {
      hospitalizedRow.push(monthlyData[month].hospitalized);
      yearHospitalized += monthlyData[month].hospitalized;
    }
    hospitalizedRow.push(yearHospitalized);
    data.push(hospitalizedRow);

    // Bolalar jami
    const childrenRow = ['Bolalar jami (0-17 yosh)'];
    let yearChildren = 0;
    for (let month = 1; month <= 12; month++) {
      childrenRow.push(monthlyData[month].children);
      yearChildren += monthlyData[month].children;
    }
    childrenRow.push(yearChildren);
    data.push(childrenRow);

    // 0-2 yosh
    const children0to2Row = ['  0-2 yosh'];
    let yearChildren0to2 = 0;
    for (let month = 1; month <= 12; month++) {
      children0to2Row.push(monthlyData[month].children0to2);
      yearChildren0to2 += monthlyData[month].children0to2;
    }
    children0to2Row.push(yearChildren0to2);
    data.push(children0to2Row);

    // 3-6 yosh
    const children3to6Row = ['  3-6 yosh'];
    let yearChildren3to6 = 0;
    for (let month = 1; month <= 12; month++) {
      children3to6Row.push(monthlyData[month].children3to6);
      yearChildren3to6 += monthlyData[month].children3to6;
    }
    children3to6Row.push(yearChildren3to6);
    data.push(children3to6Row);

    // 7-14 yosh
    const children7to14Row = ['  7-14 yosh'];
    let yearChildren7to14 = 0;
    for (let month = 1; month <= 12; month++) {
      children7to14Row.push(monthlyData[month].children7to14);
      yearChildren7to14 += monthlyData[month].children7to14;
    }
    children7to14Row.push(yearChildren7to14);
    data.push(children7to14Row);

    // Kattalar
    const adultsRow = ['Kattalar (18+ yosh)'];
    let yearAdults = 0;
    for (let month = 1; month <= 12; month++) {
      adultsRow.push(monthlyData[month].adults);
      yearAdults += monthlyData[month].adults;
    }
    adultsRow.push(yearAdults);
    data.push(adultsRow);

    // O'lim holatlari
    const deceasedRow = ['O\'lim holatlari'];
    let yearDeceased = 0;
    for (let month = 1; month <= 12; month++) {
      deceasedRow.push(monthlyData[month].deceased);
      yearDeceased += monthlyData[month].deceased;
    }
    deceasedRow.push(yearDeceased);
    data.push(deceasedRow);

    // Oziq-ovqat bilan bog'liq
    const foodRow = ['Oziq-ovqat bilan bog\'liq'];
    let yearFood = 0;
    for (let month = 1; month <= 12; month++) {
      foodRow.push(monthlyData[month].foodRelated);
      yearFood += monthlyData[month].foodRelated;
    }
    foodRow.push(yearFood);
    data.push(foodRow);

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = Array(14).fill({ wch: 10 });
    ws['!cols'][0] = { wch: 35 };

    if (workbook.SheetNames.includes('Hisobot')) {
      workbook.Sheets['Hisobot'] = ws;
    } else {
      XLSX.utils.book_append_sheet(workbook, ws, 'Hisobot');
    }

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=OYuIK_hisobot_${year}.xlsx`);
    res.send(buffer);

  } catch (error) {
    console.error('O\'YuIK hisoboti yaratishda xatolik:', error);
    res.status(500).json({ success: false, message: 'Hisobot yaratishda xatolik yuz berdi' });
  }
};

/**
 * Hisobot turlarini olish
 */
exports.getReportTypes = (req, res) => {
  const reportTypes = [
    {
      id: 'salmonellyoz',
      name: 'Salmonellyoz hisoboti',
      description: '2-ilova - Salmonellyoz bo\'yicha oylik hisobot',
      template: '2_ilova_2024_yil_Salmonellyoz_xisobot_shakli_xlsx_12_айлык.xlsx'
    },
    {
      id: 'ich_burugi',
      name: 'Ich burug\'i (dizenteriya) hisoboti',
      description: '3-ilova - Ich burug\'i bo\'yicha oylik hisobot',
      template: '3_ilova_2024_yil_Ich_burug\'_xisobot shakli (1).xlsx'
    },
    {
      id: 'oyuik',
      name: 'O\'tkir Yuqumli Ich Kasalliklari (O\'YuIK)',
      description: '4-ilova - O\'YuIK bo\'yicha oylik hisobot',
      template: '4_ilova_2024_yil_O\'YuIK_xisobot_shakli_3_xlsx_12_айлык.xlsx'
    }
  ];

  res.json({ success: true, data: reportTypes });
};
