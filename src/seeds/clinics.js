const Clinic = require('../models/Clinic');

const clinicsData = [
  {
    institutionName: '1-son shahar poliklinikasi',
    institutionType: 'Поликлиника',
    fullName: 'Aliyev Rustam Shavkatovich',
    address: 'Chilonzor tumani, Bunyodkor ko\'chasi, 12-uy',
    landmark: 'Bunyodkor metro bekati yonida',
    phone: '+998712345001',
    coordinates: { latitude: 41.2856, longitude: 69.2034 }
  },
  {
    institutionName: '2-son shahar poliklinikasi',
    institutionType: 'Поликлиника',
    fullName: 'Karimova Nodira Akmalovna',
    address: 'Yunusobod tumani, Amir Temur ko\'chasi, 45-uy',
    landmark: 'Amir Temur ko\'chasi',
    phone: '+998712345002',
    coordinates: { latitude: 41.3344, longitude: 69.2889 }
  },
  {
    institutionName: '3-son shahar poliklinikasi',
    institutionType: 'Поликлиника',
    fullName: 'Rahimov Jasur Olimovich',
    address: 'Mirobod tumani, Amir Temur ko\'chasi, 78-uy',
    landmark: 'Amir Temur xiyoboni',
    phone: '+998712345003',
    coordinates: { latitude: 41.3111, longitude: 69.2797 }
  },
  {
    institutionName: '4-son shahar poliklinikasi',
    institutionType: 'Поликлиника',
    fullName: 'Yusupova Malika Akbarovna',
    address: 'Shayxontohur tumani, Navoi ko\'chasi, 23-uy',
    landmark: 'Navoi ko\'chasi',
    phone: '+998712345004',
    coordinates: { latitude: 41.3156, longitude: 69.2506 }
  },
  {
    institutionName: '5-son shahar poliklinikasi',
    institutionType: 'Поликлиника',
    fullName: 'Ergashev Dilshod Bahodirovich',
    address: 'Yakkasaroy tumani, Shota Rustaveli ko\'chasi, 45-uy',
    landmark: 'Shota Rustaveli ko\'chasi',
    phone: '+998712345005',
    coordinates: { latitude: 41.2964, longitude: 69.2811 }
  },
  {
    institutionName: '6-son shahar poliklinikasi',
    institutionType: 'Поликлиника',
    fullName: 'Abdullayev Otabek Farhodovich',
    address: 'Uchtepa tumani, Farobiy ko\'chasi, 89-uy',
    landmark: 'Farobiy ko\'chasi',
    phone: '+998712345006',
    coordinates: { latitude: 41.2936, longitude: 69.1989 }
  },
  {
    institutionName: '7-son shahar poliklinikasi',
    institutionType: 'Поликлиника',
    fullName: 'Toshmatova Feruza Sharipovna',
    address: 'Sergeli tumani, Qorakamish massivi, 12-uy',
    landmark: 'Qorakamish 1',
    phone: '+998712345007',
    coordinates: { latitude: 41.2269, longitude: 69.2233 }
  },
  {
    institutionName: '8-son shahar poliklinikasi',
    institutionType: 'Поликлиника',
    fullName: 'Karimov Sardor Rustamovich',
    address: 'Olmazor tumani, Qatortol ko\'chasi, 34-uy',
    landmark: 'Qatortol ko\'chasi',
    phone: '+998712345008',
    coordinates: { latitude: 41.3344, longitude: 69.2256 }
  },
  {
    institutionName: '9-son shahar poliklinikasi',
    institutionType: 'Поликлиника',
    fullName: 'Normatova Dilnoza Azimovna',
    address: 'Bektemir tumani, Quyosh massivi, 56-uy',
    landmark: 'Quyosh massivi',
    phone: '+998712345009',
    coordinates: { latitude: 41.2333, longitude: 69.3000 }
  },
  {
    institutionName: '10-son shahar poliklinikasi',
    institutionType: 'Поликлиника',
    fullName: 'Ismoilov Aziz Akbarovich',
    address: 'Yashnobod tumani, Risoviy bozor ko\'chasi, 67-uy',
    landmark: 'Risoviy bozor',
    phone: '+998712345010',
    coordinates: { latitude: 41.2856, longitude: 69.3189 }
  },
  {
    institutionName: '11-son shahar poliklinikasi',
    institutionType: 'Поликлиника',
    fullName: 'Mamatkulova Gulnora Sharipovna',
    address: 'Mirzo Ulug\'bek tumani, Bogishamol ko\'chasi, 12-uy',
    landmark: 'Bogishamol ko\'chasi',
    phone: '+998712345011',
    coordinates: { latitude: 41.3344, longitude: 69.3367 }
  },
  {
    institutionName: '45-maktab',
    institutionType: 'Школа',
    fullName: 'Karimova Nodira Azimovna',
    address: 'Chilonzor tumani, 9-kvartal',
    landmark: '9-kvartal',
    phone: '+998712345045',
    coordinates: { latitude: 41.2876, longitude: 69.2054 }
  },
  {
    institutionName: '12-son bolalar bog\'chasi',
    institutionType: 'Десткий сад',
    fullName: 'Usmonova Dilnoza Akmalovna',
    address: 'Sergeli tumani, Qorakamish 2',
    landmark: 'Qorakamish 2',
    phone: '+998712345050',
    coordinates: { latitude: 41.2269, longitude: 69.2233 }
  },
  {
    institutionName: 'Toshkent Tibbiyot Akademiyasi',
    institutionType: 'Университет',
    fullName: 'Ibragimov Farhod Nurmatovich',
    address: 'Yakkasaroy tumani, Bog\'ishamol',
    landmark: 'Bog\'ishamol ko\'chasi',
    phone: '+998712345070',
    coordinates: { latitude: 41.2964, longitude: 69.2811 }
  },
  {
    institutionName: '89-son maktab',
    institutionType: 'Школа',
    fullName: 'Yuldasheva Madina',
    address: 'Bektemir tumani, Quyosh mavzesi, 33-uy',
    landmark: 'Quyosh mavzesi',
    phone: '+998712345089',
    coordinates: { latitude: 41.2333, longitude: 69.3000 }
  },
  {
    institutionName: 'IT Park Uzbekistan',
    institutionType: 'Техникум / Колледж',
    fullName: 'Aliyev Sardor',
    address: 'Chilonzor tumani',
    landmark: 'IT Park binosi',
    phone: '+998712345100',
    coordinates: { latitude: 41.2856, longitude: 69.2034 }
  },
  {
    institutionName: '156-son maktab',
    institutionType: 'Школа',
    fullName: 'Normatov Azamat',
    address: 'Sergeli tumani, Sergeli 7',
    landmark: 'Sergeli 7',
    phone: '+998712345156',
    coordinates: { latitude: 41.2275, longitude: 69.2240 }
  }
];

const seedClinics = async () => {
  try {
    await Clinic.deleteMany({});
    const clinics = await Clinic.insertMany(clinicsData);
    console.log(`✅ ${clinics.length} ta muassasa yaratildi`);
    return clinics;
  } catch (error) {
    console.error('❌ Muassasalarni yaratishda xatolik:', error.message);
    throw error;
  }
};

module.exports = seedClinics;
