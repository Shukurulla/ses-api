const XLSX = require('xlsx');
const excelReportsService = require('../services/excelReportsFixed.service');
const Forma60 = require('../models/Forma60');
const Karta = require('../models/Karta');

/**
 * Hisobotlar bo'yicha statistika
 */
exports.getStats = async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();

    // Joriy yil uchun statistika
    const startDate = new Date(currentYear, 0, 1);
    const endDate = new Date(currentYear, 11, 31, 23, 59, 59);

    const [salmonellyozCount, ichBurugCount, oyuikCount] = await Promise.all([
      Forma60.countDocuments({
        primaryDiagnosis: { $regex: /salmonell/i },
        illnessDate: { $gte: startDate, $lte: endDate },
        isDeleted: false
      }),
      Forma60.countDocuments({
        primaryDiagnosis: { $regex: /burug|shigellyoz|dizenteriya/i },
        illnessDate: { $gte: startDate, $lte: endDate },
        isDeleted: false
      }),
      Forma60.countDocuments({
        primaryDiagnosis: { $regex: /yuqumli ich|o'yuik|ich infeksiya/i },
        illnessDate: { $gte: startDate, $lte: endDate },
        isDeleted: false
      })
    ]);

    res.json({
      success: true,
      data: {
        currentYear,
        salmonellyozCount,
        ichBurugCount,
        oyuikCount,
        totalCases: salmonellyozCount + ichBurugCount + oyuikCount
      }
    });
  } catch (error) {
    console.error('Statistika olishda xatolik:', error);
    res.status(500).json({
      success: false,
      message: 'Statistika olishda xatolik',
      error: error.message
    });
  }
};

/**
 * Mavjud yillar ro'yxati
 */
exports.getAvailableYears = async (req, res) => {
  try {
    // Forma60 lardan eng qadimgi va eng yangi yillarni topish
    const oldestCase = await Forma60.findOne({ isDeleted: false })
      .sort({ illnessDate: 1 })
      .select('illnessDate')
      .lean();

    const newestCase = await Forma60.findOne({ isDeleted: false })
      .sort({ illnessDate: -1 })
      .select('illnessDate')
      .lean();

    const currentYear = new Date().getFullYear();
    const startYear = oldestCase ? new Date(oldestCase.illnessDate).getFullYear() : currentYear;
    const endYear = newestCase ? new Date(newestCase.illnessDate).getFullYear() : currentYear;

    // Yillar ro'yxatini yaratish
    const years = [];
    for (let year = endYear; year >= startYear; year--) {
      years.push(year);
    }

    // Agar bo'sh bo'lsa, joriy yilni qo'shamiz
    if (years.length === 0) {
      years.push(currentYear);
    }

    res.json({
      success: true,
      data: years
    });
  } catch (error) {
    console.error('Yillar ro\'yxatini olishda xatolik:', error);
    res.status(500).json({
      success: false,
      message: 'Yillar ro\'yxatini olishda xatolik',
      error: error.message
    });
  }
};

/**
 * Jadval statistikalarini olish
 */
