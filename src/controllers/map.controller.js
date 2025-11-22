const Forma60 = require('../models/Forma60');

/**
 * Map Controller
 * Xarita funksiyalari - kasalliklar va oziq-ovqat tekshiruvlari
 */

// @desc    Kasalliklar xaritasi - barcha holatlarni geolokatsiya bilan olish
// @route   GET /api/map/diseases
// @access  Private
exports.getDiseasesMap = async (req, res) => {
  try {
    const {
      diseaseType, // salmonellyoz, ich_burug, oyuik
      startDate,
      endDate,
      bounds // Map bounds: minLat,minLng,maxLat,maxLng
    } = req.query;

    const filter = {};

    // Faqat geolokatsiyasi bo'lgan holatlar
    filter['address.location.coordinates'] = { $exists: true, $ne: [] };

    // Kasallik turi bo'yicha filter
    if (diseaseType) {
      if (diseaseType === 'salmonellyoz') {
        filter.primaryDiagnosis = { $regex: /salmonell/i };
      } else if (diseaseType === 'ich_burug') {
        filter.primaryDiagnosis = { $regex: /shigell|ich.*burug/i };
      } else if (diseaseType === 'oyuik') {
        filter.$or = [
          { primaryDiagnosis: { $regex: /EPKP/i } },
          { primaryDiagnosis: { $regex: /rotavirus/i } },
          { primaryDiagnosis: { $regex: /o.*tkir.*ichak/i } }
        ];
      }
    }

    // Sana bo'yicha filter
    if (startDate || endDate) {
      filter.illnessDate = {};
      if (startDate) filter.illnessDate.$gte = new Date(startDate);
      if (endDate) filter.illnessDate.$lte = new Date(endDate);
    }

    // Map bounds bo'yicha filter (viewport optimization)
    if (bounds) {
      const [minLat, minLng, maxLat, maxLng] = bounds.split(',').map(Number);
      filter['address.location'] = {
        $geoWithin: {
          $box: [
            [minLng, minLat], // bottom-left
            [maxLng, maxLat]  // top-right
          ]
        }
      };
    }

    const cases = await Forma60.find(filter)
      .select('formNumber fullName age primaryDiagnosis finalDiagnosis illnessDate address.location address.fullAddress outcome')
      .limit(1000) // Performance uchun limit
      .lean();

    // GeoJSON format
    const geoJsonFeatures = cases.map(c => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: c.address.location.coordinates
      },
      properties: {
        id: c._id,
        formNumber: c.formNumber,
        fullName: c.fullName,
        age: c.age,
        diagnosis: c.finalDiagnosis || c.primaryDiagnosis,
        illnessDate: c.illnessDate,
        address: c.address.fullAddress,
        outcome: c.outcome,
        diseaseType: getDiseaseType(c.primaryDiagnosis)
      }
    }));

    res.status(200).json({
      success: true,
      type: 'FeatureCollection',
      features: geoJsonFeatures,
      count: geoJsonFeatures.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server xatosi',
      error: error.message
    });
  }
};

// @desc    Oziq-ovqat tekshiruvlari xaritasi
// @route   GET /api/map/food-inspection
// @access  Private
exports.getFoodInspectionMap = async (req, res) => {
  try {
    const {
      inspectionResult, // contaminated, clean, all
      startDate,
      endDate,
      bounds
    } = req.query;

    const filter = {};

    // Geolokatsiya bo'lishi kerak
    filter['address.location.coordinates'] = { $exists: true, $ne: [] };

    // Oziq-ovqat bilan bog'liq yuqish omillari
    const foodRelatedFactors = [
      'Oziq-ovqat',
      'Suv',
      'Sut mahsulotlari',
      'Gosht mahsulotlari',
      'Baliq',
      'Salat',
      'Meva va sabzavot'
    ];
    filter.transmissionFactor = { $in: foodRelatedFactors };

    // Tekshiruv natijasi bo'yicha
    if (inspectionResult === 'contaminated') {
      filter.$or = [
        { 'foodInspection.water': true },
        { 'foodInspection.meat': true },
        { 'foodInspection.milk': true },
        { 'foodInspection.fish': true },
        { 'foodInspection.vegetables': true },
        { 'foodInspection.fruits': true }
      ];
    } else if (inspectionResult === 'clean') {
      // Hech bo'lmaganda bitta false bo'lishi kerak
      filter.$or = [
        { 'foodInspection.water': false },
        { 'foodInspection.meat': false },
        { 'foodInspection.milk': false },
        { 'foodInspection.fish': false },
        { 'foodInspection.vegetables': false },
        { 'foodInspection.fruits': false }
      ];
    }

    // Sana bo'yicha
    if (startDate || endDate) {
      filter.illnessDate = {};
      if (startDate) filter.illnessDate.$gte = new Date(startDate);
      if (endDate) filter.illnessDate.$lte = new Date(endDate);
    }

    // Map bounds
    if (bounds) {
      const [minLat, minLng, maxLat, maxLng] = bounds.split(',').map(Number);
      filter['address.location'] = {
        $geoWithin: {
          $box: [
            [minLng, minLat],
            [maxLng, maxLat]
          ]
        }
      };
    }

    const cases = await Forma60.find(filter)
      .select('formNumber fullName transmissionFactor foodInspection address.location address.fullAddress illnessDate')
      .populate('foodInspection.inspectedBy', 'fullName')
      .limit(1000)
      .lean();

    // GeoJSON format
    const geoJsonFeatures = cases.map(c => {
      const inspection = c.foodInspection || {};
      const hasContamination =
        inspection.water === true ||
        inspection.meat === true ||
        inspection.milk === true ||
        inspection.fish === true ||
        inspection.vegetables === true ||
        inspection.fruits === true;

      return {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: c.address.location.coordinates
        },
        properties: {
          id: c._id,
          formNumber: c.formNumber,
          fullName: c.fullName,
          transmissionFactor: c.transmissionFactor,
          address: c.address.fullAddress,
          illnessDate: c.illnessDate,
          inspectionStatus: hasContamination ? 'contaminated' : 'clean',
          inspectionDetails: {
            water: inspection.water,
            meat: inspection.meat,
            milk: inspection.milk,
            fish: inspection.fish,
            vegetables: inspection.vegetables,
            fruits: inspection.fruits
          },
          inspectedBy: inspection.inspectedBy?.fullName,
          inspectedAt: inspection.inspectedAt
        }
      };
    });

    res.status(200).json({
      success: true,
      type: 'FeatureCollection',
      features: geoJsonFeatures,
      count: geoJsonFeatures.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server xatosi',
      error: error.message
    });
  }
};

