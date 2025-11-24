/**
 * PDF dan parse qilingan ma'lumotlarni Forma60 ga mapping qilish
 */

/**
 * Type1 (Yuqumli va Parazitar Kasalliklar) PDF dan Forma60 ga ma'lumot qo'shish
 * @param {Object} forma60 - Forma60 instance
 * @param {Object} type1Data - PDF dan parse qilingan ma'lumotlar
 * @returns {Object} - Yangilangan Forma60
 */
exports.mapType1DataToForma60 = async function(forma60, type1Data) {
  // 1. Kontaktlarni qo'shish
  if (type1Data.contacts && type1Data.contacts.length > 0) {
    forma60.contactsStatus = type1Data.contacts.map(contact => ({
      name: contact.fullName,
      age: contact.age,
      address: contact.address,
      workCharacter: contact.workCharacter,
      workLocation: contact.workLocation,
      diseaseStatus: 'pending' // Vrach yordamchisi keyinchalik belgilaydi
    }));
  }

  // 2. Yuqish omilini qo'shish
  if (type1Data.conclusion && type1Data.conclusion.mainFactorName) {
    // Main factor name dan transmissionFactor ga mapping
    const factorMapping = {
      'Vodoprovod suvi': 'Suv',
      'Quduq suvi': 'Suv',
      'Ochiq suv ombori': 'Suv',
      'Kanalizatsiya suvi': 'Suv',
      'Har xil ichimlik suvlari, soklar': 'Suv',
      'Sut': 'Sut mahsulotlari',
      'Qaymoq, smetana': 'Sut mahsulotlari',
      'Tvorog mahsulotlari': 'Sut mahsulotlari',
      'Boshqa sut mahsulotlari': 'Sut mahsulotlari',
      'Go\'sht mahsulotlari': 'Gosht mahsulotlari',
      'Baliq mahsulotlari': 'Baliq',
      'Salatlar': 'Salat',
      'Tayyor issiq ovqatlar': 'Oziq-ovqat',
      'Boshqa yarim mahsulotlar': 'Oziq-ovqat',
      'Meva va sabzavotlar': 'Meva va sabzavot',
      'Kontakt yo\'li bilan yuqtirish': 'Kontakt yoli',
      'Havo-tomchi yo\'li bilan': 'Havo-tomchi yoli',
      'Qon, zardob, plazma': 'Qon, zardoba, plazma',
      'Hayvon xomashyosi': 'Hayvon xomashyosi',
      'Hayvon o\'tkazuvchilari': 'Hayvon otkazuvchi',
      'Boshqa yuqtirish faktorlari': 'Boshqa'
    };

    forma60.transmissionFactor = factorMapping[type1Data.conclusion.mainFactorName] || 'Boshqa';
  }

  // 3. Yuqish joyini qo'shish
  if (type1Data.conclusion && type1Data.conclusion.infectionPlace) {
    const placeMapping = {
      'Turar joyida': 'Turar joyida',
      'Ish joyida': 'Ish joyida',
      'Uyda': 'Turar joyida'
    };

    const place = type1Data.conclusion.infectionPlace;
    forma60.infectionSource = placeMapping[place] || 'Boshqa';
  }

  // 4. Epidemiolog ma'lumotlarini yangilash
  if (type1Data.epidemiologist) {
    if (!forma60.epidemiologist) {
      forma60.epidemiologist = {};
    }
    forma60.epidemiologist.name = type1Data.epidemiologist;
  }

  // 5. O'choq ma'lumotlarini qo'shish
  if (type1Data.conclusion) {
    if (!forma60.outbreak) {
      forma60.outbreak = {};
    }

    // O'choq joyi
    if (type1Data.conclusion.outbreakCases) {
      if (type1Data.conclusion.outbreakCases.home === 'birlamchi') {
        forma60.outbreak.locationType = 'uyda';
      } else if (type1Data.conclusion.outbreakCases.workStudyPlace === 'birlamchi') {
        forma60.outbreak.locationType = 'ish joyida';
      }
    }
  }

  return forma60;
};

/**
 * Type2 (Sil kasalligi) PDF dan Forma60 ga ma'lumot qo'shish
 * @param {Object} forma60 - Forma60 instance
 * @param {Object} type2Data - PDF dan parse qilingan ma'lumotlar
 * @returns {Object} - Yangilangan Forma60
 */
exports.mapType2DataToForma60 = async function(forma60, type2Data) {
  // 1. Kontaktlarni qo'shish
  if (type2Data.contactMonitoring && type2Data.contactMonitoring.length > 0) {
    forma60.contactsStatus = type2Data.contactMonitoring.map(contact => ({
      name: contact.fullName,
      age: contact.birthDate ? calculateAge(contact.birthDate) : null,
      address: null,
      workCharacter: contact.relationship,
      workLocation: contact.workplace,
      diseaseStatus: contact.status === 'Sog\'lom' ? 'no_disease' : 'pending'
    }));
  }

  // 2. Epidemiolog ma'lumotlarini yangilash
  if (type2Data.epidemiologist) {
    if (!forma60.epidemiologist) {
      forma60.epidemiologist = {};
    }
    forma60.epidemiologist.name = type2Data.epidemiologist;
  }

  return forma60;
};

/**
 * Type3 (Qisqacha forma) PDF dan Forma60 ga ma'lumot qo'shish
 * @param {Object} forma60 - Forma60 instance
 * @param {Object} type3Data - PDF dan parse qilingan ma'lumotlar
 * @returns {Object} - Yangilangan Forma60
 */
exports.mapType3DataToForma60 = async function(forma60, type3Data) {
  // Type3 Type1 bilan deyarli bir xil
  return this.mapType1DataToForma60(forma60, {
    ...type3Data,
    conclusion: type3Data.conclusion,
    epidemiologist: type3Data.epidemiologist
  });
};

/**
 * Helper: Yoshni hisoblash
 */
function calculateAge(birthDate) {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age;
}
