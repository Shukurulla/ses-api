const Report = require('../models/Report');

const reportsData = (userId) => [
  {
    name: 'Noyabr oyi hisoboti - Gepatit',
    type: 'oylik',
    category: 'kasallik',
    startDate: new Date('2024-11-01'),
    endDate: new Date('2024-11-30'),
    format: 'pdf',
    status: 'tayyor',
    data: {
      totalCases: 4,
      activeCases: 3,
      recovered: 1,
      deaths: 0,
      newCases: 4,
      investigations: 1,
      disinfections: 2,
      districts: ['Chilonzor', 'Mirobod', 'Uchtepa'],
      diseases: ['Gepatit']
    },
    createdBy: userId
  },
  {
    name: 'Noyabr oyi hisoboti - COVID-19',
    type: 'oylik',
    category: 'kasallik',
    startDate: new Date('2024-11-01'),
    endDate: new Date('2024-11-30'),
    format: 'xlsx',
    status: 'tayyor',
    data: {
      totalCases: 5,
      activeCases: 5,
      recovered: 0,
      deaths: 0,
      newCases: 5,
      investigations: 2,
      disinfections: 2,
      districts: ['Chilonzor', 'Yakkasaroy', 'Yunusobod', 'Shayxontohur'],
      diseases: ['COVID-19']
    },
    createdBy: userId
  },
  {
    name: 'Oktyabr-Noyabr - Qizilcha',
    type: 'choraklik',
    category: 'kasallik',
    startDate: new Date('2024-10-01'),
    endDate: new Date('2024-11-30'),
    format: 'pdf',
    status: 'tayyor',
    data: {
      totalCases: 3,
      activeCases: 0,
      recovered: 3,
      deaths: 0,
      newCases: 3,
      investigations: 1,
      disinfections: 2,
      districts: ['Sergeli'],
      diseases: ['Qizilcha']
    },
    createdBy: userId
  },
  {
    name: 'Chilonzor tumani - Noyabr oyi',
    type: 'oylik',
    category: 'hudud',
    startDate: new Date('2024-11-01'),
    endDate: new Date('2024-11-30'),
    format: 'xlsx',
    status: 'tayyor',
    data: {
      totalCases: 6,
      activeCases: 4,
      recovered: 2,
      deaths: 0,
      newCases: 6,
      investigations: 1,
      disinfections: 2,
      districts: ['Chilonzor'],
      diseases: ['Gepatit', 'COVID-19']
    },
    createdBy: userId
  },
  {
    name: 'Haftalik hisobot - 46-hafta',
    type: 'haftalik',
    category: 'umumiy',
    startDate: new Date('2024-11-11'),
    endDate: new Date('2024-11-17'),
    format: 'pdf',
    status: 'tayyor',
    data: {
      totalCases: 8,
      activeCases: 6,
      recovered: 2,
      deaths: 0,
      newCases: 8,
      investigations: 2,
      disinfections: 4,
      districts: ['Chilonzor', 'Yunusobod', 'Mirobod', 'Yakkasaroy', 'Shayxontohur'],
      diseases: ['COVID-19', 'Gepatit', 'Gripp', 'Tuberkulyoz']
    },
    createdBy: userId
  },
  {
    name: 'Tuberkulyoz - Yillik hisobot 2024',
    type: 'yillik',
    category: 'kasallik',
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-12-31'),
    format: 'docx',
    status: 'tayyor',
    data: {
      totalCases: 2,
      activeCases: 2,
      recovered: 0,
      deaths: 0,
      newCases: 2,
      investigations: 1,
      disinfections: 1,
      districts: ['Shayxontohur', 'Yakkasaroy'],
      diseases: ['Tuberkulyoz']
    },
    createdBy: userId
  },
  {
    name: 'Yunusobod tumani - Choraklik hisobot',
    type: 'choraklik',
    category: 'hudud',
    startDate: new Date('2024-10-01'),
    endDate: new Date('2024-12-31'),
    format: 'xlsx',
    status: 'tayyor',
    data: {
      totalCases: 4,
      activeCases: 3,
      recovered: 1,
      deaths: 0,
      newCases: 4,
      investigations: 1,
      disinfections: 1,
      districts: ['Yunusobod'],
      diseases: ['Gripp', 'COVID-19']
    },
    createdBy: userId
  },
  {
    name: 'Maxsus hisobot - Maktab va bog\'chalar',
    type: 'maxsus',
    category: 'maxsus',
    startDate: new Date('2024-10-01'),
    endDate: new Date('2024-11-30'),
    format: 'pdf',
    status: 'tayyor',
    data: {
      totalCases: 5,
      activeCases: 2,
      recovered: 3,
      deaths: 0,
      newCases: 5,
      investigations: 1,
      disinfections: 2,
      districts: ['Sergeli', 'Bektemir'],
      diseases: ['Qizilcha', 'Gripp']
    },
    createdBy: userId
  }
];

const seedReports = async (userId) => {
  try {
    await Report.deleteMany({});
    const reports = await Report.insertMany(reportsData(userId));
    console.log(`✅ ${reports.length} ta hisobot yaratildi`);
    return reports;
  } catch (error) {
    console.error('❌ Hisobotlarni yaratishda xatolik:', error.message);
    throw error;
  }
};

module.exports = seedReports;