// @desc    Yaqin atrofdagi holatlarni topish (radius search)
// @route   GET /api/map/nearby
// @access  Private
exports.getNearbyCases = async (req, res) => {
  try {
    const { lat, lng, radius = 1000 } = req.query; // radius in meters

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Latitude va longitude kerak'
      });
    }

    const cases = await Forma60.find({
      'address.location': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: parseInt(radius)
        }
      }
    })
    .select('formNumber fullName age primaryDiagnosis address.location address.fullAddress illnessDate')
    .limit(50)
    .lean();

    res.status(200).json({
      success: true,
      count: cases.length,
      data: cases
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server xatosi',
      error: error.message
    });
  }
};

// @desc    Heatmap ma'lumotlari - kasalliklar zichligi
// @route   GET /api/map/heatmap
// @access  Private
exports.getHeatmapData = async (req, res) => {
  try {
    const { diseaseType, startDate, endDate } = req.query;

    const filter = {
      'address.location.coordinates': { $exists: true, $ne: [] }
    };

    // Kasallik turi
    if (diseaseType) {
      if (diseaseType === 'salmonellyoz') {
        filter.primaryDiagnosis = { $regex: /salmonell/i };
      } else if (diseaseType === 'ich_burug') {
        filter.primaryDiagnosis = { $regex: /shigell|ich.*burug/i };
      } else if (diseaseType === 'oyuik') {
        filter.$or = [
          { primaryDiagnosis: { $regex: /EPKP/i } },
          { primaryDiagnosis: { $regex: /rotavirus/i } },
          { primaryDiagnosis: { $regex: /o.*tkir.*ichak/i } }
        ];
      }
    }

    // Sana
    if (startDate || endDate) {
      filter.illnessDate = {};
      if (startDate) filter.illnessDate.$gte = new Date(startDate);
      if (endDate) filter.illnessDate.$lte = new Date(endDate);
    }

    const cases = await Forma60.find(filter)
      .select('address.location')
      .limit(5000)
      .lean();

    // Heatmap format: [lat, lng, intensity]
    const heatmapData = cases.map(c => [
      c.address.location.coordinates[1], // latitude
      c.address.location.coordinates[0], // longitude
      1 // intensity (har bir holat uchun 1)
    ]);

    res.status(200).json({
      success: true,
      count: heatmapData.length,
      data: heatmapData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server xatosi',
      error: error.message
    });
  }
};

// @desc    Statistika - xarita uchun
// @route   GET /api/map/stats
// @access  Private
exports.getMapStats = async (req, res) => {
  try {
    const totalWithLocation = await Forma60.countDocuments({
      'address.location.coordinates': { $exists: true, $ne: [] }
    });

    const totalWithoutLocation = await Forma60.countDocuments({
      $or: [
        { 'address.location.coordinates': { $exists: false } },
        { 'address.location.coordinates': [] }
      ]
    });

    // Kasallik turlari bo'yicha
    const salmonellyozCount = await Forma60.countDocuments({
      'address.location.coordinates': { $exists: true, $ne: [] },
      primaryDiagnosis: { $regex: /salmonell/i }
    });

    const ichBurugCount = await Forma60.countDocuments({
      'address.location.coordinates': { $exists: true, $ne: [] },
      primaryDiagnosis: { $regex: /shigell|ich.*burug/i }
    });

    const oyuikCount = await Forma60.countDocuments({
      'address.location.coordinates': { $exists: true, $ne: [] },
      $or: [
        { primaryDiagnosis: { $regex: /EPKP/i } },
        { primaryDiagnosis: { $regex: /rotavirus/i } },
        { primaryDiagnosis: { $regex: /o.*tkir.*ichak/i } }
      ]
    });

    res.status(200).json({
      success: true,
      data: {
        totalWithLocation,
        totalWithoutLocation,
        byDiseaseType: {
          salmonellyoz: salmonellyozCount,
          ichBurug: ichBurugCount,
          oyuik: oyuikCount
        }
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

// Helper function
function getDiseaseType(diagnosis) {
  if (!diagnosis) return 'noma\'lum';
  const lower = diagnosis.toLowerCase();
  if (lower.includes('salmonell')) return 'salmonellyoz';
  if (lower.includes('shigell') || lower.includes('ich') && lower.includes('burug')) return 'ich_burug';
  if (lower.includes('epkp') || lower.includes('rotavirus')) return 'oyuik';
  return 'boshqa';
}

module.exports = exports;
