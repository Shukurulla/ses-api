const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Model
const District = require('../src/models/District');

async function seedDistricts() {
  try {
    // MongoDB ga ulanish
    console.log('MongoDB ga ulanilmoqda...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ MongoDB ga muvaffaqiyatli ulandi\n');

    // JSON faylni o'qish
    const jsonPath = path.join(__dirname, '..', 'nukus_districts.json');
    console.log('JSON fayl o\'qilmoqda:', jsonPath);

    const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    console.log(`✓ ${jsonData.length} ta mahalla ma'lumoti o'qildi\n`);

    // Avvalgi ma'lumotlarni o'chirish
    console.log('Avvalgi ma\'lumotlar o\'chirilmoqda...');
    const deleteResult = await District.deleteMany({});
    console.log(`✓ ${deleteResult.deletedCount} ta eski yozuv o'chirildi\n`);

    // Yangi ma'lumotlarni kiritish
    console.log('Yangi ma\'lumotlar yuklanmoqda...');

    // JSON fayldagi _id larni ObjectId ga o'giramiz
    const districtsToInsert = jsonData.map(district => ({
      _id: new mongoose.Types.ObjectId(district._id),
      name: district.name,
      region: district.region,
      createdAt: new Date(district.createdAt),
      updatedAt: new Date(district.updatedAt),
      __v: district.__v || 0
    }));

    const result = await District.insertMany(districtsToInsert);
    console.log(`✓ ${result.length} ta mahalla muvaffaqiyatli yuklandi\n`);

    // Natijani ko'rsatish
    const count = await District.countDocuments();
    console.log('=== YAKUNIY HOLAT ===');
    console.log(`Jami mahallalar: ${count}`);
    console.log('====================\n');

    // Birinchi 5 tani ko'rsatish
    const samples = await District.find().limit(5);
    console.log('Namuna ma\'lumotlar:');
    samples.forEach((district, index) => {
      console.log(`${index + 1}. ${district.name} (${district.region})`);
    });

    console.log('\n✓ Ma\'lumotlar muvaffaqiyatli yuklandi!');

  } catch (error) {
    console.error('❌ Xatolik yuz berdi:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    // MongoDB connection ni yopish
    await mongoose.connection.close();
    console.log('\nMongoDB connection yopildi');
    process.exit(0);
  }
}

// Scriptni ishga tushirish
seedDistricts();
