const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Forma60 = require("../models/Forma60");
const Karta = require("../models/Karta");
const District = require("../models/District");
const User = require("../models/User");

dotenv.config();

// MongoDB ga ulanish
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB ga muvaffaqiyatli ulanildi");
  } catch (error) {
    console.error("MongoDB ga ulanishda xatolik:", error.message);
    process.exit(1);
  }
};

// Fake data generatorlar
const uzbekNames = [
  "Abdullayev Jasur", "Karimova Malika", "Rahmonov Otabek", "Yusupova Dilfuza",
  "Tursunov Alisher", "Mahmudova Nodira", "Hasanov Rustam", "Sharipova Zarina",
  "Ismoilov Bobur", "Nazarova Gulnora", "Azizov Sardor", "Ahmadova Feruza",
  "Mirzayev Jamshid", "Saidova Dildora", "Umarov Sherzod", "Hikmatova Sevara",
  "Olimov Farkhod", "Rahmanova Madina", "Solikhov Umid", "Ergasheva Nilufar",
  "Normatov Davron", "Karimova Saida", "Sharipov Akmal", "Yuldasheva Maftuna",
  "Toshmatov Ravshan", "Nasirova Kamila", "Komilov Zafar", "Mahmudova Shoira",
  "Abdurakhmonov Farrukh", "Ismailova Dilorom", "Nematov Islom", "Nazarova Laylo",
  "Zakirov Aziz", "Ergasheva Mukhtabar", "Sobirova Dilbar", "Turdiyev Shohruh",
  "Rakhimova Zebo", "Alimova Munira", "Usmanov Bekzod", "Yuldasheva Komila"
];

const diseases = [
  "Bacillar dizenteriya",
  "Salmonellyoz",
  "Shigelloz",
  "Gepatit A",
  "Paratif",
  "Kolera",
  "Dizenteriya",
  "O'tkir ich-qorin infeksiyasi",
  "Qizilmiya",
  "Qizamiq",
  "Tuberkulyoz",
  "COVID-19",
  "Gripp",
  "Pnevmoniya"
];

const addresses = [
  "Нурлы бостан махалласи",
  "Достлик махалласи",
  "Ғалаба махалласи",
  "Шодлы аўыл махалласи",
  "Тинчлик махалласи",
  "Жасорат махалласи",
  "Мустақиллик махалласи",
  "Келажак махалласи",
  "Навбаҳор махалласи",
  "Баракат махалласи"
];

// Tasodifiy sana generatori
const randomDate = (start, end) => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

// Forma60 yaratish
const generateForma60s = (count, mahallaIds, userIds) => {
  const forma60s = [];

  for (let i = 0; i < count; i++) {
    const birthDate = randomDate(new Date(1950, 0, 1), new Date(2020, 0, 1));
    const illnessDate = randomDate(new Date(2024, 0, 1), new Date());
    const age = new Date().getFullYear() - birthDate.getFullYear();

    forma60s.push({
      fullName: uzbekNames[Math.floor(Math.random() * uzbekNames.length)],
      birthDate: birthDate,
      age: age,
      gender: Math.random() > 0.5 ? 'erkak' : 'ayol',
      identification: {
        type: Math.random() > 0.5 ? 'pasport' : 'metrika',
        pasportSeries: Math.random() > 0.5 ? 'AA' : 'AB',
        pasportNumber: Math.floor(Math.random() * 9000000) + 1000000,
        metrikaNumber: Math.floor(Math.random() * 900000) + 100000
      },
      address: {
        mahalla: mahallaIds[Math.floor(Math.random() * mahallaIds.length)],
        fullAddress: addresses[Math.floor(Math.random() * addresses.length)] + `, ${Math.floor(Math.random() * 100) + 1}-uy`,
        location: {
          type: 'Point',
          coordinates: [59.6 + Math.random() * 0.2, 42.4 + Math.random() * 0.2]
        }
      },
      workplace: {
        name: `Ish joyi ${Math.floor(Math.random() * 100) + 1}`,
        address: addresses[Math.floor(Math.random() * addresses.length)],
        location: {
          type: 'Point',
          coordinates: [59.6 + Math.random() * 0.2, 42.4 + Math.random() * 0.2]
        }
      },
      primaryDiagnosis: diseases[Math.floor(Math.random() * diseases.length)],
      finalDiagnosis: diseases[Math.floor(Math.random() * diseases.length)],
      illnessDate: illnessDate,
      hospitalizationDate: new Date(illnessDate.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000),
      status: ['yangi', 'karta_toldirishda', 'dezinfeksiya_kutilmoqda', 'tugatilgan'][Math.floor(Math.random() * 4)],
      assignedToCardFillers: Math.random() > 0.5 ? [userIds[Math.floor(Math.random() * userIds.length)]] : [],
      createdBy: userIds[Math.floor(Math.random() * userIds.length)]
    });
  }

  return forma60s;
};