exports.getTableStats = async (req, res) => {
  try {
    const { reportType, year } = req.params;
    const tableName = decodeURIComponent(req.params.tableName);
    const parsedYear = parseInt(year);

    // Yil validatsiyasi
    if (isNaN(parsedYear) || parsedYear < 2000 || parsedYear > 2100) {
      return res.status(400).json({
        success: false,
        message: 'Noto\'g\'ri yil formati'
      });
    }

    const startDate = new Date(parsedYear, 0, 1);
    const endDate = new Date(parsedYear, 11, 31, 23, 59, 59);

    // Kasallik turiga qarab regex olish
    let diagnosisRegex;
    let cultureRegex;

    switch(reportType) {
      case 'salmonellyoz':
        diagnosisRegex = /salmonell/i;
        cultureRegex = /salmonell/i;
        break;
      case 'ich-burug':
        diagnosisRegex = /burug|shigellyoz|dizenteriya/i;
        cultureRegex = /shigella|fleksner|zonne/i;
        break;
      case 'oyuik':
        diagnosisRegex = /yuqumli ich|o'yuik|ich infeksiya/i;
        cultureRegex = null;
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Noto\'g\'ri hisobot turi'
        });
    }

    // Ma'lumotlarni olish
    const forma60s = await Forma60.find({
      primaryDiagnosis: { $regex: diagnosisRegex },
      illnessDate: { $gte: startDate, $lte: endDate },
      isDeleted: false
    }).populate('address.mahalla createdBy');

    const kartaQuery = {
      createdAt: { $gte: startDate, $lte: endDate },
      isDeleted: false
    };

    if (cultureRegex) {
      kartaQuery['laboratoryResults.cultureType'] = { $regex: cultureRegex };
    }

    const kartas = await Karta.find(kartaQuery).populate('forma60 createdBy');

    // Jadvalga qarab statistika hisoblash
    let stats = {
      totalCases: forma60s.length
    };

    // Jadval raqamini olish
    const tableNumber = parseInt(tableName.match(/\d+/)?.[0]);

    switch(tableNumber) {
      case 1: // Yosh guruhlari
        stats.ageGroups = calculateAgeGroupStats(forma60s);
        stats.details = getAgeGroupDetails(forma60s);
        break;

      case 2: // Oylik dinamika
        stats.monthly = calculateMonthlyStats(forma60s);
        stats.deaths = forma60s.filter(f => f.treatmentOutcome === 'o\'lim').length;
        stats.details = getMonthlyDetails(forma60s);
        break;

      case 3: // Kasblar
        stats.professions = calculateProfessionStats(kartas);
        stats.details = getProfessionDetails(kartas);
        break;

      case 4: // Yuqish omillari
        stats.transmissionFactors = calculateTransmissionStats(kartas);
        stats.details = getTransmissionDetails(kartas);
        break;

      case 5: // Yuqish joylari
        stats.infectionSources = calculateInfectionSourceStats(kartas);
        stats.details = getInfectionSourceDetails(kartas);
        break;

      case 6: // Oziq-ovqat
        stats.foodProducts = calculateFoodProductStats(kartas);
        stats.details = getFoodProductDetails(kartas);
        break;

      case 7: // Laboratoriya
        stats.labResults = calculateLabResultStats(kartas);
        stats.details = getLabResultDetails(kartas);
        break;

      case 8: // O'choqlar
        stats.outbreaks = calculateOutbreakStats(kartas);
        stats.details = getOutbreakDetails(kartas);
        break;

      case 9: // Kontaktlar
        stats.contacts = calculateContactStats(forma60s);
        stats.details = getContactDetails(forma60s);
        break;

      default:
        stats.details = { message: 'Bu jadval uchun statistika hozircha mavjud emas' };
    }

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Jadval statistikasini olishda xatolik:', error);
    res.status(500).json({
      success: false,
      message: 'Jadval statistikasini olishda xatolik',
      error: error.message
    });
  }
};

// Helper funksiyalar
function calculateAgeGroupStats(forma60s) {
  return {
    under1: forma60s.filter(f => f.age < 1).length,
    age1to2: forma60s.filter(f => f.age >= 1 && f.age <= 2).length,
    age3to5: forma60s.filter(f => f.age >= 3 && f.age <= 5).length,
    age6to14: forma60s.filter(f => f.age >= 6 && f.age <= 14).length,
    age15to17: forma60s.filter(f => f.age >= 15 && f.age <= 17).length,
    age18plus: forma60s.filter(f => f.age >= 18).length,
    children: forma60s.filter(f => f.age < 18).length
  };
}

