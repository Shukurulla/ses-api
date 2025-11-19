const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const Patient = require('../models/Patient');
const District = require('../models/District');
const Clinic = require('../models/Clinic');
const Investigation = require('../models/Investigation');
const Disinfection = require('../models/Disinfection');
const Report = require('../models/Report');
const {
  districts,
  clinics,
  generatePatients,
  generateInvestigations,
  generateDisinfections,
  generateReports
} = require('./fakeData');

// Load env vars
dotenv.config();

// MongoDB ga ulanish
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ses-db');
    console.log('MongoDB ga muvaffaqiyatli ulanildi');
  } catch (error) {
    console.error('MongoDB ga ulanishda xatolik:', error.message);
    process.exit(1);
  }
};

// Ma'lumotlarni o'chirish
const deleteData = async () => {
  try {
    await User.deleteMany();
    await Patient.deleteMany();
    await District.deleteMany();
    await Clinic.deleteMany();
    await Investigation.deleteMany();
    await Disinfection.deleteMany();
    await Report.deleteMany();
    console.log('Barcha ma\'lumotlar o\'chirildi ✓');
  } catch (error) {
    console.error('Ma\'lumotlarni o\'chirishda xatolik:', error.message);
    throw error;
  }
};

// Ma'lumotlarni yuklash
const importData = async () => {
  try {
    console.log('\n📊 Ma\'lumotlar yuklanmoqda...\n');

    // 1. Foydalanuvchilarni yaratish
    console.log('1️⃣  Foydalanuvchilar yaratilmoqda...');
    const users = await User.create([
      {
        fullName: 'Admin User',
        username: 'admin',
        email: 'admin@ses.uz',
        password: 'admin123',
        role: 'admin',
        workplace: 'SES',
        phone: '+998 90 123-45-67',
        isActive: true
      },
      {
        fullName: 'Aliyev Jasur',
        username: 'epidemiolog1',
        email: 'jasur@ses.uz',
        password: 'epi123',
        role: 'epidemiolog',
        workplace: 'SES',
        phone: '+998 91 234-56-78',
        isActive: true
      },
      {
        fullName: 'Karimova Malika',
        username: 'laborant1',
        email: 'malika@ses.uz',
        password: 'lab123',
        role: 'laborant',
        workplace: 'Laboratoriya',
        phone: '+998 93 345-67-89',
        isActive: true
      },
      {
        fullName: 'Rahmonov Otabek',
        username: 'shifokor1',
        email: 'otabek@ses.uz',
        password: 'doc123',
        role: 'shifokor',
        workplace: 'Shifoxona',
        phone: '+998 94 456-78-90',
        isActive: true
      },
      {
        fullName: 'Yusupova Dilfuza',
        username: 'statistik1',
        email: 'dilfuza@ses.uz',
        password: 'stat123',
        role: 'statistik',
        workplace: 'SES',
        phone: '+998 97 567-89-01',
        isActive: true
      }
    ]);
    console.log(`   ✓ ${users.length} ta foydalanuvchi yaratildi`);

    const userIds = users.map(user => user._id);

    // 2. Tumanlarni yaratish
    console.log('\n2️⃣  Tumanlar yaratilmoqda...');
    const districtDocs = await District.create(
      districts.map(d => ({
        name: d.name,
        region: 'Нукус шаҳар'
      }))
    );
    console.log(`   ✓ ${districtDocs.length} ta tuman yaratildi`);

    // 3. Poliklinikalar va muassasalarni yaratish
    console.log('\n3️⃣  Poliklinikalar va muassasalar yaratilmoqda...');
    const clinicDocs = await Clinic.create(
      clinics.map(c => ({
        ...c,
        coordinates: {
          latitude: 42.4500 + (Math.random() - 0.5) * 0.1,
          longitude: 59.6100 + (Math.random() - 0.5) * 0.1
        },
        patientCount: Math.floor(Math.random() * 50) + 10
      }))
    );
    console.log(`   ✓ ${clinicDocs.length} ta muassasa yaratildi`);

    // 4. Bemorlarni yaratish
    console.log('\n4️⃣  Bemorlar yaratilmoqda...');
    const patientData = generatePatients(50, userIds);
    const patientDocs = await Patient.create(patientData);
    console.log(`   ✓ ${patientDocs.length} ta bemor yaratildi`);

    const patientIds = patientDocs.map(patient => patient._id);

    // 5. Tekshiruvlarni yaratish
    console.log('\n5️⃣  Tekshiruvlar yaratilmoqda...');
    const investigationData = generateInvestigations(20, userIds, patientIds);
    const investigationDocs = await Investigation.create(investigationData);
    console.log(`   ✓ ${investigationDocs.length} ta tekshiruv yaratildi`);

    // 6. Dezinfeksiyalarni yaratish
    console.log('\n6️⃣  Dezinfeksiyalar yaratilmoqda...');
    const disinfectionData = generateDisinfections(30, userIds, patientIds);
    const disinfectionDocs = await Disinfection.create(disinfectionData);
    console.log(`   ✓ ${disinfectionDocs.length} ta dezinfeksiya yaratildi`);

    // 7. Hisobotlarni yaratish
    console.log('\n7️⃣  Hisobotlar yaratilmoqda...');
    const reportData = generateReports(15, userIds);
    const reportDocs = await Report.create(reportData);
    console.log(`   ✓ ${reportDocs.length} ta hisobot yaratildi`);

    console.log('\n✅ Barcha ma\'lumotlar muvaffaqiyatli yuklandi!\n');
    console.log('📈 Jami yaratilgan ma\'lumotlar:');
    console.log(`   • Foydalanuvchilar: ${users.length}`);
    console.log(`   • Tumanlar: ${districtDocs.length}`);
    console.log(`   • Muassasalar: ${clinicDocs.length}`);
    console.log(`   • Bemorlar: ${patientDocs.length}`);
    console.log(`   • Tekshiruvlar: ${investigationDocs.length}`);
    console.log(`   • Dezinfeksiyalar: ${disinfectionDocs.length}`);
    console.log(`   • Hisobotlar: ${reportDocs.length}`);
    console.log('\n📝 Test foydalanuvchilar:');
    console.log('   • admin / admin123 (Admin)');
    console.log('   • epidemiolog1 / epi123 (Epidemiolog)');
    console.log('   • laborant1 / lab123 (Laborant)');
    console.log('   • shifokor1 / doc123 (Shifokor)');
    console.log('   • statistik1 / stat123 (Statistik)\n');

  } catch (error) {
    console.error('Ma\'lumotlarni yuklashda xatolik:', error.message);
    throw error;
  }
};

// Asosiy funksiya
const seedDatabase = async () => {
  try {
    await connectDB();

    // Argument orqali o'chirish yoki yuklash
    const args = process.argv.slice(2);

    if (args.includes('-d') || args.includes('--delete')) {
      console.log('🗑️  Ma\'lumotlar o\'chirilmoqda...\n');
      await deleteData();
      console.log('\n✅ Ma\'lumotlar muvaffaqiyatli o\'chirildi!\n');
    } else {
      // Avval eski ma'lumotlarni o'chirish
      await deleteData();
      // Yangi ma'lumotlarni yuklash
      await importData();
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Xatolik:', error.message);
    process.exit(1);
  }
};

// Skriptni ishga tushirish
seedDatabase();
