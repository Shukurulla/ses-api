const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

// Real kasalliklar ro'yxati
const diseases = [
  'Salmonellyoz',
  'Ich burug\'i (dizenteriya)',
  'Gepatit A',
  'Sil (Tuberkulyoz)',
  'Difteriya',
  'Ko\'k yo\'tal',
  'Qizamiq',
  'Qizilcha',
  'Parotit',
  'O\'tkir ich infeksiyasi',
  'Pnevmoniya',
  'Gripp',
  'COVID-19',
  'Meningit',
  'Botulizm'
];

// O'zbek ismlari
const uzbekNames = {
  male: ['Abbos', 'Akmal', 'Alisher', 'Anvar', 'Aziz', 'Bahrom', 'Bekzod', 'Davron', 'Eldor', 'Farruh', 'Gayrat', 'Humoyun', 'Ibrohim', 'Javohir', 'Karim', 'Laziz', 'Mansur', 'Nodir', 'Otabek', 'Parviz', 'Rustam', 'Sanjar', 'Timur', 'Umid', 'Vali', 'Xasan', 'Yorqin', 'Zafar'],
  female: ['Aziza', 'Barno', 'Dildora', 'Feruza', 'Gulnoza', 'Hilola', 'Kamola', 'Laylo', 'Malika', 'Nodira', 'Oydin', 'Parvina', 'Robiya', 'Saida', 'Tanzila', 'Umida', 'Vasila', 'Xurshida', 'Yulduz', 'Zilola'],
  surnames: ['Axmedov', 'Bahromov', 'G\'afurov', 'Ismoilov', 'Karimov', 'Mamatov', 'Nig\'matov', 'Ortiqov', 'Rahimov', 'Saidov', 'Tursunov', 'Usmonov', 'Xolmatov', 'Yusupov', 'Zokirov']
};

// Random funksiyalar
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomElement = (arr) => arr[randomInt(0, arr.length - 1)];
const randomDate = (start, end) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));

// Nukus koordinatalari
const nukusCoordinates = {
  center: { lat: 42.4531, lng: 59.6103 },
  radius: 0.1 // ~10km radius
};

const generateRandomCoordinates = () => {
  const angle = Math.random() * 2 * Math.PI;
  const radius = Math.random() * nukusCoordinates.radius;
  return {
    latitude: nukusCoordinates.center.lat + (radius * Math.cos(angle)),
    longitude: nukusCoordinates.center.lng + (radius * Math.sin(angle))
  };
};

const generateFullName = () => {
  const isMale = Math.random() > 0.5;
  const firstName = randomElement(isMale ? uzbekNames.male : uzbekNames.female);
  const lastName = randomElement(uzbekNames.surnames);
  const patronymic = randomElement(uzbekNames.male) + 'ovich';
  return `${lastName} ${firstName} ${patronymic}`;
};

