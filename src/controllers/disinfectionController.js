const Disinfection = require('../models/Disinfection');

// @desc    Get all disinfection tasks
// @route   GET /api/disinfections
// @access  Private
exports.getDisinfections = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 25;
    const skip = (page - 1) * limit;

    const query = {};

    // Filter by status
    if (req.query.status) {
      query.status = req.query.status;
    }

    // Filter by disinfector
    if (req.query.disinfector) {
      query.disinfector = req.query.disinfector;
    }

    // Search
    if (req.query.search) {
      query.$or = [
        { address: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    const total = await Disinfection.countDocuments(query);
    const disinfections = await Disinfection.find(query)
      .populate('patient', 'fullName phone diagnosis')
      .populate('disinfector', 'fullName email phone')
      .populate('createdBy', 'fullName')
      .sort('-createdAt')
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      count: disinfections.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: disinfections
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single disinfection task
// @route   GET /api/disinfections/:id
// @access  Private
exports.getDisinfection = async (req, res) => {
  try {
    const disinfection = await Disinfection.findById(req.params.id)
      .populate('patient')
      .populate('disinfector', 'fullName email phone')
      .populate('createdBy', 'fullName')
      .populate('updatedBy', 'fullName');

    if (!disinfection) {
      return res.status(404).json({
        success: false,
        message: 'Dezinfeksiya vazifasi topilmadi'
      });
    }

    res.status(200).json({
      success: true,
      data: disinfection
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create new disinfection task
// @route   POST /api/disinfections
// @access  Private
exports.createDisinfection = async (req, res) => {
  try {
    req.body.createdBy = req.user.id;

    const disinfection = await Disinfection.create(req.body);

    res.status(201).json({
      success: true,
      data: disinfection
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update disinfection task
// @route   PUT /api/disinfections/:id
// @access  Private
exports.updateDisinfection = async (req, res) => {
  try {
    let disinfection = await Disinfection.findById(req.params.id);

    if (!disinfection) {
      return res.status(404).json({
        success: false,
        message: 'Dezinfeksiya vazifasi topilmadi'
      });
    }

    req.body.updatedBy = req.user.id;

    disinfection = await Disinfection.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      success: true,
      data: disinfection
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete disinfection task (soft delete)
// @route   DELETE /api/disinfections/:id
// @access  Private
exports.deleteDisinfection = async (req, res) => {
  try {
    const disinfection = await Disinfection.findById(req.params.id);

    if (!disinfection) {
      return res.status(404).json({
        success: false,
        message: 'Dezinfeksiya vazifasi topilmadi'
      });
    }

    await disinfection.softDelete(req.user.id);

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

// @desc    Get disinfection statistics
// @route   GET /api/disinfections/stats/summary
// @access  Private
exports.getDisinfectionStats = async (req, res) => {
  try {
    const stats = {
      total: await Disinfection.countDocuments(),
      yangi: await Disinfection.countDocuments({ status: 'yangi' }),
      tayinlangan: await Disinfection.countDocuments({ status: 'tayinlangan' }),
      jarayonda: await Disinfection.countDocuments({ status: 'jarayonda' }),
      bajarildi: await Disinfection.countDocuments({ status: 'bajarildi' }),
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
