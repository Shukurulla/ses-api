# SES API - Sanitariya Epidemiologiya Xizmati Backend

Bu loyiha Qoraqalpog'iston Respublika SES tizimining backend qismidir.

## O'rnatish

### 1. MongoDB o'rnatish va ishga tushirish

```bash
# Mac uchun (Homebrew orqali)
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community

# Linux uchun
sudo apt-get install -y mongodb-org
sudo systemctl start mongod

# Yoki Docker orqali
docker run -d -p 27017:27017 --name ses-mongodb mongo:latest
```

### 2. Kerakli paketlarni o'rnatish

```bash
cd ses-api
npm install
```

### 3. Environment o'zgaruvchilarni sozlash

`.env` fayli loyiha ildizida mavjud. Agar kerak bo'lsa, uni tahrirlang:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/ses-db
JWT_SECRET=ses_secret_key_2024_very_secure_key_change_in_production
JWT_EXPIRE=7d
NODE_ENV=development
```

### 4. Dastlabki ma'lumotlarni yuklash (Seeder)

```bash
# Ma'lumotlarni database ga import qilish
npm run seed -i

# Agar kerak bo'lsa, barcha ma'lumotlarni o'chirish
npm run seed -d
```

Bu buyruq quyidagi ma'lumotlarni import qiladi:
- Nukus shahridagi barcha mahallalar (`nukus_districts.json`dan)
- Barcha muassasalar (poliklinikalar, maktablar, bog'chalar) (`ses_database.json`dan)
- Test foydalanuvchilar:
  - **Admin**: username=`admin`, password=`admin123`
  - **Epidemiolog**: username=`epidemiolog`, password=`epi123`

### 5. Serverni ishga tushirish

```bash
# Development rejimida (nodemon bilan)
npm run dev

# Production rejimida
npm start
```

Server http://localhost:5000 da ishga tushadi.

## API Endpointlar

### Authentication

#### Tizimga kirish
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "...",
    "fullName": "Administrator",
    "username": "admin",
    "email": "admin@ses.uz",
    "role": "admin",
    "workplace": "SES"
  }
}
```

#### Joriy foydalanuvchi ma'lumotlarini olish
```http
GET /api/auth/me
Authorization: Bearer {token}
```

### Bemorlar

#### Barcha bemorlarni olish (pagination, filter bilan)
```http
GET /api/patients?page=1&limit=10&search=ali&status=davolanmoqda
Authorization: Bearer {token}
```

**Query parametrlar:**
- `page` - Sahifa raqami (default: 1)
- `limit` - Sahifadagi elementlar soni (default: 10)
- `search` - Qidiruv (ism, telefon, manzil)
- `diagnosis` - Tashxis bo'yicha filtr
- `status` - Status bo'yicha filtr
- `referralSource` - Kelgan joyi (Infeksionniy/Ekstrenniy/Poliklinika)
- `district` - Mahalla bo'yicha filtr
- `startDate` - Boshlanish sanasi
- `endDate` - Tugash sanasi

#### Yangi bemor qo'shish
```http
POST /api/patients
Authorization: Bearer {token}
Content-Type: application/json

{
  "fullName": "Aliyev Bobur Anvarovich",
  "gender": "erkak",
  "birthDate": "1990-05-15",
  "phone": "+998901234567",
  "district": "Алмазар",
  "neighborhood": "Алмазар",
  "registrationAddress": "Nukus, Almazar ko'chasi, 45-uy",
  "diagnosis": "Gepatit",
  "icd10Code": "B15",
  "referralSource": "Poliklinika",
  "referralClinic": "№1 Семейная поликлиника",
  "workplace": {
    "name": "IT kompaniya",
    "address": "Nukus",
    "lastVisitDate": "2024-11-15"
  },
  "contactedDoctors": [
    {
      "doctorName": "Dr. Karimov",
      "doctorPhone": "+998901111111",
      "contactDate": "2024-11-10",
      "contactType": "konsultatsiya",
      "hospital": "№1 Poliklinika"
    }
  ],
  "labTests": [
    {
      "testTypes": ["PTsR", "Biokimyoviy tahlil"],
      "materialDate": "2024-11-12",
      "result": "ijobiy",
      "laboratory": "Respublika laboratoriyasi",
      "culture": {
        "name": "virus",
        "specificType": "Gepatit A virusi"
      },
      "hepatitisNormals": {
        "hpt": 35,
        "alt": 45,
        "ast": 40
      }
    }
  ]
}
```

**Buyurtmachining barcha talablari bu API da qo'llab-quvvatlanadi:**
1. ✅ `contactedDoctors` - Aloqa bo'lgan shifokorlar
2. ✅ `testTypes` - Multi-select tahlil turlari
3. ✅ `culture.name` va `culture.specificType` - Kultura nomi va turi
4. ✅ `birthDate` dan `age` avtomatik hisoblanadi
5. ✅ `diagnosis` faqat "Gepatit" bo'ladi
6. ✅ `workplace.lastVisitDate` va `studyPlace.lastVisitDate` - Oxirgi tashrif sanalari
7. ✅ `hepatitisNormals.hpt` - 35 normali
8. ✅ `referralSource` - Qayerdan kelgani
9. ✅ Excel export `/api/clinics/polyclinics/export`
10. ✅ Mahalla va poliklinikalar JSON dan olinadi
11. ✅ Soft delete barcha modellarda

#### Bemorga aloqa bo'lgan shifokor qo'shish
```http
POST /api/patients/:id/doctors
Authorization: Bearer {token}
Content-Type: application/json

{
  "doctorName": "Dr. Karimov Jamshid",
  "doctorPhone": "+998901111111",
  "contactDate": "2024-11-15",
  "contactType": "davolash",
  "hospital": "№2 Poliklinika",
  "notes": "Kasallik boshlang'ich bosqichida"
}
```

