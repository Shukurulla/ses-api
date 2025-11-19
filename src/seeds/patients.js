const Patient = require('../models/Patient');

const patientsData = (userId) => [
  {
    fullName: 'Aliyev Sardor Rustamovich',
    birthDate: new Date('1985-05-15'),
    age: 39,
    gender: 'erkak',
    phone: '+998901234567',
    profession: 'Dasturchi',
    district: 'Chilonzor',
    neighborhood: '12-kvartal',
    registrationAddress: 'Chilonzor tumani, 12-kvartal, 15-uy',
    actualAddress: 'Chilonzor tumani, 12-kvartal, 15-uy',
    workplace: {
      name: 'IT Park Uzbekistan',
      address: 'Chilonzor tumani',
      lastVisitDate: new Date('2024-10-31')
    },
    diagnosis: 'Gepatit',
    icd10Code: 'B15',
    diagnosisDate: new Date('2024-11-01'),
    diseaseNature: 'o\'tkir',
    status: 'tasdiqlangan',
    severity: 'o\'rta',
    referralSource: 'Poliklinika',
    referralClinic: '12-son poliklinika',
    createdBy: userId
  },
  {
    fullName: 'Karimova Nodira Azimovna',
    birthDate: new Date('1990-08-22'),
    age: 34,
    gender: 'ayol',
    phone: '+998902345678',
    profession: 'O\'qituvchi',
    district: 'Chilonzor',
    neighborhood: '9-kvartal',
    registrationAddress: 'Chilonzor tumani, 9-kvartal, 23-uy',
    actualAddress: 'Chilonzor tumani, 9-kvartal, 23-uy',
    workplace: {
      name: '45-maktab',
      address: 'Chilonzor tumani',
      lastVisitDate: new Date('2024-11-01')
    },
    diagnosis: 'COVID-19',
    icd10Code: 'U07.1',
    diagnosisDate: new Date('2024-11-02'),
    diseaseNature: 'o\'tkir',
    status: 'davolanmoqda',
    severity: 'engil',
    referralSource: 'Infeksionniy',
    createdBy: userId
  },
  {
    fullName: 'Rahimov Jasur Mahmudovich',
    birthDate: new Date('1978-12-10'),
    age: 45,
    gender: 'erkak',
    phone: '+998903456789',
    profession: 'Shifokor',
    district: 'Yunusobod',
    neighborhood: '5-mavze',
    registrationAddress: 'Yunusobod tumani, 5-mavze, 8-uy',
    actualAddress: 'Yunusobod tumani, 5-mavze, 8-uy',
    workplace: {
      name: '1-son poliklinika',
      address: 'Yunusobod tumani',
      lastVisitDate: new Date('2024-11-04')
    },
    diagnosis: 'Gripp',
    icd10Code: 'J11',
    diagnosisDate: new Date('2024-11-05'),
    diseaseNature: 'o\'tkir',
    status: 'davolanmoqda',
    severity: 'o\'rta',
    referralSource: 'Poliklinika',
    referralClinic: '1-son poliklinika',
    createdBy: userId
  },
  {
    fullName: 'Usmonova Dilnoza Akmalovna',
    birthDate: new Date('2018-03-20'),
    age: 6,
    gender: 'ayol',
    phone: '+998904567890',
    district: 'Sergeli',
    neighborhood: 'Qorakamish 2',
    registrationAddress: 'Sergeli tumani, Qorakamish 2, 45-uy',
    actualAddress: 'Sergeli tumani, Qorakamish 2, 45-uy',
    studyPlace: {
      name: '12-son bolalar bog\'chasi',
      address: 'Sergeli tumani',
      lastVisitDate: new Date('2024-10-27')
    },
    diagnosis: 'Qizilcha',
    icd10Code: 'B05',
    diagnosisDate: new Date('2024-10-28'),
    diseaseNature: 'o\'tkir',
    status: 'davolanmoqda',
    severity: 'engil',
    referralSource: 'Ekstrenniy',
    createdBy: userId
  },
  {
    fullName: 'Tursunov Aziz Shokirovich',
    birthDate: new Date('2019-07-15'),
    age: 5,
    gender: 'erkak',
    phone: '+998905678901',
    district: 'Sergeli',
    neighborhood: 'Qorakamish 2',
    registrationAddress: 'Sergeli tumani, Qorakamish 2, 52-uy',
    actualAddress: 'Sergeli tumani, Qorakamish 2, 52-uy',
    studyPlace: {
      name: '12-son bolalar bog\'chasi',
      address: 'Sergeli tumani',
      lastVisitDate: new Date('2024-10-28')
    },
    diagnosis: 'Qizilcha',
    icd10Code: 'B05',
    diagnosisDate: new Date('2024-10-29'),
    diseaseNature: 'o\'tkir',
    status: 'tuzalgan',
    severity: 'engil',
    referralSource: 'Ekstrenniy',
    createdBy: userId
  },
  {
    fullName: 'Mahmudov Otabek Azamatovich',
    birthDate: new Date('1992-04-12'),
    age: 32,
    gender: 'erkak',
    phone: '+998906789012',
    profession: 'Muhandis',
    district: 'Mirobod',
    neighborhood: 'Massiv 3',
    registrationAddress: 'Mirobod tumani, Massiv 3, 78-uy',
    actualAddress: 'Mirobod tumani, Massiv 3, 78-uy',
    workplace: {
      name: 'Toshkent Elektr Tarmog\'i',
      address: 'Mirobod tumani',
      lastVisitDate: new Date('2024-11-08')
    },
    diagnosis: 'Gepatit',
    icd10Code: 'B16',
    diagnosisDate: new Date('2024-11-09'),
    diseaseNature: 'o\'tkir',
    status: 'tasdiqlangan',
    severity: 'o\'rta',
    referralSource: 'Poliklinika',
    referralClinic: '3-son poliklinika',
    createdBy: userId
  },
  {
    fullName: 'Nazarova Zilola Baxodirovna',
    birthDate: new Date('1987-09-25'),
    age: 37,
    gender: 'ayol',
    phone: '+998907890123',
    profession: 'Hamshira',
    district: 'Shayxontohur',
    neighborhood: 'Amir Temur',
    registrationAddress: 'Shayxontohur tumani, Amir Temur ko\'chasi, 25-uy',
    actualAddress: 'Shayxontohur tumani, Amir Temur ko\'chasi, 25-uy',
    workplace: {
      name: '4-son shifoxona',
      address: 'Shayxontohur tumani',
      lastVisitDate: new Date('2024-11-07')
    },
    diagnosis: 'Tuberkulyoz',
    icd10Code: 'A15',
    diagnosisDate: new Date('2024-11-08'),
    diseaseNature: 'surunkali',
    status: 'davolanmoqda',
    severity: 'og\'ir',
    referralSource: 'Infeksionniy',
    createdBy: userId
  },
  {
    fullName: 'Ibragimov Farhod Nurmatovich',
    birthDate: new Date('1995-11-30'),
    age: 28,
    gender: 'erkak',
    phone: '+998908901234',
    profession: 'Talaba',
    district: 'Yakkasaroy',
    neighborhood: 'Bog\'ishamol',
    registrationAddress: 'Yakkasaroy tumani, Bog\'ishamol, 12-uy',
    actualAddress: 'Yakkasaroy tumani, Bog\'ishamol, 12-uy',
    studyPlace: {
      name: 'Toshkent Tibbiyot Akademiyasi',
      address: 'Yakkasaroy tumani',
      lastVisitDate: new Date('2024-11-06')
    },
    diagnosis: 'COVID-19',
    icd10Code: 'U07.1',
    diagnosisDate: new Date('2024-11-07'),
    diseaseNature: 'o\'tkir',
    status: 'davolanmoqda',
    severity: 'engil',
    referralSource: 'Poliklinika',
    referralClinic: '7-son poliklinika',
    createdBy: userId
  },
  {
    fullName: 'Yuldasheva Madina Shavkatovna',
    birthDate: new Date('2015-06-18'),
    age: 9,
    gender: 'ayol',
    phone: '+998909012345',
    district: 'Bektemir',
    neighborhood: 'Quyosh',
    registrationAddress: 'Bektemir tumani, Quyosh mavzesi, 33-uy',
    actualAddress: 'Bektemir tumani, Quyosh mavzesi, 33-uy',
    studyPlace: {
      name: '89-son maktab',
      address: 'Bektemir tumani',
      lastVisitDate: new Date('2024-11-05')
    },
    diagnosis: 'Gripp',
    icd10Code: 'J11',
    diagnosisDate: new Date('2024-11-06'),
    diseaseNature: 'o\'tkir',
    status: 'davolanmoqda',
    severity: 'engil',
    referralSource: 'Ekstrenniy',
    createdBy: userId
  },
  {
    fullName: 'Xolmatov Javohir Rustamovich',
    birthDate: new Date('1980-02-14'),
    age: 44,
    gender: 'erkak',
    phone: '+998901012345',
    profession: 'Tadbirkor',
    district: 'Uchtepa',
    neighborhood: '5-kvartal',
    registrationAddress: 'Uchtepa tumani, 5-kvartal, 44-uy',
    actualAddress: 'Uchtepa tumani, 5-kvartal, 44-uy',
    workplace: {
      name: 'Biznes Markazi',
      address: 'Uchtepa tumani',
      lastVisitDate: new Date('2024-11-04')
    },
    diagnosis: 'Gepatit',
    icd10Code: 'B16',
    diagnosisDate: new Date('2024-11-05'),
    diseaseNature: 'o\'tkir',
    status: 'tasdiqlangan',
    severity: 'o\'rta',
    referralSource: 'Infeksionniy',
    createdBy: userId
  },
  {
    fullName: 'Sharipov Bobur Akmalovich',
    birthDate: new Date('1993-07-08'),
    age: 31,
    gender: 'erkak',
    phone: '+998911223344',
    profession: 'Mexanik',
    district: 'Yunusobod',
    neighborhood: 'Shota Rustaveli',
    registrationAddress: 'Yunusobod tumani, Shota Rustaveli, 67-uy',
    actualAddress: 'Yunusobod tumani, Shota Rustaveli, 67-uy',
    workplace: {
      name: 'Avtomobil zavodi',
      address: 'Yunusobod tumani',
      lastVisitDate: new Date('2024-11-10')
    },
    diagnosis: 'COVID-19',
    icd10Code: 'U07.1',
    diagnosisDate: new Date('2024-11-11'),
    diseaseNature: 'o\'tkir',
    status: 'davolanmoqda',
    severity: 'o\'rta',
    referralSource: 'Poliklinika',
    referralClinic: '2-son poliklinika',
    createdBy: userId
  },
  {
    fullName: 'Qodirova Sevara Dilshodovna',
    birthDate: new Date('1988-03-25'),
    age: 36,
    gender: 'ayol',
    phone: '+998912334455',
    profession: 'Hisobchi',
    district: 'Mirobod',
    neighborhood: 'Massiv 4',
    registrationAddress: 'Mirobod tumani, Massiv 4, 102-uy',
    actualAddress: 'Mirobod tumani, Massiv 4, 102-uy',
    workplace: {
      name: 'Soliq inspeksiyasi',
      address: 'Mirobod tumani',
      lastVisitDate: new Date('2024-11-09')
    },
    diagnosis: 'Gripp',
    icd10Code: 'J11',
    diagnosisDate: new Date('2024-11-10'),
    diseaseNature: 'o\'tkir',
    status: 'shubha',
    severity: 'engil',
    referralSource: 'Poliklinika',
    referralClinic: '3-son poliklinika',
    createdBy: userId
  },
  {
    fullName: 'Normatov Azamat Baxodirovich',
    birthDate: new Date('2016-11-12'),
    age: 7,
    gender: 'erkak',
    phone: '+998913445566',
    district: 'Sergeli',
    neighborhood: 'Sergeli 7',
    registrationAddress: 'Sergeli tumani, Sergeli 7, 89-uy',
    actualAddress: 'Sergeli tumani, Sergeli 7, 89-uy',
    studyPlace: {
      name: '156-son maktab',
      address: 'Sergeli tumani',
      lastVisitDate: new Date('2024-11-08')
    },
    diagnosis: 'Qizilcha',
    icd10Code: 'B05',
    diagnosisDate: new Date('2024-11-09'),
    diseaseNature: 'o\'tkir',
    status: 'tuzalgan',
    severity: 'engil',
    referralSource: 'Ekstrenniy',
    createdBy: userId
  },
  {
    fullName: 'Ismoilova Feruza Jamshidovna',
    birthDate: new Date('1996-09-30'),
    age: 28,
    gender: 'ayol',
    phone: '+998914556677',
    profession: 'Jurnalist',
    district: 'Shayxontohur',
    neighborhood: 'Xadra',
    registrationAddress: 'Shayxontohur tumani, Xadra, 44-uy',
    actualAddress: 'Shayxontohur tumani, Xadra, 44-uy',
    workplace: {
      name: 'O\'zbekiston teleradiokompaniyasi',
      address: 'Shayxontohur tumani',
      lastVisitDate: new Date('2024-11-12')
    },
    diagnosis: 'COVID-19',
    icd10Code: 'U07.1',
    diagnosisDate: new Date('2024-11-13'),
    diseaseNature: 'o\'tkir',
    status: 'tasdiqlangan',
    severity: 'engil',
    referralSource: 'Infeksionniy',
    createdBy: userId
  },
  {
    fullName: 'Ergashev Jamshid Karimovich',
    birthDate: new Date('1975-01-20'),
    age: 49,
    gender: 'erkak',
    phone: '+998915667788',
    profession: 'Tadqiqotchi',
    district: 'Yakkasaroy',
    neighborhood: 'Sergeli',
    registrationAddress: 'Yakkasaroy tumani, Sergeli, 23-uy',
    actualAddress: 'Yakkasaroy tumani, Sergeli, 23-uy',
    workplace: {
      name: 'Fanlar akademiyasi',
      address: 'Yakkasaroy tumani',
      lastVisitDate: new Date('2024-11-11')
    },
    diagnosis: 'Tuberkulyoz',
    icd10Code: 'A15',
    diagnosisDate: new Date('2024-11-12'),
    diseaseNature: 'surunkali',
    status: 'davolanmoqda',
    severity: 'og\'ir',
    referralSource: 'Poliklinika',
    referralClinic: '7-son poliklinika',
    createdBy: userId
  }
];

const seedPatients = async (userId) => {
  try {
    await Patient.deleteMany({});
    const patients = await Patient.insertMany(patientsData(userId));
    console.log(`✅ ${patients.length} ta bemor yaratildi`);
    return patients;
  } catch (error) {
    console.error('❌ Bemorlarni yaratishda xatolik:', error.message);
    throw error;
  }
};

module.exports = seedPatients;
