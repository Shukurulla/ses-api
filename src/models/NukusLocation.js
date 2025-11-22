const mongoose = require('mongoose');

const nukusLocationSchema = new mongoose.Schema({
  // OSM ID
  osmId: { type: String, unique: true },

  // Nomi (har xil tillarda)
  name: { type: String, required: true },
  nameUz: String, // O'zbekcha nom
  nameRu: String, // Ruscha nom

  // Turi
  type: {
    type: String,
    enum: [
      'hospital',      // Kasalxona
      'clinic',        // Klinika/Poliklinika
      'pharmacy',      // Dorixona
      'school',        // Maktab
      'university',    // Universitet
      'park',          // Park
      'building',      // Bino
      'office',        // Ofis
      'shop',          // Do'kon
      'restaurant',    // Restoran
      'cafe',          // Kafe
      'bank',          // Bank
      'hotel',         // Mehmonxona
      'mosque',        // Masjid
      'government',    // Davlat muassasasi
      'police',        // Politsiya
      'fire_station',  // O't o'chirish
      'post_office',   // Pochta
      'library',       // Kutubxona
      'museum',        // Muzey
      'stadium',       // Stadion
      'market',        // Bozor
      'other'          // Boshqa
    ],
    default: 'other'
  },

  // To'liq manzil
  address: {
    street: String,
    houseNumber: String,
    district: String,
    city: { type: String, default: 'Nukus' },
    region: { type: String, default: 'Qoraqalpog\'iston' },
    country: { type: String, default: 'Uzbekistan' },
    postcode: String,
    fullAddress: String
  },

  // Joylashuv
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },

  // Qo'shimcha ma'lumotlar
  tags: mongoose.Schema.Types.Mixed, // OSM'dan kelgan barcha teglar

  // Qidiruv uchun optimizatsiya
  searchText: String, // Nom + manzil birlashtirilgan (lowercase)

  // O'zgartirilgan sana
  lastUpdated: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Geospatial index
nukusLocationSchema.index({ location: '2dsphere' });

// Text search index
nukusLocationSchema.index({ searchText: 'text', name: 'text' });

// Pre-save hook - qidiruv uchun text tayyorlash
nukusLocationSchema.pre('save', function(next) {
  const searchParts = [
    this.name,
    this.nameUz,
    this.nameRu,
    this.address.street,
    this.address.fullAddress,
    this.type
  ].filter(Boolean);

  this.searchText = searchParts.join(' ').toLowerCase();
  next();
});

module.exports = mongoose.model('NukusLocation', nukusLocationSchema);
