const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const District = require('../models/District');
const Clinic = require('../models/Clinic');
const User = require('../models/User');

// Load env vars
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Connect to DB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ses-db');

// Load JSON files
const districtsData = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../../nukus_districts.json'), 'utf-8')
);

const clinicsData = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../../ses_database.json'), 'utf-8')
);

// Import data
const importData = async () => {
  try {
    console.log('Ma\'lumotlar import qilinyapti...');

    // 1. Mahallalarni import qilish
    console.log('1. Mahallalar import qilinyapti...');
    await District.deleteMany();
    await District.insertMany(districtsData);
    console.log('✅ Mahallalar import qilindi');

    // 2. Klinikalarni import qilish
    console.log('2. Klinikalar import qilinyapti...');
    await Clinic.deleteMany();

    const formattedClinics = clinicsData.map(clinic => ({
      institutionName: clinic.institution_name,
      institutionType: clinic.institution_type,
      fullName: clinic.full_name,
      username: clinic.username,
      phone: clinic.phone_number,
      telegramId: clinic.telegram_id?.toString(),
      address: clinic.address,
      landmark: clinic.landmark,
      coordinates: {
        latitude: clinic.latitude,
        longitude: clinic.longitude
      },
      createdAt: clinic.created_at
    }));

    await Clinic.insertMany(formattedClinics);
    console.log('✅ Klinikalar import qilindi');

    // 3. Test admin yaratish
    console.log('3. Test admin yaratilmoqda...');
    const existingAdmin = await User.findOne({ username: 'admin' });

    if (!existingAdmin) {
      await User.create({
        fullName: 'Administrator',
        username: 'admin',
        email: 'admin@ses.uz',
        password: 'admin123',
        role: 'admin',
        workplace: 'SES',
        workplaceDetails: 'Qoraqalpog\'iston Respublika SES'
      });
      console.log('✅ Test admin yaratildi (username: admin, password: admin123)');
    } else {
      console.log('ℹ️  Admin foydalanuvchi allaqachon mavjud');
    }

    // 4. Test epidemiolog yaratish
    console.log('4. Test epidemiolog yaratilmoqda...');
    const existingEpi = await User.findOne({ username: 'epidemiolog' });

    if (!existingEpi) {
      await User.create({
        fullName: 'Epidemiolog Test',
        username: 'epidemiolog',
        email: 'epidemiolog@ses.uz',
        password: 'epi123',
        role: 'epidemiolog',
        workplace: 'SES',
        workplaceDetails: 'Qoraqalpog\'iston Respublika SES'
      });
      console.log('✅ Test epidemiolog yaratildi (username: epidemiolog, password: epi123)');
    } else {
      console.log('ℹ️  Epidemiolog foydalanuvchi allaqachon mavjud');
    }

    console.log('\n✅ Barcha ma\'lumotlar muvaffaqiyatli import qilindi!');
    console.log('\n📊 Statistika:');
    console.log(`   - Mahallalar: ${await District.countDocuments()}`);
    console.log(`   - Klinikalar: ${await Clinic.countDocuments()}`);
    console.log(`   - Foydalanuvchilar: ${await User.countDocuments()}`);
    console.log('\n🔐 Test login ma\'lumotlari:');
    console.log('   Admin: username=admin, password=admin123');
    console.log('   Epidemiolog: username=epidemiolog, password=epi123');

    process.exit(0);
  } catch (error) {
    console.error('❌ Xatolik:', error);
    process.exit(1);
  }
};

// Delete data
const deleteData = async () => {
  try {
    console.log('Ma\'lumotlar o\'chirilmoqda...');
    await District.deleteMany();
    await Clinic.deleteMany();
    await User.deleteMany();
    console.log('✅ Barcha ma\'lumotlar o\'chirildi');
    process.exit(0);
  } catch (error) {
    console.error('❌ Xatolik:', error);
    process.exit(1);
  }
};

// Process arguments
if (process.argv[2] === '-i') {
  importData();
} else if (process.argv[2] === '-d') {
  deleteData();
} else {
  console.log('Foydalanish:');
  console.log('  npm run seed -i  (import qilish)');
  console.log('  npm run seed -d  (o\'chirish)');
  process.exit(0);
}
