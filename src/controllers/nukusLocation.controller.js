const NukusLocation = require('../models/NukusLocation');

// Nukus locationlarini qidirish
exports.searchLocations = async (req, res) => {
  try {
    const { query, type, limit = 50 } = req.query;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Qidiruv uchun kamida 2 ta belgi kiriting'
      });
    }

    const searchQuery = query.trim().toLowerCase();

    // Har bir so'zni alohida qidiramiz (fuzzy search)
    const words = searchQuery.split(/\s+/).filter(w => w.length > 0);

    // Har bir so'z uchun regex yaratish - .*word.* (so'z o'rtasida ham bo'lishi mumkin)
    const wordRegexes = words.map(word => ({
      $or: [
        { name: { $regex: word, $options: 'i' } },
        { nameUz: { $regex: word, $options: 'i' } },
        { nameRu: { $regex: word, $options: 'i' } },
        { 'address.street': { $regex: word, $options: 'i' } },
        { 'address.fullAddress': { $regex: word, $options: 'i' } },
        { searchText: { $regex: word, $options: 'i' } }
      ]
    }));

    // Qidiruv shartlari - kamida bitta so'z mos kelishi kerak
    const searchConditions = {
      $or: wordRegexes
    };

    // Type filter
    if (type) {
      searchConditions.type = type;
    }

    const locations = await NukusLocation.find(searchConditions)
      .limit(parseInt(limit))
      .select('name nameUz nameRu type address location')
      .lean();

    // Natijalarni formatlash
    const formattedResults = locations.map(loc => ({
      id: loc._id,
      name: loc.name,
      nameUz: loc.nameUz,
      nameRu: loc.nameRu,
      displayName: loc.nameUz || loc.name,
      type: loc.type,
      address: loc.address.fullAddress || 'Manzil kiritilmagan',
      location: {
        type: 'Point',
        coordinates: loc.location.coordinates
      },
      // OpenStreetMap format uchun
      osmData: {
        display_name: `${loc.name}, ${loc.address.fullAddress || 'Nukus'}`,
        lat: loc.location.coordinates[1],
        lon: loc.location.coordinates[0],
        address: loc.address
      }
    }));

    res.json({
      success: true,
      count: formattedResults.length,
      data: formattedResults
    });

  } catch (error) {
    console.error('Location qidirishda xatolik:', error);
    res.status(500).json({
      success: false,
      message: 'Server xatosi',
      error: error.message
    });
  }
};

// ID bo'yicha location olish
exports.getLocationById = async (req, res) => {
  try {
    const { id } = req.params;

    const location = await NukusLocation.findById(id);

    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Location topilmadi'
      });
    }

    res.json({
      success: true,
      data: location
    });

  } catch (error) {
    console.error('Location olishda xatolik:', error);
    res.status(500).json({
      success: false,
      message: 'Server xatosi',
      error: error.message
    });
  }
};

// Statistika
exports.getStatistics = async (req, res) => {
  try {
    const totalCount = await NukusLocation.countDocuments();

    const byType = await NukusLocation.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        total: totalCount,
        byType
      }
    });

  } catch (error) {
    console.error('Statistika olishda xatolik:', error);
    res.status(500).json({
      success: false,
      message: 'Server xatosi',
      error: error.message
    });
  }
};

// Yaqin atrofdagi locationlarni topish
exports.findNearby = async (req, res) => {
  try {
    const { lat, lon, maxDistance = 1000, limit = 20 } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({
        success: false,
        message: 'Latitude va longitude majburiy'
      });
    }

    const locations = await NukusLocation.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lon), parseFloat(lat)]
          },
          $maxDistance: parseInt(maxDistance)
        }
      }
    })
      .limit(parseInt(limit))
      .select('name nameUz nameRu type address location');

    res.json({
      success: true,
      count: locations.length,
      data: locations
    });

  } catch (error) {
    console.error('Yaqin locationlar qidirishda xatolik:', error);
    res.status(500).json({
      success: false,
      message: 'Server xatosi',
      error: error.message
    });
  }
};