// Karta yaratish
const generateKartas = (count, forma60Ids, userIds) => {
  const kartas = [];

  const patientStatuses = ['oqiydi', 'ishlaydi', 'boshqa'];
  const transmissionFactors = ['Suv', 'Oziq-ovqat', 'Sut mahsulotlari', 'Gosht mahsulotlari', 'Kontakt yoli', 'Boshqa'];
  const infectionSources = ['Uyda', 'MTT', 'Maktab', 'DPM', 'Umumiy ovqatlanish korxonalari', 'Boshqa'];
  const cultureTypes = [
    'Salmonella tifimurium', 'Salmonella enteriditis', 'Fleksner shigellasi',
    'E.coli', 'Rotavirus', 'Boshqa'
  ];

  for (let i = 0; i < count; i++) {
    const patientStatus = patientStatuses[Math.floor(Math.random() * patientStatuses.length)];

    const karta = {
      forma60: forma60Ids[Math.floor(Math.random() * forma60Ids.length)],
      patientStatus: patientStatus,
      transmissionFactor: transmissionFactors[Math.floor(Math.random() * transmissionFactors.length)],
      infectionSource: infectionSources[Math.floor(Math.random() * infectionSources.length)],
      laboratoryResults: {
        confirmed: Math.random() > 0.5,
        cultureType: cultureTypes[Math.floor(Math.random() * cultureTypes.length)],
        testDate: randomDate(new Date(2024, 0, 1), new Date())
      },
      outbreak: {
        hasOutbreak: Math.random() > 0.7,
        relatedCases: []
      },
      status: ['draft', 'completed'][Math.floor(Math.random() * 2)],
      createdBy: userIds[Math.floor(Math.random() * userIds.length)]
    };

    // Agar oqiydi bo'lsa
    if (patientStatus === 'oqiydi') {
      karta.educationType = ['detsat', 'maktab', 'universitet', 'texnikum', 'kolej'][Math.floor(Math.random() * 5)];
    }
    // Agar ishlaydi bo'lsa
    else if (patientStatus === 'ishlaydi') {
      karta.workType = ['medic', 'restoran', 'suv', 'boshqa'][Math.floor(Math.random() * 4)];
    }

    kartas.push(karta);
  }

  return kartas;
};

// Seed qilish
const seedData = async () => {
  try {
    await connectDB();

    console.log("\n📊 Forma60 va Karta uchun ma'lumotlar yaratilmoqda...\n");

    // Eski ma'lumotlarni o'chirish
    console.log("🗑️  Eski Forma60 va Karta larni o'chirish...");
    await Forma60.deleteMany({});
    await Karta.deleteMany({});
    console.log("   ✓ O'chirildi\n");

    // Mahalla va User IDlarni olish
    const mahallaIds = await District.find({}).select('_id').limit(20);
    const userIds = await User.find({}).select('_id');

    if (mahallaIds.length === 0 || userIds.length === 0) {
      console.error("❌ Mahalla yoki User topilmadi! Avval asosiy seed'ni ishga tushiring.");
      process.exit(1);
    }

    console.log(`   ℹ️  ${mahallaIds.length} ta mahalla va ${userIds.length} ta user topildi\n`);

    // Forma60 yaratish
    console.log("1️⃣  1000 ta Forma60 yaratilmoqda...");
    const forma60Data = generateForma60s(
      1000,
      mahallaIds.map(d => d._id),
      userIds.map(u => u._id)
    );
    // insertMany ordered: false - davom etadi agar xato bo'lsa ham
    let forma60Docs = [];
    try {
      forma60Docs = await Forma60.insertMany(forma60Data, {ordered: false});
      console.log(`   ✓ ${forma60Docs.length} ta Forma60 yaratildi\n`);
    } catch (error) {
      // MongoBulkWriteError - ba'zilari muvaffaqiyatli bo'lgan bo'lishi mumkin
      if (error.insertedDocs) {
        forma60Docs = error.insertedDocs;
        console.log(`   ⚠️  ${forma60Docs.length} ta Forma60 yaratildi (${error.writeErrors?.length || 0} ta xato)\n`);
      } else {
        console.error('   ❌ Forma60 yaratishda xatolik:', error.message);
        throw error;
      }
    }

    // Karta yaratish
    console.log("2️⃣  1000 ta Karta yaratilmoqda...");
    const kartaData = generateKartas(
      1000,
      forma60Docs.map(f => f._id),
      userIds.map(u => u._id)
    );
    const kartaDocs = await Karta.insertMany(kartaData, {ordered: false});
    console.log(`   ✓ ${kartaDocs.length} ta Karta yaratildi\n`);

    console.log("✅ Ma'lumotlar muvaffaqiyatli yaratildi!");
    console.log(`   • Forma60: ${forma60Docs.length}`);
    console.log(`   • Karta: ${kartaDocs.length}\n`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Xatolik:", error.message);
    console.error(error);
    process.exit(1);
  }
};

// Ishga tushirish
seedData();
