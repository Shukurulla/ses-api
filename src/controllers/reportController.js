const Report = require('../models/Report');
const Patient = require('../models/Patient');
const Investigation = require('../models/Investigation');
const Disinfection = require('../models/Disinfection');

// @desc    Get all reports
// @route   GET /api/reports
// @access  Private
exports.getReports = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 25;
    const skip = (page - 1) * limit;

    const query = {};

    // Filter by type
    if (req.query.type) {
      query.type = req.query.type;
    }

    // Filter by category
    if (req.query.category) {
      query.category = req.query.category;
    }

    // Filter by status
    if (req.query.status) {
      query.status = req.query.status;
    }

    // Date range filter
    if (req.query.startDate || req.query.endDate) {
      query.startDate = {};
      if (req.query.startDate) {
        query.startDate.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        query.startDate.$lte = new Date(req.query.endDate);
      }
    }

    const total = await Report.countDocuments(query);
    const reports = await Report.find(query)
      .populate('createdBy', 'fullName email')
      .sort('-createdAt')
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      count: reports.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: reports
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single report
// @route   GET /api/reports/:id
// @access  Private
exports.getReport = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate('createdBy', 'fullName email phone');

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Hisobot topilmadi'
      });
    }

    res.status(200).json({
      success: true,
      data: report
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create new report
// @route   POST /api/reports
// @access  Private
exports.createReport = async (req, res) => {
  try {
    const { name, type, category, startDate, endDate, format } = req.body;

    // Calculate report data based on date range
    const dateQuery = {
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };

    const [
      patients,
      activeCases,
      recovered,
      investigations,
      disinfections
    ] = await Promise.all([
      Patient.countDocuments(dateQuery),
      Patient.countDocuments({ ...dateQuery, status: { $in: ['tasdiqlangan', 'davolanmoqda'] } }),
      Patient.countDocuments({ ...dateQuery, status: 'tuzalgan' }),
      Investigation.countDocuments(dateQuery),
      Disinfection.countDocuments(dateQuery)
    ]);

    // Get unique districts and diseases
    const patientsData = await Patient.find(dateQuery).select('district diagnosis');
    const districts = [...new Set(patientsData.map(p => p.district).filter(Boolean))];
    const diseases = [...new Set(patientsData.map(p => p.diagnosis).filter(Boolean))];

    const reportData = {
      name,
      type,
      category: category || 'umumiy',
      startDate,
      endDate,
      format: format || 'pdf',
      status: 'tayyor',
      data: {
        totalCases: patients,
        activeCases,
        recovered,
        deaths: 0,
        newCases: patients,
        investigations,
        disinfections,
        districts,
        diseases
      },
      createdBy: req.user._id
    };

    const report = await Report.create(reportData);

    res.status(201).json({
      success: true,
      data: report
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update report
// @route   PUT /api/reports/:id
// @access  Private
exports.updateReport = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Hisobot topilmadi'
      });
    }

    const updatedReport = await Report.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    ).populate('createdBy', 'fullName email');

    res.status(200).json({
      success: true,
      data: updatedReport
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete report (soft delete)
// @route   DELETE /api/reports/:id
// @access  Private
exports.deleteReport = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Hisobot topilmadi'
      });
    }

    await Report.findByIdAndUpdate(req.params.id, { isDeleted: true });

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get report statistics
// @route   GET /api/reports/stats/summary
// @access  Private
exports.getReportStats = async (req, res) => {
  try {
    const stats = {
      total: await Report.countDocuments(),
      kunlik: await Report.countDocuments({ type: 'kunlik' }),
      haftalik: await Report.countDocuments({ type: 'haftalik' }),
      oylik: await Report.countDocuments({ type: 'oylik' }),
      choraklik: await Report.countDocuments({ type: 'choraklik' }),
      yillik: await Report.countDocuments({ type: 'yillik' }),
      maxsus: await Report.countDocuments({ type: 'maxsus' })
    };

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
