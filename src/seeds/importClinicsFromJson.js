const fs = require('fs');
const path = require('path');
const Clinic = require('../models/Clinic');

const importClinicsFromJson = async () => {
  try {
    // JSON faylni o'qish
    const jsonPath = path.join(__dirname, '../../../ses_database.json');
    const jsonData = fs.readFileSync(jsonPath, 'utf8');
    const data = JSON.parse(jsonData);

    // Faqat Poliklinika tipidagi muassasalarni filtrlash
    const polyclinics = data.filter(item => item.institution_type === 'Поликлиника');

    console.log(`📊 JSON fayldan ${polyclinics.length} ta poliklinika topildi`);

    // Eski poliklinikalarni o'chirish
    const deleteResult = await Clinic.deleteMany({ institutionType: 'Поликлиника' });
    console.log(`🗑️  ${deleteResult.deletedCount} ta eski poliklinika o'chirildi`);

    // Yangi poliklinikalarni formatlash
    const clinicsToInsert = polyclinics.map(item => ({
      institutionName: item.institution_name,
      institutionType: 'Поликлиника',
      fullName: item.full_name,
      address: item.address,
      landmark: item.landmark || '',
      phone: item.phone_number || '',
      coordinates: {
        latitude: item.latitude || 0,
        longitude: item.longitude || 0
      }
    }));

    // Yangi poliklinikalarni qo'shish
    const insertedClinics = await Clinic.insertMany(clinicsToInsert);
    console.log(`✅ ${insertedClinics.length} ta poliklinika JSON fayldan import qilindi`);

    return insertedClinics;
  } catch (error) {
    console.error('❌ JSON dan import qilishda xatolik:', error.message);
    throw error;
  }
};

module.exports = importClinicsFromJson;
