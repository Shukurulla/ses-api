const mongoose = require('mongoose');

// Nukus tumanlari va mahallalari
const districts = [
  { name: '1-tumоn', neighborhoods: ['Amu daryo', 'Amudaryo 2', 'Xo\'jayli', 'Katta ovul'] },
  { name: '2-tumоn', neighborhoods: ['Mashxurbek', 'Nurli yo\'l', 'Baxt', 'Guliston'] },
  { name: '3-tumоn', neighborhoods: ['Navruz', 'Oq yo\'l', 'Yangi hayot', 'Samarkand'] },
  { name: '4-tumоn', neighborhoods: ['Turon', 'Gulshan', 'Mustaqillik', 'Yoshlik'] },
];

// Ism-familiyalar
const names = [
  'Aliyev Jasur', 'Karimov Sherzod', 'Rahmonov Otabek', 'Abdullayev Bekzod',
  'Yusupov Aziz', 'Mahmudov Sardor', 'Ismoilov Umid', 'Tursunov Dilshod',
  'Nazarov Rustam', 'Raxmatov Akmal', 'Sharipova Nodira', 'Askarova Gulnora',
  'Ibragimova Feruza', 'Karimova Malika', 'Yuldasheva Dilfuza', 'Xolmatova Shoira',
  'Nurmatova Dilbar', 'Abdullaeva Zarina', 'Saidova Madina', 'Rahimova Nigora'
];

// Telefon raqamlar
const generatePhone = () => {
  const prefix = ['+998 90', '+998 91', '+998 93', '+998 94', '+998 97'];
  const randomPrefix = prefix[Math.floor(Math.random() * prefix.length)];
  const randomNumber = Math.floor(1000000 + Math.random() * 9000000);
  return `${randomPrefix} ${randomNumber}`;
};

// Tasodifiy sana generatori
const randomDate = (start, end) => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

// Poliklinikalar
const clinics = [
  { institutionName: '1-sonli Shahar Poliklinikasi', institutionType: 'Поликлиника', address: 'Nukus, Pushkin ko\'chasi 12', phone: '+998 61 222-33-44' },
  { institutionName: '2-sonli Shahar Poliklinikasi', institutionType: 'Поликлиника', address: 'Nukus, Doslik ko\'chasi 45', phone: '+998 61 223-44-55' },
  { institutionName: '3-sonli Shahar Poliklinikasi', institutionType: 'Поликлиника', address: 'Nukus, Amir Temur ko\'chasi 78', phone: '+998 61 224-55-66' },
  { institutionName: 'Karakalpak Davlat Universiteti', institutionType: 'Университет', address: 'Nukus, Ch.Abdirov ko\'chasi 1', phone: '+998 61 225-66-77' },
  { institutionName: '15-sonli O\'rta maktab', institutionType: 'Школа', address: 'Nukus, Mustaqillik ko\'chasi 23', phone: '+998 61 226-77-88' },
  { institutionName: 'Bolajon bog\'chasi', institutionType: 'Десткий сад', address: 'Nukus, Gagarin ko\'chasi 34', phone: '+998 61 227-88-99' },
  { institutionName: 'Tibbiyot Kolleji', institutionType: 'Техникум / Колледж', address: 'Nukus, Lenin ko\'chasi 56', phone: '+998 61 228-99-00' },
];

