const ExcelReportGenerator = require('../services/excelReportGenerator');
const XLSX = require('xlsx');

/**
 * Report Controller
 * Excel hisobotlarini generatsiya qilish
 */

// @desc    Salmonellyoz hisobotini yaratish
// @route   GET /api/reports/salmonellyoz/:year
// @access  Private (Admin)
exports.generateSalmonellyozReport = async (req, res) => {
  try {
    const { year } = req.params;
    const { region } = req.query;

    if (!year || year < 2020 || year > 2100) {
      return res.status(400).json({
        success: false,
        message: 'Noto\'g\'ri yil parametri'
      });
    }

    const workbook = await ExcelReportGenerator.generateSalmonellyozReport(parseInt(year), region);

    // Excel faylni bufferga aylantirish
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Response headers
    const fileName = region
      ? `Salmonellyoz_${year}_${region}.xlsx`
      : `Salmonellyoz_${year}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    res.send(buffer);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server xatosi',
      error: error.message
    });
  }
};

// @desc    Ich burug' hisobotini yaratish
// @route   GET /api/reports/ich-burug/:year
// @access  Private (Admin)
exports.generateIchBurugReport = async (req, res) => {
  try {
    const { year } = req.params;
    const { region } = req.query;

    if (!year || year < 2020 || year > 2100) {
      return res.status(400).json({
        success: false,
        message: 'Noto\'g\'ri yil parametri'
      });
    }

    const workbook = await ExcelReportGenerator.generateIchBurugReport(parseInt(year), region);

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    const fileName = region
      ? `IchBurug_${year}_${region}.xlsx`
      : `IchBurug_${year}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    res.send(buffer);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server xatosi',
      error: error.message
    });
  }
};

// @desc    O'YuIK hisobotini yaratish
// @route   GET /api/reports/oyuik/:year
// @access  Private (Admin)
exports.generateOYuIKReport = async (req, res) => {
  try {
    const { year } = req.params;
    const { region } = req.query;

    if (!year || year < 2020 || year > 2100) {
      return res.status(400).json({
        success: false,
        message: 'Noto\'g\'ri yil parametri'
      });
    }

    const workbook = await ExcelReportGenerator.generateOYuIKReport(parseInt(year), region);

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    const fileName = region
      ? `OYuIK_${year}_${region}.xlsx`
      : `OYuIK_${year}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    res.send(buffer);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server xatosi',
      error: error.message
    });
  }
};

// @desc    Barcha mavjud yillar ro'yxatini olish
// @route   GET /api/reports/available-years
// @access  Private (Admin)
exports.getAvailableYears = async (req, res) => {
  try {
    const Forma60 = require('../models/Forma60');

    const years = await Forma60.aggregate([
      {
        $group: {
          _id: { $year: '$illnessDate' }
        }
      },
      {
        $sort: { _id: -1 }
      }
    ]);

    res.status(200).json({
      success: true,
      data: years.map(y => y._id).filter(y => y)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server xatosi',
      error: error.message
    });
  }
};

// @desc    Statistika - Hisobotlar uchun
// @route   GET /api/reports/stats
// @access  Private (Admin)
exports.getReportStats = async (req, res) => {
  try {
    const Forma60 = require('../models/Forma60');
    const currentYear = new Date().getFullYear();

    const salmonellyozCount = await Forma60.countDocuments({
      primaryDiagnosis: { $regex: /salmonell/i },
      illnessDate: {
        $gte: new Date(`${currentYear}-01-01`),
        $lte: new Date(`${currentYear}-12-31`)
      }
    });

    const ichBurugCount = await Forma60.countDocuments({
      primaryDiagnosis: { $regex: /shigell|ich.*burug/i },
      illnessDate: {
        $gte: new Date(`${currentYear}-01-01`),
        $lte: new Date(`${currentYear}-12-31`)
      }
    });

    const oyuikCount = await Forma60.countDocuments({
      $or: [
        { primaryDiagnosis: { $regex: /EPKP/i } },
        { primaryDiagnosis: { $regex: /rotavirus/i } },
        { primaryDiagnosis: { $regex: /o.*tkir.*ichak/i } }
      ],
      illnessDate: {
        $gte: new Date(`${currentYear}-01-01`),
        $lte: new Date(`${currentYear}-12-31`)
      }
    });

    res.status(200).json({
      success: true,
      data: {
        currentYear,
        salmonellyozCount,
        ichBurugCount,
        oyuikCount,
        totalCount: salmonellyozCount + ichBurugCount + oyuikCount
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server xatosi',
      error: error.message
    });
  }
};
