require('dotenv').config();
const mongoose = require('mongoose');

const Forma60 = require('../models/Forma60');
const Disinfection = require('../models/Disinfection');

const createMissingDisinfections = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB ga ulandi');

    // disinfectionRequired = true bo'lgan barcha Forma60 larni topish
    const forma60WithDisinfection = await Forma60.find({ disinfectionRequired: true });

    console.log(`\nJami ${forma60WithDisinfection.length} ta Forma60 da dezinfeksiya kerak`);

    let created = 0;
    let skipped = 0;

    for (const forma60 of forma60WithDisinfection) {
      // Ushbu Forma60 uchun allaqachon Disinfection borligini tekshirish
      const existingDisinfection = await Disinfection.findOne({ forma60: forma60._id });

      if (existingDisinfection) {
        console.log(`✓ ${forma60.fullName} - Dezinfeksiya allaqachon mavjud`);
        skipped++;
        continue;
      }

      // Yangi Disinfection yaratish
      await Disinfection.create({
        forma60: forma60._id,
        workplace: {
          name: forma60.workplace?.name || forma60.address?.fullAddress || 'Noma\'lum',
          address: forma60.workplace?.address || forma60.address?.fullAddress,
          location: forma60.workplace?.location,
          lat: forma60.workplace?.osmData?.lat,
          lon: forma60.workplace?.osmData?.lon
        },
        status: 'kerak',
        createdBy: forma60.createdBy
      });

      console.log(`✓ ${forma60.fullName} - Dezinfeksiya yaratildi`);
      created++;
    }

    console.log(`\n===========================================`);
    console.log(`Yaratildi: ${created} ta`);
    console.log(`O'tkazib yuborildi: ${skipped} ta`);
    console.log(`===========================================\n`);

    process.exit(0);
  } catch (error) {
    console.error('Xatolik:', error);
    process.exit(1);
  }
};

createMissingDisinfections();