#### Bemorga tahlil qo'shish
```http
POST /api/patients/:id/lab-tests
Authorization: Bearer {token}
Content-Type: application/json

{
  "testTypes": ["PTsR", "Serologik tahlil"],
  "materialDate": "2024-11-15",
  "resultDate": "2024-11-16",
  "result": "ijobiy",
  "laboratory": "Respublika laboratoriyasi",
  "culture": {
    "name": "bakteriya",
    "specificType": "E. coli",
    "concentration": "10^5 CFU/ml"
  },
  "hepatitisNormals": {
    "hpt": 35,
    "alt": 50,
    "ast": 45,
    "bilirubin": 15
  }
}
```

#### Statistika
```http
GET /api/patients/stats
Authorization: Bearer {token}
```

### Mahallalar (Districts)

#### Barcha mahallalarni olish
```http
GET /api/districts
```

**Response:**
```json
{
  "success": true,
  "count": 68,
  "data": [
    {
      "_id": "...",
      "name": "Шыгыс",
      "region": "Нукус шаҳар"
    },
    ...
  ]
}
```

### Klinikalar

#### Barcha klinikalarni olish
```http
GET /api/clinics
```

#### Faqat poliklinikalarni olish
```http
GET /api/clinics/polyclinics
```

#### Poliklinikalar statistikasi
```http
GET /api/clinics/polyclinics/stats
Authorization: Bearer {token}
```

#### Poliklinikalar statistikasini Excel formatda yuklab olish
```http
GET /api/clinics/polyclinics/export
Authorization: Bearer {token}
```

Bu endpoint Excel fayl qaytaradi. Faylda:
- Поликлиника номи
- Манзил
- Телефон
- Беморлар сони
- Охирги янгиланиш

## Rollar va ruxsatlar

- **admin** - Barcha amallarni bajarish huquqi
- **epidemiolog** - Bemorlar va tergov ishlarini boshqarish
- **shifokor** - Bemorlarni ko'rish va qo'shish
- **laborant** - Tahlillarni qo'shish va ko'rish
- **statistik** - Faqat statistikalarni ko'rish

## Soft Delete

Barcha modellar soft delete ni qo'llab-quvvatlaydi. O'chirilgan ma'lumotlar aslida database dan o'chirilmaydi, balki `isDeleted: true` ga o'zgartiriladi.

```javascript
// Soft delete
await patient.softDelete(userId);

// Tiklash (faqat admin)
await patient.restore();

// To'liq o'chirish (faqat admin)
await patient.forceDelete();
```

## Frontend integratsiya

Frontend loyihada (ses-web) API bilan ishlash uchun:

1. Axios o'rnating:
```bash
cd ses-web
npm install axios
```

2. API konfiguratsiyasi yarating (`src/config/api.js`):
```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Token qo'shish
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
```

3. Ishlatish:
```javascript
import api from './config/api';

// Login
const login = async (username, password) => {
  const response = await api.post('/auth/login', { username, password });
  localStorage.setItem('token', response.data.token);
  return response.data;
};

// Bemorlarni olish
const getPatients = async () => {
  const response = await api.get('/patients');
  return response.data;
};
```

## Test qilish

### Health check
```bash
curl http://localhost:5000/health
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

## Loyiha tuzilishi

```
ses-api/
├── src/
│   ├── config/
│   │   └── database.js         # MongoDB konfiguratsiyasi
│   ├── controllers/
│   │   ├── authController.js   # Authentication
│   │   ├── patientController.js # Bemorlar
│   │   ├── districtController.js # Mahallalar
│   │   └── clinicController.js  # Klinikalar
│   ├── middlewares/
│   │   ├── auth.js             # JWT tekshirish
│   │   └── errorHandler.js     # Xatolarni boshqarish
│   ├── models/
│   │   ├── User.js             # Foydalanuvchi modeli
│   │   ├── Patient.js          # Bemor modeli
│   │   ├── District.js         # Mahalla modeli
│   │   ├── Clinic.js           # Klinika modeli
│   │   ├── Disinfection.js     # Dezinfeksiya modeli
│   │   └── Investigation.js    # Tergov modeli
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── patientRoutes.js
│   │   ├── districtRoutes.js
│   │   └── clinicRoutes.js
│   ├── utils/
│   │   └── seeder.js           # Ma'lumotlarni import qilish
│   └── server.js               # Asosiy server fayli
├── .env
├── .gitignore
├── package.json
└── README.md
```

## Muammolarni hal qilish

### MongoDB ulanmasa

1. MongoDB ishlab turganini tekshiring:
```bash
# Mac
brew services list | grep mongodb

# Linux
sudo systemctl status mongod

# Docker
docker ps | grep mongo
```

2. MongoDB ni ishga tushiring:
```bash
# Mac
brew services start mongodb-community

# Linux
sudo systemctl start mongod

# Docker
docker start ses-mongodb
```

### Port band bo'lsa

`.env` faylda PORT ni o'zgartiring yoki:

```bash
PORT=3000 npm run dev
```

## Keyingi qadamlar

1. ✅ Backend yaratildi va barcha talablar qo'llandi
2. ⏳ Frontend integratsiya - API ni frontendga ulash
3. ⏳ Disinfection va Investigation modulelarini to'liq qilish
4. ⏳ File upload (rasm, PDF)
5. ⏳ WebSocket (real-time yangilanishlar)
6. ⏳ Production deploy

## Yordam

Muammo yuzaga kelsa:
- [GitHub Issues](https://github.com/yourrepo/issues)
- Email: support@ses.uz
