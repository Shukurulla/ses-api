const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// User modelini import qilish
const User = require('../src/models/User');

/**
 * Admin foydalanuvchi yaratish scripti
 * Login: admin
 * Parol: admin123
 */
async function createAdmin() {
  try {
    // MongoDB ga ulanish
    console.log('MongoDB ga ulanilmoqda...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ MongoDB ga muvaffaqiyatli ulandi\n');

    // Mavjud admin tekshirish
    console.log('Mavjud admin foydalanuvchilarni tekshirish...');
    const existingAdmin = await User.findOne({ username: 'admin' });

    if (existingAdmin) {
      console.log('⚠️  "admin" username bilan foydalanuvchi allaqachon mavjud!');
      console.log('\nMavjud admin ma\'lumotlari:');
      console.log(`   ID: ${existingAdmin._id}`);
      console.log(`   Ism: ${existingAdmin.fullName}`);
      console.log(`   Username: ${existingAdmin.username}`);
      console.log(`   Email: ${existingAdmin.email}`);
      console.log(`   Role: ${existingAdmin.role}`);
      console.log(`   Yaratilgan: ${existingAdmin.createdAt}`);

      console.log('\n❓ Bu foydalanuvchini o\'chirmoqchimisiz?');
      console.log('   Agar ha bo\'lsa, quyidagi buyruqni ishga tushiring:');
      console.log('   node scripts/deleteAdmin.js');

      process.exit(0);
    }

    // Yangi admin yaratish
    console.log('Yangi admin foydalanuvchi yaratilmoqda...\n');

    const adminData = {
      fullName: 'Administrator',
      username: 'admin',
      email: 'admin@ses.uz',
      password: 'admin123', // Pre-save hook avtomatik hash qiladi
      role: 'admin',
      workplace: 'SES',
      workplaceDetails: 'Qoraqalpog\'iston Respublika Sanitariya-Epidemiologiya Xizmati'
    };

    const admin = await User.create(adminData);

    console.log('✅ Admin foydalanuvchi muvaffaqiyatli yaratildi!\n');
    console.log('═══════════════════════════════════════');
    console.log('📋 ADMIN MA\'LUMOTLARI');
    console.log('═══════════════════════════════════════');
    console.log(`   ID:        ${admin._id}`);
    console.log(`   Ism:       ${admin.fullName}`);
    console.log(`   Username:  ${admin.username}`);
    console.log(`   Parol:     admin123`);
    console.log(`   Email:     ${admin.email}`);
    console.log(`   Role:      ${admin.role}`);
    console.log(`   Ish joyi:  ${admin.workplace}`);
    console.log('═══════════════════════════════════════\n');

    console.log('🔐 Login qilish uchun:');
    console.log('   Username: admin');
    console.log('   Parol:    admin123\n');

    console.log('✓ Script muvaffaqiyatli yakunlandi!');

  } catch (error) {
    console.error('\n❌ Xatolik yuz berdi:');
    console.error('   Xato:', error.message);

    if (error.name === 'ValidationError') {
      console.error('\n   Validatsiya xatoliklari:');
      Object.keys(error.errors).forEach(key => {
        console.error(`   - ${key}: ${error.errors[key].message}`);
      });
    }

    if (error.code === 11000) {
      console.error('\n   Bu foydalanuvchi allaqachon mavjud (dublikat xato)');
    }

    process.exit(1);
  } finally {
    // MongoDB connection ni yopish
    await mongoose.connection.close();
    console.log('MongoDB connection yopildi');
    process.exit(0);
  }
}

// Scriptni ishga tushirish
console.log('');
console.log('╔═══════════════════════════════════════╗');
console.log('║   ADMIN FOYDALANUVCHI YARATISH        ║');
console.log('╚═══════════════════════════════════════╝');
console.log('');

createAdmin();
