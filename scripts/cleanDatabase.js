const mongoose = require('mongoose');
require('dotenv').config();

// Modellarni import qilish
const Forma60 = require('../src/models/Forma60');
const Karta = require('../src/models/Karta');

async function cleanDatabase() {
  try {
    // MongoDB ga ulanish
    console.log('MongoDB ga ulanilmoqda...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ MongoDB ga muvaffaqiyatli ulandi\n');

    // Hozirgi holatni ko'rsatish
    const forma60Count = await Forma60.countDocuments();
    const kartaCount = await Karta.countDocuments();

    console.log('=== HOZIRGI HOLAT ===');
    console.log(`Forma60 yozuvlari: ${forma60Count}`);
    console.log(`Karta yozuvlari: ${kartaCount}`);
    console.log('====================\n');

    if (forma60Count === 0 && kartaCount === 0) {
      console.log('Ma\'lumotlar bazasi allaqachon tozalangan.');
      process.exit(0);
    }

    // Tasdiqlash uchun kutish
    console.log('⚠️  OGOHLANTIRISH: Barcha ma\'lumotlar o\'chiriladi!');
    console.log('Davom etish uchun 5 soniya kutilmoqda...\n');

    await new Promise(resolve => setTimeout(resolve, 5000));

    // Ma'lumotlarni o'chirish
    console.log('Ma\'lumotlar o\'chirilmoqda...\n');

    // Forma60 ni tozalash
    console.log('Forma60 collection tozalanmoqda...');
    const forma60Result = await Forma60.deleteMany({});
    console.log(`✓ ${forma60Result.deletedCount} ta Forma60 yozuvi o'chirildi`);

    // Karta ni tozalash
    console.log('Karta collection tozalanmoqda...');
    const kartaResult = await Karta.deleteMany({});
    console.log(`✓ ${kartaResult.deletedCount} ta Karta yozuvi o'chirildi\n`);

    // Yakuniy natija
    console.log('=== YAKUNIY HOLAT ===');
    const newForma60Count = await Forma60.countDocuments();
    const newKartaCount = await Karta.countDocuments();
    console.log(`Forma60 yozuvlari: ${newForma60Count}`);
    console.log(`Karta yozuvlari: ${newKartaCount}`);
    console.log('====================\n');

    console.log('✓ Ma\'lumotlar bazasi muvaffaqiyatli tozalandi!');

  } catch (error) {
    console.error('❌ Xatolik yuz berdi:', error.message);
    process.exit(1);
  } finally {
    // MongoDB connection ni yopish
    await mongoose.connection.close();
    console.log('MongoDB connection yopildi');
    process.exit(0);
  }
}

// Scriptni ishga tushirish
cleanDatabase();
