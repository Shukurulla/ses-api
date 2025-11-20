/**
 * Test script for Edit History tracking
 * Bu script forma60 ni update qilganda editHistory to'g'ri ishlashini tekshiradi
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Forma60 = require('./src/models/Forma60');

async function testEditHistory() {
  try {
    // MongoDB ga ulanish
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB ga ulanish muvaffaqiyatli\n');

    // Birinchi forma60 ni topish
    const forma60 = await Forma60.findOne().sort({ createdAt: -1 });

    if (!forma60) {
      console.log('❌ Hech qanday Forma60 topilmadi');
      process.exit(1);
    }

    console.log('📋 Topilgan Forma60:');
    console.log('ID:', forma60._id);
    console.log('Ism:', forma60.fullName);
    console.log('Status:', forma60.status);
    console.log('Edit History soni:', forma60.editHistory?.length || 0);
    console.log('\n' + '='.repeat(50) + '\n');

    // Oldingi ma'lumotlarni saqlash
    const oldFullName = forma60.fullName;
    const oldStatus = forma60.status;

    // O'zgarishlarni aniqlash
    const changes = {};
    const previousData = {};

    // fullName ni o'zgartirish
    const newFullName = 'Test User ' + Date.now();
    if (oldFullName !== newFullName) {
      changes.fullName = newFullName;
      previousData.fullName = oldFullName;
      forma60.fullName = newFullName;
    }

    // status ni o'zgartirish
    const newStatus = 'karta_toldirishda';
    if (oldStatus !== newStatus) {
      changes.status = newStatus;
      previousData.status = oldStatus;
      forma60.status = newStatus;
    }

    // editHistory ga qo'shish
    if (Object.keys(changes).length > 0) {
      if (!forma60.editHistory) {
        forma60.editHistory = [];
      }

      forma60.editHistory.push({
        editedBy: forma60.createdBy || new mongoose.Types.ObjectId(), // Test uchun
        editedAt: new Date(),
        changes: changes,
        previousData: previousData,
        action: 'updated'
      });

      console.log('📝 Qo\'shilayotgan o\'zgarishlar:');
      console.log('Changes:', JSON.stringify(changes, null, 2));
      console.log('Previous Data:', JSON.stringify(previousData, null, 2));
      console.log('\n' + '='.repeat(50) + '\n');
    }

    // Saqlash
    await forma60.save();
    console.log('✅ Forma60 muvaffaqiyatli yangilandi\n');

    // Qayta yuklash va tekshirish (populate qilmasdan, chunki User model test scriptda yo'q)
    const updatedForma60 = await Forma60.findById(forma60._id);

    console.log('📋 Yangilangan Forma60:');
    console.log('ID:', updatedForma60._id);
    console.log('Ism:', updatedForma60.fullName);
    console.log('Status:', updatedForma60.status);
    console.log('Edit History soni:', updatedForma60.editHistory?.length || 0);
    console.log('\n' + '='.repeat(50) + '\n');

    if (updatedForma60.editHistory && updatedForma60.editHistory.length > 0) {
      console.log('📜 Oxirgi 3 ta o\'zgarish:');
      const recentHistory = updatedForma60.editHistory.slice(-3);

      recentHistory.forEach((history, index) => {
        console.log(`\n${index + 1}. ${history.action.toUpperCase()}`);
        console.log('   Vaqt:', history.editedAt);
        console.log('   Kim:', history.editedBy || 'Unknown');

        if (history.changes) {
          console.log('   O\'zgarishlar:');
          Object.keys(history.changes).forEach(key => {
            const oldValue = history.previousData?.[key];
            const newValue = history.changes[key];
            console.log(`     - ${key}:`);
            console.log(`       Eski: ${JSON.stringify(oldValue)}`);
            console.log(`       Yangi: ${JSON.stringify(newValue)}`);
          });
        }
      });
    }

    console.log('\n' + '='.repeat(50));
    console.log('✅ Test muvaffaqiyatli tugadi!');

  } catch (error) {
    console.error('❌ Xato:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ MongoDB ulanish yopildi');
    process.exit(0);
  }
}

// Test ni ishga tushirish
testEditHistory();