function getAgeGroupDetails(forma60s) {
  const total = forma60s.length;
  const groups = calculateAgeGroupStats(forma60s);

  return {
    '1 yoshgacha': { count: groups.under1, percentage: ((groups.under1 / total) * 100).toFixed(1) },
    '1-2 yosh': { count: groups.age1to2, percentage: ((groups.age1to2 / total) * 100).toFixed(1) },
    '3-5 yosh': { count: groups.age3to5, percentage: ((groups.age3to5 / total) * 100).toFixed(1) },
    '6-14 yosh': { count: groups.age6to14, percentage: ((groups.age6to14 / total) * 100).toFixed(1) },
    '15-17 yosh': { count: groups.age15to17, percentage: ((groups.age15to17 / total) * 100).toFixed(1) },
    '18+ yosh': { count: groups.age18plus, percentage: ((groups.age18plus / total) * 100).toFixed(1) }
  };
}

function calculateMonthlyStats(forma60s) {
  const monthNames = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
                      'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];
  const monthlyCounts = new Array(12).fill(0);

  forma60s.forEach(f => {
    const month = new Date(f.illnessDate).getMonth();
    monthlyCounts[month]++;
  });

  const maxCount = Math.max(...monthlyCounts);
  const peakMonthIndex = monthlyCounts.indexOf(maxCount);

  return {
    peakMonth: monthNames[peakMonthIndex],
    peakCount: maxCount,
    monthlyCounts
  };
}

function getMonthlyDetails(forma60s) {
  const monthNames = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
                      'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];
  const details = {};

  monthNames.forEach((month, index) => {
    const count = forma60s.filter(f => new Date(f.illnessDate).getMonth() === index).length;
    details[month] = { count, percentage: ((count / forma60s.length) * 100).toFixed(1) };
  });

  return details;
}

function calculateProfessionStats(kartas) {
  return {
    students: kartas.filter(k => k.patientStatus === 'oqiydi').length,
    workers: kartas.filter(k => k.patientStatus === 'ishlaydi').length,
    medical: kartas.filter(k => k.workType === 'medic').length,
    food: kartas.filter(k => k.workType === 'restoran').length
  };
}

function getProfessionDetails(kartas) {
  const total = kartas.length;
  const stats = calculateProfessionStats(kartas);

  return {
    'O\'quvchilar': { count: stats.students, percentage: ((stats.students / total) * 100).toFixed(1) },
    'Ishchilar': { count: stats.workers, percentage: ((stats.workers / total) * 100).toFixed(1) },
    'Tibbiyot xodimlari': { count: stats.medical, percentage: ((stats.medical / total) * 100).toFixed(1) },
    'Oziq-ovqat sohasida': { count: stats.food, percentage: ((stats.food / total) * 100).toFixed(1) }
  };
}

function calculateTransmissionStats(kartas) {
  const factors = {};
  kartas.forEach(k => {
    const factor = k.transmissionFactor || 'Noma\'lum';
    factors[factor] = (factors[factor] || 0) + 1;
  });
  return factors;
}

function getTransmissionDetails(kartas) {
  const total = kartas.length;
  const factors = calculateTransmissionStats(kartas);
  const details = {};

  Object.entries(factors).forEach(([factor, count]) => {
    details[factor] = { count, percentage: ((count / total) * 100).toFixed(1) };
  });

  return details;
}

function calculateInfectionSourceStats(kartas) {
  const sources = {};
  kartas.forEach(k => {
    const source = k.infectionSource || 'Noma\'lum';
    sources[source] = (sources[source] || 0) + 1;
  });
  return sources;
}

function getInfectionSourceDetails(kartas) {
  const total = kartas.length;
  const sources = calculateInfectionSourceStats(kartas);
  const details = {};

  Object.entries(sources).forEach(([source, count]) => {
    details[source] = { count, percentage: ((count / total) * 100).toFixed(1) };
  });

  return details;
}

function calculateFoodProductStats(kartas) {
  return { total: kartas.length };
}

function getFoodProductDetails(kartas) {
  return {
    'Jami tekshirilgan': kartas.length,
    'Ma\'lumot': 'Oziq-ovqat mahsulotlari statistikasi'
  };
}

