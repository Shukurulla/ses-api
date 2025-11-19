const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const importClinicsFromJson = require('./importClinicsFromJson');
const seedPatients = require('./patients');
const seedInvestigations = require('./investigations');
const seedDisinfections = require('./disinfections');
const seedReports = require('./reports');

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

const seedAll = async () => {
  try {
    console.log('🌱 Seed jarayoni boshlandi...\n');

    await connectDB();

    // Get admin user
    const user = await User.findOne({ email: 'admin@ses.uz' });
    if (!user) {
      console.error('❌ Admin foydalanuvchi topilmadi!');
      console.log('   Iltimos, avval login qiling yoki admin yarating.\n');
      process.exit(1);
    }

    console.log(`👤 Foydalanuvchi: ${user.fullName} (${user.email})\n`);
    console.log('──────────────────────────────────────────────────\n');

    // Seed in order (respecting dependencies)
    console.log('📋 1/5 - Poliklinikalar JSON fayldan import qilinmoqda...');
    const clinics = await importClinicsFromJson();
    console.log('');

    console.log('👥 2/5 - Bemorlar yaratilmoqda...');
    const patients = await seedPatients(user._id);
    const patientIds = patients.map(p => p._id);
    console.log('');

    console.log('🔍 3/5 - Tergovlar yaratilmoqda...');
    await seedInvestigations(user._id, patientIds);
    console.log('');

    console.log('🧹 4/5 - Dezinfeksiyalar yaratilmoqda...');
    await seedDisinfections(user._id, patientIds);
    console.log('');

    console.log('📊 5/5 - Hisobotlar yaratilmoqda...');
    await seedReports(user._id);
    console.log('');

    console.log('──────────────────────────────────────────────────');
    console.log('✅ Barcha ma\'lumotlar muvaffaqiyatli yaratildi!\n');
    console.log('📌 Yaratilgan ma\'lumotlar:');
    console.log(`   - ${clinics.length} ta poliklinika (JSON fayldan)`);
    console.log(`   - ${patients.length} ta bemor`);
    console.log(`   - 5 ta tergov`);
    console.log(`   - 8 ta dezinfeksiya vazifasi`);
    console.log(`   - 8 ta hisobot`);
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Seed jarayonida xatolik:', error.message);
    console.error(error);
    process.exit(1);
  }
};

// Run seeder
seedAll();
