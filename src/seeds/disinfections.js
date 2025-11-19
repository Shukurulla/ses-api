const Disinfection = require('../models/Disinfection');

const disinfectionsData = (userId, patientIds) => [
  {
    patient: patientIds[0],
    address: 'Chilonzor tumani, 12-kvartal, 15-uy',
    coordinates: { lat: 41.2856, lng: 69.2034 },
    status: 'bajarildi',
    assignedDate: new Date('2024-11-02'),
    completedDate: new Date('2024-11-03'),
    disinfector: userId,
    disinfectionType: 'yakuniy',
    chemicals: ['Xlorin', 'Dezaktiv'],
    area: 120,
    photos: ['photo1.jpg', 'photo2.jpg'],
    notes: 'Dezinfeksiya muvaffaqiyatli yakunlandi. Barcha xonalar qayta ishlandi.',
    createdBy: userId
  },
  {
    patient: patientIds[1],
    address: 'Chilonzor tumani, 9-kvartal, 23-uy',
    coordinates: { lat: 41.2876, lng: 69.2054 },
    status: 'jarayonda',
    assignedDate: new Date('2024-11-10'),
    scheduledDate: new Date('2024-11-14'),
    disinfector: userId,
    disinfectionType: 'uchqun',
    chemicals: ['Xlorin'],
    area: 95,
    notes: 'Uy egasi bilan kelishildi, 14-noyabr kuni amalga oshiriladi',
    createdBy: userId
  },
  {
    patient: patientIds[2],
    address: 'Yunusobod tumani, 5-mavze, 8-uy',
    coordinates: { lat: 41.3344, lng: 69.2889 },
    status: 'tayinlangan',
    assignedDate: new Date('2024-11-11'),
    scheduledDate: new Date('2024-11-15'),
    disinfector: userId,
    disinfectionType: 'sogichli',
    chemicals: ['Dezaktiv', 'Septodor'],
    area: 80,
    notes: '1-son poliklinika binosi',
    createdBy: userId
  },
  {
    patient: patientIds[3],
    address: 'Sergeli tumani, Qorakamish 2, 45-uy',
    coordinates: { lat: 41.2269, lng: 69.2233 },
    status: 'bajarildi',
    assignedDate: new Date('2024-10-29'),
    completedDate: new Date('2024-10-30'),
    disinfector: userId,
    disinfectionType: 'yakuniy',
    chemicals: ['Xlorin', 'Dezaktiv'],
    area: 110,
    photos: ['photo3.jpg'],
    notes: '12-son bolalar bog\'chasi to\'liq dezinfeksiya qilindi',
    createdBy: userId
  },
  {
    patient: patientIds[4],
    address: 'Sergeli tumani, Qorakamish 2, 52-uy',
    coordinates: { lat: 41.2275, lng: 69.2240 },
    status: 'bajarildi',
    assignedDate: new Date('2024-10-30'),
    completedDate: new Date('2024-10-31'),
    disinfector: userId,
    disinfectionType: 'uchqun',
    chemicals: ['Xlorin'],
    area: 85,
    notes: 'Qizilcha kasalligi bo\'yicha uchqun dezinfeksiya',
    createdBy: userId
  },
  {
    patient: patientIds[5],
    address: 'Mirobod tumani, Massiv 3, 78-uy',
    coordinates: { lat: 41.3142, lng: 69.2683 },
    status: 'tayinlangan',
    assignedDate: new Date('2024-11-12'),
    scheduledDate: new Date('2024-11-16'),
    disinfector: userId,
    disinfectionType: 'yakuniy',
    chemicals: ['Xlorin', 'Dezaktiv', 'Septodor'],
    area: 145,
    notes: 'Elektr tarmoqlari binosida dezinfeksiya',
    createdBy: userId
  },
  {
    patient: patientIds[6],
    address: 'Shayxontohur tumani, Amir Temur ko\'chasi, 25-uy',
    coordinates: { lat: 41.3111, lng: 69.2797 },
    status: 'bajarildi',
    assignedDate: new Date('2024-11-10'),
    completedDate: new Date('2024-11-12'),
    disinfector: userId,
    disinfectionType: 'yakuniy',
    chemicals: ['Xlorin', 'Dezaktiv', 'Tuberkulyozga qarshi maxsus vosita'],
    area: 300,
    photos: ['hospital4_1.jpg', 'hospital4_2.jpg', 'hospital4_3.jpg'],
    notes: '4-son shifoxona to\'liq dezinfeksiya qilindi',
    createdBy: userId
  },
  {
    patient: patientIds[7],
    address: 'Yakkasaroy tumani, Bog\'ishamol, 12-uy',
    coordinates: { lat: 41.2964, lng: 69.2811 },
    status: 'jarayonda',
    assignedDate: new Date('2024-11-13'),
    scheduledDate: new Date('2024-11-15'),
    disinfector: userId,
    disinfectionType: 'uchqun',
    chemicals: ['Xlorin'],
    area: 75,
    notes: 'Talaba yotoqxonasida dezinfeksiya rejalashtirilgan',
    createdBy: userId
  }
];

const seedDisinfections = async (userId, patientIds) => {
  try {
    await Disinfection.deleteMany({});
    const disinfections = await Disinfection.insertMany(disinfectionsData(userId, patientIds));
    console.log(`✅ ${disinfections.length} ta dezinfeksiya vazifasi yaratildi`);
    return disinfections;
  } catch (error) {
    console.error('❌ Dezinfeksiyalarni yaratishda xatolik:', error.message);
    throw error;
  }
};

module.exports = seedDisinfections;