// Bemorlar uchun ma'lumotlar
const generatePatients = (count, userIds) => {
  const patients = [];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    const district = districts[Math.floor(Math.random() * districts.length)];
    const neighborhood = district.neighborhoods[Math.floor(Math.random() * district.neighborhoods.length)];
    const birthDate = randomDate(new Date(1950, 0, 1), new Date(2010, 11, 31));
    const illnessDate = randomDate(new Date(now.getFullYear() - 1, 0, 1), now);

    const patient = {
      fullName: names[Math.floor(Math.random() * names.length)],
      gender: Math.random() > 0.5 ? 'erkak' : 'ayol',
      birthDate,
      phone: generatePhone(),
      district: district.name,
      neighborhood,
      registrationAddress: `Nukus, ${district.name}, ${neighborhood} MFY, ${Math.floor(Math.random() * 100) + 1}-uy`,
      workplace: Math.random() > 0.3 ? {
        name: `${['Savdo', 'Qurilish', 'Pedagogika', 'Sog\'liqni saqlash'][Math.floor(Math.random() * 4)]} korxonasi`,
        address: `Nukus, ${Math.floor(Math.random() * 100) + 1}-ko\'cha`,
        lastVisitDate: randomDate(new Date(now.getFullYear(), now.getMonth() - 1, 1), now)
      } : undefined,
      diagnosis: 'Gepatit',
      icd10Code: ['B15', 'B16', 'B17', 'B18', 'B19'][Math.floor(Math.random() * 5)],
      illnessDate,
      symptomsStartDate: new Date(illnessDate.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000),
      diagnosisDate: new Date(illnessDate.getTime() + Math.random() * 3 * 24 * 60 * 60 * 1000),
      diseaseNature: ['o\'tkir', 'surunkali', 'qayta'][Math.floor(Math.random() * 3)],
      severity: ['engil', 'o\'rta', 'og\'ir'][Math.floor(Math.random() * 3)],
      status: ['shubha', 'tasdiqlangan', 'davolanmoqda', 'tuzalgan'][Math.floor(Math.random() * 4)],
      referralSource: ['Infeksionniy', 'Ekstrenniy', 'Poliklinika'][Math.floor(Math.random() * 3)],
      referralClinic: Math.random() > 0.5 ? clinics[Math.floor(Math.random() * clinics.length)].institutionName : undefined,
      contactedDoctors: Math.random() > 0.5 ? [{
        doctorName: `Dr. ${names[Math.floor(Math.random() * names.length)]}`,
        doctorPhone: generatePhone(),
        contactDate: randomDate(illnessDate, now),
        contactType: ['konsultatsiya', 'davolash', 'tashxis'][Math.floor(Math.random() * 3)],
        hospital: 'Nukus Infeksion Kasalliklar Shifoxonasi',
        notes: 'Bemor bilan konsultatsiya o\'tkazildi'
      }] : [],
      labTests: [{
        testTypes: [['PTsR', 'Umumiy qon tahlili'][Math.floor(Math.random() * 2)]],
        materialDate: randomDate(illnessDate, now),
        resultDate: randomDate(illnessDate, now),
        result: ['ijobiy', 'salbiy', 'shubhali'][Math.floor(Math.random() * 3)],
        laboratory: 'Nukus Markaziy Laboratoriyasi',
        culture: {
          name: ['virus', 'bakteriya'][Math.floor(Math.random() * 2)],
          specificType: 'Gepatit virus',
          concentration: `${Math.floor(Math.random() * 1000000)} birlik/ml`
        },
        hepatitisNormals: {
          hpt: 35,
          alt: Math.floor(Math.random() * 100) + 20,
          ast: Math.floor(Math.random() * 80) + 15,
          bilirubin: Math.floor(Math.random() * 30) + 5
        }
      }],
      epidemiologicalAnamnesis: {
        territoryExit: Math.random() > 0.7,
        exitCountry: Math.random() > 0.7 ? ['Qozog\'iston', 'Turkmaniston', 'Rossiya'][Math.floor(Math.random() * 3)] : undefined,
        contactWithInfected: Math.random() > 0.6,
        suspiciousProducts: Math.random() > 0.5,
        productDetails: Math.random() > 0.5 ? 'Toza ichimlik suvi yo\'q' : undefined,
        riskFactors: ['Iflos suv ichgan', 'Gigiyena qoidalariga rioya qilmagan']
      },
      hospitalization: {
        isHospitalized: Math.random() > 0.4,
        hospitalName: Math.random() > 0.4 ? 'Nukus Infeksion Kasalliklar Shifoxonasi' : undefined,
        hospitalizationDate: Math.random() > 0.4 ? randomDate(illnessDate, now) : undefined,
        ward: Math.random() > 0.4 ? `${Math.floor(Math.random() * 10) + 1}-palata` : undefined
      },
      contacts: Math.random() > 0.5 ? [{
        fullName: names[Math.floor(Math.random() * names.length)],
        phone: generatePhone(),
        address: `Nukus, ${district.name}`,
        contactLevel: ['oila', 'hamkasblar', 'do\'stlar'][Math.floor(Math.random() * 3)],
        contactDate: randomDate(illnessDate, now),
        status: ['kuzatuv ostida', 'sog\'lom'][Math.floor(Math.random() * 2)]
      }] : [],
      createdBy: userIds[Math.floor(Math.random() * userIds.length)],
      coordinates: {
        lat: 42.4500 + (Math.random() - 0.5) * 0.1,
        lng: 59.6100 + (Math.random() - 0.5) * 0.1
      }
    };

    patients.push(patient);
  }

  return patients;
};

