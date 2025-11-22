const mongoose = require('mongoose');
const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const NukusLocation = require('../src/models/NukusLocation');

// Nukus koordinatalari (taxminan)
const NUKUS_BBOX = {
  minLat: 42.43,  // Janubiy chegara
  maxLat: 42.52,  // Shimoliy chegara
  minLon: 59.55,  // G'arbiy chegara
  maxLon: 59.70   // Sharqiy chegara
};

// OSM tag'laridan bizning type'ga mapping
const TYPE_MAPPING = {
  // Tibbiyot
  'amenity=hospital': 'hospital',
  'amenity=clinic': 'clinic',
  'amenity=doctors': 'clinic',
  'amenity=pharmacy': 'pharmacy',

  // Ta'lim
  'amenity=school': 'school',
  'amenity=university': 'university',
  'amenity=college': 'university',

  // Xizmatlar
  'amenity=bank': 'bank',
  'amenity=post_office': 'post_office',
  'amenity=police': 'police',
  'amenity=fire_station': 'fire_station',
  'amenity=townhall': 'government',
  'office=government': 'government',

  // Savdo
  'shop': 'shop',
  'amenity=marketplace': 'market',

  // Ovqatlanish
  'amenity=restaurant': 'restaurant',
  'amenity=cafe': 'cafe',

  // Dam olish
  'leisure=park': 'park',
  'leisure=stadium': 'stadium',
  'amenity=library': 'library',
  'tourism=museum': 'museum',
  'amenity=place_of_worship': 'mosque',

  // Turar joy va binolar
  'building': 'building',
  'tourism=hotel': 'hotel',

  // Office
  'office': 'office'
};

