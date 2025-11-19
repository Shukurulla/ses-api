const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Clinic = require('../models/Clinic');

// Load env vars
dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB ga ulanish muvaffaqiyatli!\n');
  } catch (error) {
    console.error('❌ MongoDB ulanishda xatolik:', error);
    process.exit(1);
  }
};

const updateCoordinates = async () => {
  try {
    await connectDB();

    console.log('📍 Koordinatalarni yangilash boshlandi...\n');

    // Nukus markaziy koordinatalari: 42.4536° N, 59.6097° E
    const nukusCenterLat = 42.4536;
    const nukusCenterLon = 59.6097;

    // Barcha muassasalarni olish
    const clinics = await Clinic.find();

    console.log(`📊 Jami ${clinics.length} ta muassasa topildi\n`);

    let updatedCount = 0;

    for (const clinic of clinics) {
      // Har bir muassasa uchun Nukus atrofida tasodifiy koordinata yaratish
      // Nukus shahar doirasi: taxminan ±0.05 (5km) radius ichida
      const randomLat = nukusCenterLat + (Math.random() - 0.5) * 0.1; // ±5km
      const randomLon = nukusCenterLon + (Math.random() - 0.5) * 0.1; // ±5km

      // Koordinatalarni yangilash
      await Clinic.findByIdAndUpdate(clinic._id, {
        coordinates: {
          latitude: parseFloat(randomLat.toFixed(6)),
          longitude: parseFloat(randomLon.toFixed(6))
        }
      });

      updatedCount++;
      console.log(`✓ ${clinic.institutionName}`);
      console.log(`  Yangi koordinata: ${randomLat.toFixed(6)}, ${randomLon.toFixed(6)}`);
    }

    console.log(`\n✅ ${updatedCount} ta muassasaning koordinatalari Nukusga o'zgartirildi!`);
    console.log(`📍 Nukus markazi: ${nukusCenterLat}, ${nukusCenterLon}\n`);

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Xatolik yuz berdi:', error.message);
    console.error(error);
    process.exit(1);
  }
};

// Run updater
updateCoordinates();