// Tekshiruvlar uchun ma'lumotlar
const generateInvestigations = (count, userIds, patientIds) => {
  const investigations = [];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    const district = districts[Math.floor(Math.random() * districts.length)];
    const startDate = randomDate(new Date(now.getFullYear() - 1, 0, 1), now);
    const statusValue = ['yangi', 'jarayonda', 'tugatilgan'][Math.floor(Math.random() * 3)];

    const investigation = {
      caseNumber: `EPI-${now.getFullYear()}-${String(i + 1).padStart(4, '0')}`,
      disease: 'Gepatit',
      startDate,
      endDate: statusValue === 'tugatilgan' ? randomDate(startDate, now) : undefined,
      status: statusValue,
      location: `${district.name}, ${district.neighborhoods[0]} MFY`,
      coordinates: {
        lat: 42.4500 + (Math.random() - 0.5) * 0.1,
        lng: 59.6100 + (Math.random() - 0.5) * 0.1
      },
      investigator: userIds[Math.floor(Math.random() * userIds.length)],
      team: [userIds[Math.floor(Math.random() * userIds.length)]],
      patients: patientIds.slice(0, Math.floor(Math.random() * 5) + 1),
      casesCount: Math.floor(Math.random() * 10) + 1,
      recommendations: [{
        text: 'Suv manbasini tekshirish va tozalash',
        date: randomDate(startDate, now),
        responsible: userIds[Math.floor(Math.random() * userIds.length)],
        status: ['yangi', 'bajarilmoqda', 'bajarildi'][Math.floor(Math.random() * 3)]
      }],
      description: 'Gepatit kasalligi epidemiologik tekshiruvi',
      findings: 'Hududda suv tarmog\'i iflos, gigiyena qoidalari buzilgan',
      conclusion: statusValue === 'tugatilgan' ? 'Zarur choralar ko\'rildi, holat nazorat ostida' : undefined,
      createdBy: userIds[Math.floor(Math.random() * userIds.length)]
    };

    investigations.push(investigation);
  }

  return investigations;
};

// Dezinfeksiyalar uchun ma'lumotlar
const generateDisinfections = (count, userIds, patientIds) => {
  const disinfections = [];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    const district = districts[Math.floor(Math.random() * districts.length)];
    const assignedDate = randomDate(new Date(now.getFullYear() - 1, 0, 1), now);
    const statusValue = ['yangi', 'tayinlangan', 'jarayonda', 'bajarildi'][Math.floor(Math.random() * 4)];

    const disinfection = {
      patient: patientIds[Math.floor(Math.random() * patientIds.length)],
      address: `Nukus, ${district.name}, ${district.neighborhoods[0]} MFY, ${Math.floor(Math.random() * 100) + 1}-uy`,
      coordinates: {
        lat: 42.4500 + (Math.random() - 0.5) * 0.1,
        lng: 59.6100 + (Math.random() - 0.5) * 0.1
      },
      status: statusValue,
      assignedDate,
      scheduledDate: randomDate(assignedDate, now),
      completedDate: statusValue === 'bajarildi' ? randomDate(assignedDate, now) : undefined,
      disinfector: userIds[Math.floor(Math.random() * userIds.length)],
      disinfectionType: ['uchqun', 'sogichli', 'profilaktik', 'yakuniy'][Math.floor(Math.random() * 4)],
      chemicals: ['Xloramin', 'Dezinfektant-1', 'Antibakterial eritma'],
      area: Math.floor(Math.random() * 200) + 50,
      notes: 'Dezinfeksiya muvaffaqiyatli amalga oshirildi',
      createdBy: userIds[Math.floor(Math.random() * userIds.length)]
    };

    disinfections.push(disinfection);
  }

  return disinfections;
};

// Hisobotlar uchun ma'lumotlar
const generateReports = (count, userIds) => {
  const reports = [];
  const now = new Date();
  const types = ['kunlik', 'haftalik', 'oylik', 'choraklik', 'yillik'];

  for (let i = 0; i < count; i++) {
    const type = types[Math.floor(Math.random() * types.length)];
    const startDate = randomDate(new Date(now.getFullYear() - 1, 0, 1), now);
    const endDate = randomDate(startDate, now);

    const report = {
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} gepatit hisoboti`,
      type,
      category: ['kasallik', 'hudud', 'umumiy'][Math.floor(Math.random() * 3)],
      startDate,
      endDate,
      format: ['pdf', 'xlsx'][Math.floor(Math.random() * 2)],
      status: 'tayyor',
      data: {
        totalCases: Math.floor(Math.random() * 100) + 20,
        activeCases: Math.floor(Math.random() * 50) + 5,
        recovered: Math.floor(Math.random() * 40) + 10,
        deaths: Math.floor(Math.random() * 5),
        newCases: Math.floor(Math.random() * 20) + 2,
        investigations: Math.floor(Math.random() * 15) + 3,
        disinfections: Math.floor(Math.random() * 30) + 5,
        districts: districts.map(d => d.name),
        diseases: ['Gepatit']
      },
      createdBy: userIds[Math.floor(Math.random() * userIds.length)]
    };

    reports.push(report);
  }

  return reports;
};

module.exports = {
  districts,
  clinics,
  generatePatients,
  generateInvestigations,
  generateDisinfections,
  generateReports,
  names,
  generatePhone
};
