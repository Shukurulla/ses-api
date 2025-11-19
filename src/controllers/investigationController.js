const Investigation = require('../models/Investigation');

// @desc    Get all investigations
// @route   GET /api/investigations
// @access  Private
exports.getInvestigations = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 25;
    const skip = (page - 1) * limit;

    const query = {};

    // Filter by status
    if (req.query.status) {
      query.status = req.query.status;
    }

    // Filter by disease
    if (req.query.disease) {
      query.disease = { $regex: req.query.disease, $options: 'i' };
    }

    // Search
    if (req.query.search) {
      query.$or = [
        { caseNumber: { $regex: req.query.search, $options: 'i' } },
        { disease: { $regex: req.query.search, $options: 'i' } },
        { location: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    const total = await Investigation.countDocuments(query);
    const investigations = await Investigation.find(query)
      .populate('investigator', 'fullName email')
      .populate('team', 'fullName email')
      .populate('patients', 'fullName diagnosis')
      .populate('createdBy', 'fullName')
      .sort('-createdAt')
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      count: investigations.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: investigations
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single investigation
// @route   GET /api/investigations/:id
// @access  Private
exports.getInvestigation = async (req, res) => {
  try {
    const investigation = await Investigation.findById(req.params.id)
      .populate('investigator', 'fullName email phone')
      .populate('team', 'fullName email phone')
      .populate('patients')
      .populate('recommendations.responsible', 'fullName')
      .populate('createdBy', 'fullName')
      .populate('updatedBy', 'fullName');

    if (!investigation) {
      return res.status(404).json({
        success: false,
        message: 'Tergov topilmadi'
      });
    }

    res.status(200).json({
      success: true,
      data: investigation
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create new investigation
// @route   POST /api/investigations
// @access  Private
exports.createInvestigation = async (req, res) => {
  try {
    req.body.createdBy = req.user.id;
    req.body.investigator = req.user.id;

    const investigation = await Investigation.create(req.body);

    res.status(201).json({
      success: true,
      data: investigation
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update investigation
// @route   PUT /api/investigations/:id
// @access  Private
exports.updateInvestigation = async (req, res) => {
  try {
    let investigation = await Investigation.findById(req.params.id);

    if (!investigation) {
      return res.status(404).json({
        success: false,
        message: 'Tergov topilmadi'
      });
    }

    req.body.updatedBy = req.user.id;

    investigation = await Investigation.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      success: true,
      data: investigation
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete investigation (soft delete)
// @route   DELETE /api/investigations/:id
// @access  Private
exports.deleteInvestigation = async (req, res) => {
  try {
    const investigation = await Investigation.findById(req.params.id);

    if (!investigation) {
      return res.status(404).json({
        success: false,
        message: 'Tergov topilmadi'
      });
    }

    await investigation.softDelete(req.user.id);

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

// @desc    Get investigation statistics
// @route   GET /api/investigations/stats/summary
// @access  Private
exports.getInvestigationStats = async (req, res) => {
  try {
    const stats = {
      total: await Investigation.countDocuments(),
      yangi: await Investigation.countDocuments({ status: 'yangi' }),
      jarayonda: await Investigation.countDocuments({ status: 'jarayonda' }),
      tugatilgan: await Investigation.countDocuments({ status: 'tugatilgan' }),
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