async function importLocations() {
  try {
    console.log('MongoDB ga ulanish...');
    await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 60000,
      socketTimeoutMS: 60000,
      connectTimeoutMS: 60000
    });
    console.log('MongoDB ga ulanish muvaffaqiyatli!');

    // Eski ma'lumotlarni o'chirish
    console.log('Eski ma\'lumotlarni o\'chirish...');
    await NukusLocation.deleteMany({});
    console.log('Eski ma\'lumotlar o\'chirildi');

    // Overpass API orqali Nukus ma'lumotlarini olish
    const overpassUrl = 'https://overpass-api.de/api/interpreter';

    // Overpass Query Language (OQL)
    const query = `
      [out:json][timeout:180];
      (
        // Barcha amenity'lar (xizmatlar)
        node["amenity"](${NUKUS_BBOX.minLat},${NUKUS_BBOX.minLon},${NUKUS_BBOX.maxLat},${NUKUS_BBOX.maxLon});
        way["amenity"](${NUKUS_BBOX.minLat},${NUKUS_BBOX.minLon},${NUKUS_BBOX.maxLat},${NUKUS_BBOX.maxLon});

        // Barcha do'konlar
        node["shop"](${NUKUS_BBOX.minLat},${NUKUS_BBOX.minLon},${NUKUS_BBOX.maxLat},${NUKUS_BBOX.maxLon});
        way["shop"](${NUKUS_BBOX.minLat},${NUKUS_BBOX.minLon},${NUKUS_BBOX.maxLat},${NUKUS_BBOX.maxLon});

        // Barcha ofislar
        node["office"](${NUKUS_BBOX.minLat},${NUKUS_BBOX.minLon},${NUKUS_BBOX.maxLat},${NUKUS_BBOX.maxLon});
        way["office"](${NUKUS_BBOX.minLat},${NUKUS_BBOX.minLon},${NUKUS_BBOX.maxLat},${NUKUS_BBOX.maxLon});

        // Dam olish joylari
        node["leisure"](${NUKUS_BBOX.minLat},${NUKUS_BBOX.minLon},${NUKUS_BBOX.maxLat},${NUKUS_BBOX.maxLon});
        way["leisure"](${NUKUS_BBOX.minLat},${NUKUS_BBOX.minLon},${NUKUS_BBOX.maxLat},${NUKUS_BBOX.maxLon});

        // Turizm
        node["tourism"](${NUKUS_BBOX.minLat},${NUKUS_BBOX.minLon},${NUKUS_BBOX.maxLat},${NUKUS_BBOX.maxLon});
        way["tourism"](${NUKUS_BBOX.minLat},${NUKUS_BBOX.minLon},${NUKUS_BBOX.maxLat},${NUKUS_BBOX.maxLon});

        // Binolar (nom bilan)
        node["building"]["name"](${NUKUS_BBOX.minLat},${NUKUS_BBOX.minLon},${NUKUS_BBOX.maxLat},${NUKUS_BBOX.maxLon});
        way["building"]["name"](${NUKUS_BBOX.minLat},${NUKUS_BBOX.minLon},${NUKUS_BBOX.maxLat},${NUKUS_BBOX.maxLon});
      );
      out center;
    `;

    console.log('OpenStreetMap\'dan ma\'lumotlarni yuklab olish...');
    console.log('Bu jarayon bir necha daqiqa davom etishi mumkin...');

    const response = await axios.post(overpassUrl, `data=${encodeURIComponent(query)}`, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 180000 // 3 daqiqa
    });

    const elements = response.data.elements;
    console.log(`Jami ${elements.length} ta element topildi`);

    let savedCount = 0;
    let skippedCount = 0;
    const BATCH_SIZE = 100; // Bir vaqtda 100 tadan saqlash
    let batch = [];

    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];
      const tags = element.tags || {};

      // Nom yo'q bo'lsa o'tkazib yuborish
      if (!tags.name && !tags['name:uz'] && !tags['name:ru']) {
        skippedCount++;
        continue;
      }

      // Koordinatalarni olish
      let lat, lon;
      if (element.type === 'node') {
        lat = element.lat;
        lon = element.lon;
      } else if (element.center) {
        lat = element.center.lat;
        lon = element.center.lon;
      } else {
        skippedCount++;
        continue;
      }

      // Type'ni aniqlash
      let type = 'other';
      for (const [key, value] of Object.entries(TYPE_MAPPING)) {
        if (key.includes('=')) {
          const [tagKey, tagValue] = key.split('=');
          if (tags[tagKey] === tagValue) {
            type = value;
            break;
          }
        } else {
          if (tags[key]) {
            type = value;
            break;
          }
        }
      }

      // Manzilni tuzish
      const address = {
        street: tags['addr:street'] || tags.street,
        houseNumber: tags['addr:housenumber'],
        district: tags['addr:district'],
        city: tags['addr:city'] || 'Nukus',
        region: tags['addr:region'] || 'Qoraqalpog\'iston',
        country: tags['addr:country'] || 'Uzbekistan',
        postcode: tags['addr:postcode'],
        fullAddress: null
      };

      // To'liq manzilni yaratish
      const addressParts = [
        address.street,
        address.houseNumber,
        address.district,
        'Nukus',
        'Qoraqalpog\'iston'
      ].filter(Boolean);
      address.fullAddress = addressParts.join(', ');

      // Batch'ga qo'shish
      batch.push({
        osmId: `${element.type}/${element.id}`,
        name: tags.name || tags['name:uz'] || tags['name:ru'] || 'No name',
        nameUz: tags['name:uz'] || tags.name,
        nameRu: tags['name:ru'] || tags.name,
        type,
        address,
        location: {
          type: 'Point',
          coordinates: [lon, lat]
        },
        tags
      });

      // Batch to'lsa yoki oxirgi element bo'lsa saqlash
      if (batch.length >= BATCH_SIZE || i === elements.length - 1) {
        try {
          // insertMany ordered:false - duplicate key error bo'lsa ham davom etadi
          const result = await NukusLocation.insertMany(batch, {
            ordered: false,
            rawResult: true
          });
          savedCount += result.insertedCount || batch.length;

          console.log(`${savedCount} ta location saqlandi...`);
        } catch (error) {
          // Bulk write error - qaysi biri duplicate ekanini aniqlash
          if (error.code === 11000 || error.name === 'MongoBulkWriteError') {
            const inserted = error.result?.nInserted || 0;
            savedCount += inserted;
            skippedCount += batch.length - inserted;
            console.log(`Batch saqlandi: ${inserted} ta saqlandi, ${batch.length - inserted} ta duplicate`);
          } else {
            console.error(`Batch xatolik: ${error.message}`);
            skippedCount += batch.length;
          }
        }

        // Batch'ni tozalash
        batch = [];

        // MongoDB'ga nafas berish uchun kichik pauza
        if (savedCount % 500 === 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    }

    console.log('\n=== Import yakunlandi ===');
    console.log(`Jami saqlandi: ${savedCount}`);
    console.log(`O'tkazildi: ${skippedCount}`);
    console.log(`========================\n`);

    // Statistika
    const stats = await NukusLocation.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    console.log('Type bo\'yicha statistika:');
    stats.forEach(stat => {
      console.log(`  ${stat._id}: ${stat.count}`);
    });

  } catch (error) {
    console.error('Xatolik yuz berdi:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  } finally {
    try {
      await mongoose.disconnect();
      console.log('MongoDB bilan aloqa uzildi');
    } catch (disconnectError) {
      console.error('Disconnect xatolik:', disconnectError.message);
    }
    process.exit(0);
  }
}

// Scriptni ishga tushirish
importLocations();
