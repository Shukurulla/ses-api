const Investigation = require('../models/Investigation');

const investigationsData = (userId, patientIds) => [
  {
    caseNumber: 'EPI-2024-0001',
    disease: 'COVID-19',
    startDate: new Date('2024-11-01'),
    status: 'jarayonda',
    location: 'Chilonzor tumani, Toshkent',
    coordinates: { lat: 41.2856, lng: 69.2034 },
    investigator: userId,
    patients: [patientIds[0], patientIds[1]],
    casesCount: 2,
    description: 'Chilonzor tumanida COVID-19 o\'chog\'i aniqlandi. Ikki bemor tasdiqlangan.',
    findings: 'Bemolarning umumiy ish joyi aniqlandi - IT Park Uzbekistan',
    recommendations: [
      {
        text: 'Ish joyida dezinfeksiya o\'tkazish',
        responsible: userId,
        deadline: new Date('2024-11-05'),
        status: 'bajarildi'
      }
    ],
    createdBy: userId
  },
  {
    caseNumber: 'EPI-2024-0002',
    disease: 'Gripp',
    startDate: new Date('2024-11-05'),
    status: 'yangi',
    location: 'Yunusobod tumani, Toshkent',
    coordinates: { lat: 41.3344, lng: 69.2889 },
    investigator: userId,
    patients: [patientIds[2], patientIds[8]],
    casesCount: 2,
    description: 'Yunusobod tumanida gripp holatlari qayd etildi',
    findings: '1-son poliklinikada kasallik tarqalishi kuzatilmoqda',
    createdBy: userId
  },
  {
    caseNumber: 'EPI-2024-0003',
    disease: 'Qizilcha',
    startDate: new Date('2024-10-28'),
    status: 'jarayonda',
    location: 'Sergeli tumani, Toshkent',
    coordinates: { lat: 41.2269, lng: 69.2233 },
    investigator: userId,
    patients: [patientIds[3], patientIds[4]],
    casesCount: 2,
    description: 'Sergeli tumanida qizilcha o\'chog\'i. Bolalar bog\'chasida aniqlangan.',
    findings: '12-son bolalar bog\'chasida 5 bola kasallangan',
    recommendations: [
      {
        text: 'Bolalar bog\'chasini vaqtincha yopish',
        responsible: userId,
        deadline: new Date('2024-10-29'),
        status: 'bajarildi'
      },
      {
        text: 'Ota-onalarni vaksinatsiya qilish',
        responsible: userId,
        deadline: new Date('2024-11-10'),
        status: 'bajarilmoqda'
      }
    ],
    createdBy: userId
  },
  {
    caseNumber: 'EPI-2024-0004',
    disease: 'Tuberkulyoz',
    startDate: new Date('2024-11-08'),
    status: 'tugatilgan',
    location: 'Shayxontohur tumani, Toshkent',
    coordinates: { lat: 41.3111, lng: 69.2797 },
    investigator: userId,
    patients: [patientIds[6], patientIds[14]],
    casesCount: 2,
    description: 'Shayxontohur tumanida tuberkulyoz holatlari',
    findings: '4-son shifoxonada xodimlar orasida kasallik tarqalgan',
    recommendations: [
      {
        text: 'Barcha xodimlarni tekshirish',
        responsible: userId,
        deadline: new Date('2024-11-15'),
        status: 'bajarildi'
      },
      {
        text: 'Shifoхonada dezinfeksiya',
        responsible: userId,
        deadline: new Date('2024-11-12'),
        status: 'bajarildi'
      }
    ],
    createdBy: userId
  },
  {
    caseNumber: 'EPI-2024-0005',
    disease: 'COVID-19',
    startDate: new Date('2024-11-11'),
    status: 'yangi',
    location: 'Yakkasaroy tumani, Toshkent',
    coordinates: { lat: 41.2964, lng: 69.2811 },
    investigator: userId,
    patients: [patientIds[7], patientIds[10], patientIds[13]],
    casesCount: 3,
    description: 'Yakkasaroy tumanida COVID-19 o\'chog\'i kuzatilmoqda',
    findings: 'Tibbiyot akademiyasida talabalar orasida tarqalgan',
    createdBy: userId
  }
];

const seedInvestigations = async (userId, patientIds) => {
  try {
    await Investigation.deleteMany({});
    const investigations = await Investigation.insertMany(investigationsData(userId, patientIds));
    console.log(`✅ ${investigations.length} ta tergov yaratildi`);
    return investigations;
  } catch (error) {
    console.error('❌ Tergovlarni yaratishda xatolik:', error.message);
    throw error;
  }
};

module.exports = seedInvestigations;