function calculateLabResultStats(kartas) {
  const cultures = {};
  kartas.forEach(k => {
    if (k.laboratoryResults && k.laboratoryResults.cultureType) {
      const culture = k.laboratoryResults.cultureType;
      cultures[culture] = (cultures[culture] || 0) + 1;
    }
  });
  return cultures;
}

function getLabResultDetails(kartas) {
  const total = kartas.filter(k => k.laboratoryResults && k.laboratoryResults.cultureType).length;
  const cultures = calculateLabResultStats(kartas);
  const details = {};

  Object.entries(cultures).forEach(([culture, count]) => {
    details[culture] = { count, percentage: total > 0 ? ((count / total) * 100).toFixed(1) : '0.0' };
  });

  return details;
}

function calculateOutbreakStats(kartas) {
  const outbreaks = kartas.filter(k => k.outbreak && k.outbreak.hasOutbreak);
  return {
    total: outbreaks.length,
    withOutbreak: outbreaks.length
  };
}

function getOutbreakDetails(kartas) {
  const outbreaks = kartas.filter(k => k.outbreak && k.outbreak.hasOutbreak);
  return {
    'O\'choqlar soni': outbreaks.length,
    'O\'choq bo\'lmagan': kartas.length - outbreaks.length
  };
}

function calculateContactStats(forma60s) {
  const totalContacts = forma60s.reduce((sum, f) => sum + (f.contactsCount || 0), 0);
  return {
    total: totalContacts,
    average: forma60s.length > 0 ? (totalContacts / forma60s.length).toFixed(1) : 0
  };
}

function getContactDetails(forma60s) {
  const stats = calculateContactStats(forma60s);
  return {
    'Jami kontaktlar': stats.total,
    'O\'rtacha kontaktlar': stats.average,
    'Bemorlar soni': forma60s.length
  };
}

/**
 * Salmonellyoz hisobotini yuklab olish
 */
exports.exportSalmonellyoz = async (req, res) => {
  try {
    const year = excelReportsService.parseYear(req.params.year);

    console.log(`Salmonellyoz hisoboti yaratilmoqda: ${year}`);

    const workbook = await excelReportsService.generateSalmonellyozReport(year);

    // Excel faylni bufferga o'tkazish
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Faylni yuborish
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Salmonellyoz_${year}.xlsx`);
    res.send(buffer);
  } catch (error) {
    console.error('Salmonellyoz hisobotini yaratishda xatolik:', error);
    res.status(500).json({
      success: false,
      message: 'Hisobotni yaratishda xatolik',
      error: error.message
    });
  }
};

/**
 * Ich burug' hisobotini yuklab olish
 */
exports.exportIchBurug = async (req, res) => {
  try {
    const year = excelReportsService.parseYear(req.params.year);

    console.log(`Ich burug' hisoboti yaratilmoqda: ${year}`);

    const workbook = await excelReportsService.generateIchBurugReport(year);

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=IchBurug_${year}.xlsx`);
    res.send(buffer);
  } catch (error) {
    console.error('Ich burug\' hisobotini yaratishda xatolik:', error);
    res.status(500).json({
      success: false,
      message: 'Hisobotni yaratishda xatolik',
      error: error.message
    });
  }
};

/**
 * O'YuIK hisobotini yuklab olish
 */
exports.exportOYuIK = async (req, res) => {
  try {
    const year = excelReportsService.parseYear(req.params.year);

    console.log(`O'YuIK hisoboti yaratilmoqda: ${year}`);

    const workbook = await excelReportsService.generateOYuIKReport(year);

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=OYuIK_${year}.xlsx`);
    res.send(buffer);
  } catch (error) {
    console.error('O\'YuIK hisobotini yaratishda xatolik:', error);
    res.status(500).json({
      success: false,
      message: 'Hisobotni yaratishda xatolik',
      error: error.message
    });
  }
};