const seedData = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ses';
  const client = new MongoClient(uri);

  console.log('Connecting to MongoDB:', uri.replace(/\/\/[^:]+:[^@]+@/, '//*****:*****@'));

  try {
    await client.connect();
    console.log('MongoDB connected');

    const db = client.db();
    const forma60Collection = db.collection('forma60s');
    const kartaCollection = db.collection('kartas');
    const usersCollection = db.collection('users');
    const districtsCollection = db.collection('districts');

    console.log('Starting data seeding...');

    // Get admin user
    const adminUser = await usersCollection.findOne({ role: 'admin', isDeleted: false });
    if (!adminUser) {
      console.error('Admin user not found!');
      process.exit(1);
    }

    // Get all districts
    const districts = await districtsCollection.find({ isDeleted: false }).toArray();
    if (districts.length === 0) {
      console.error('No districts found!');
      process.exit(1);
    }

    console.log(`Found ${districts.length} districts`);

    // Generate 1000 Forma60 records
    const forma60Records = [];
    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-12-31');

    console.log('Generating 1000 Forma60 records...');
    for (let i = 0; i < 1000; i++) {
      const district = randomElement(districts);
      const coordinates = generateRandomCoordinates();
      const birthDate = randomDate(new Date('1950-01-01'), new Date('2020-12-31'));
      const illnessDate = randomDate(startDate, endDate);
      const disease = randomElement(diseases);

      const age = Math.floor((illnessDate - birthDate) / (1000 * 60 * 60 * 24 * 365.25));

      const forma60 = {
        formNumber: `F60-2024-${String(i + 1).padStart(4, '0')}`,
        fullName: generateFullName(),
        birthDate,
        age,
        gender: Math.random() > 0.5 ? 'erkak' : 'ayol',
        address: {
          mahalla: district._id,
          fullAddress: `${district.name}, ${randomInt(1, 100)}-uy, ${randomInt(1, 50)}-xonadon`,
          coordinates: {
            latitude: coordinates.latitude,
            longitude: coordinates.longitude
          }
        },
        illnessDate,
        diagnosisDate: new Date(illnessDate.getTime() + randomInt(1, 7) * 24 * 60 * 60 * 1000),
        primaryDiagnosis: disease,
        finalDiagnosis: disease,
        diagnosisMethod: randomElement(['laboratoriya', 'klinik', 'epidemiologik']),
        hospitalized: Math.random() > 0.7,
        hospitalName: Math.random() > 0.7 ? 'Nukus shahar kasalxonasi' : undefined,
        admissionDate: Math.random() > 0.7 ? illnessDate : undefined,
        treatmentOutcome: randomElement(['davom etmoqda', 'tuzalgan', 'o\'lim']),
        contactsCount: 0,
        contactedPersons: [],
        contactsStatus: [],
        foodInspection: {},
        laboratoryResults: { confirmed: false },
        outbreak: { relatedCases: [] },
        disinfectionRequired: true,
        disinfectionStatus: 'kerak',
        assignedToCardFillers: [],
        status: randomElement(['yangi', 'karta_toldirishda', 'dezinfeksiya_kutilmoqda', 'tugatilgan']),
        editHistory: [],
        isDeleted: false,
        createdBy: adminUser._id,
        createdAt: illnessDate,
        updatedAt: illnessDate
      };

      forma60Records.push(forma60);

      if ((i + 1) % 100 === 0) {
        console.log(`Generated ${i + 1}/1000 Forma60 records`);
      }
    }

    // Insert Forma60 records
    console.log('Inserting Forma60 records into database...');
    const insertedForma60s = await forma60Collection.insertMany(forma60Records);
    console.log(`✓ Successfully inserted ${insertedForma60s.insertedCount} Forma60 records`);

    // Get inserted IDs
    const insertedIds = Object.values(insertedForma60s.insertedIds);

    // Generate 1000 Karta records
    console.log('Generating 1000 Karta records...');
    const kartaRecords = [];

    for (let i = 0; i < 1000; i++) {
      const forma60Id = randomElement(insertedIds);
      const forma60 = forma60Records.find(f => String(f._id) === String(forma60Id)) || forma60Records[i];

      const karta = {
        forma60: forma60Id,
        pdfType: randomElement(['type1', 'type2', 'type3']),
        status: randomElement(['draft', 'completed']),
        parsedData: {
          fullName: forma60.fullName,
          birthDate: forma60.birthDate,
          diagnosis: forma60.primaryDiagnosis,
          address: forma60.address.fullAddress
        },
        isDeleted: false,
        createdBy: adminUser._id,
        createdAt: forma60.createdAt,
        updatedAt: forma60.createdAt
      };

      kartaRecords.push(karta);

      if ((i + 1) % 100 === 0) {
        console.log(`Generated ${i + 1}/1000 Karta records`);
      }
    }

    // Insert Karta records
    console.log('Inserting Karta records into database...');
    const insertedKartas = await kartaCollection.insertMany(kartaRecords);
    console.log(`✓ Successfully inserted ${insertedKartas.insertedCount} Karta records`);

    console.log('\n✅ Data seeding completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - Forma60 records: ${insertedForma60s.insertedCount}`);
    console.log(`   - Karta records: ${insertedKartas.insertedCount}`);
    console.log(`   - Districts used: ${districts.length}`);
    console.log(`   - Date range: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`);

    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
};

seedData();
