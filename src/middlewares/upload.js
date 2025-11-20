const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Upload papkalarni yaratish
const uploadDirs = {
  pdfs: path.join(__dirname, '../../uploads/pdfs'),
  images: path.join(__dirname, '../../uploads/images'),
  temp: path.join(__dirname, '../../uploads/temp')
};

// Papkalarni yaratish
Object.values(uploadDirs).forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// PDF storage configuration
const pdfStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDirs.pdfs);
  },
  filename: function (req, file, cb) {
    // Unique filename yaratish
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'pdf-' + uniqueSuffix + ext);
  }
});

// Image storage configuration (Dezinfeksiya uchun)
const imageStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDirs.images);
  },
  filename: function (req, file, cb) {
    // Unique filename yaratish
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'img-' + uniqueSuffix + ext);
  }
});

// Temporary storage (web camera dan kelgan rasmlar uchun)
const tempStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDirs.temp);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'temp-' + uniqueSuffix + ext);
  }
});

// PDF file filter
const pdfFileFilter = (req, file, cb) => {
  const allowedTypes = ['application/pdf'];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Faqat PDF fayllar qabul qilinadi!'), false);
  }
};

// Image file filter
const imageFileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Faqat JPEG, PNG, WEBP rasm fayllar qabul qilinadi!'), false);
  }
};

// PDF upload middleware (Karta uchun)
const uploadPDF = multer({
  storage: pdfStorage,
  fileFilter: pdfFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max
  }
}).single('pdf');

// Multiple images upload (Dezinfeksiya uchun - limit yo'q)
const uploadImages = multer({
  storage: imageStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB per image
    // files soni limitlanmagan
  }
}).array('images'); // Array - bir nechta rasm qabul qiladi

// Before images upload (Dezinfeksiyadan oldin)
const uploadBeforeImages = multer({
  storage: imageStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024
  }
}).array('photoBefore');

// After images upload (Dezinfeksiyadan keyin)
const uploadAfterImages = multer({
  storage: imageStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024
  }
}).array('photoAfter');

// Web camera upload (temp folder ga, galeryga saqlanmaydi)
const uploadWebCamera = multer({
  storage: tempStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024
  }
}).single('cameraImage');

// Multiple web camera images
const uploadWebCameraMultiple = multer({
  storage: tempStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024
  }
}).array('cameraImages');

// Error handler middleware
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'Fayl hajmi juda katta!'
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Juda ko\'p fayl yuklanyapti!'
      });
    }
    return res.status(400).json({
      success: false,
      message: 'Fayl yuklashda xatolik: ' + err.message
    });
  } else if (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  next();
};

// Delete uploaded file (xato bo'lganda yoki bekor qilinganda)
const deleteUploadedFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('File deletion error:', error);
    return false;
  }
};

// Delete multiple files
const deleteUploadedFiles = (filePaths) => {
  const results = filePaths.map(filePath => deleteUploadedFile(filePath));
  return results.every(result => result === true);
};

// Move file from temp to permanent storage
const moveTempFile = (tempPath, permanentDir) => {
  try {
    const filename = path.basename(tempPath);
    const permanentPath = path.join(permanentDir, filename.replace('temp-', 'img-'));

    fs.renameSync(tempPath, permanentPath);
    return permanentPath;
  } catch (error) {
    console.error('File move error:', error);
    return null;
  }
};

// Clean temp folder (eski fayllarni o'chirish - 1 kun dan eski)
const cleanTempFolder = () => {
  try {
    const files = fs.readdirSync(uploadDirs.temp);
    const now = Date.now();
    const oneDayInMs = 24 * 60 * 60 * 1000;

    files.forEach(file => {
      const filePath = path.join(uploadDirs.temp, file);
      const stats = fs.statSync(filePath);
      const fileAge = now - stats.mtimeMs;

      if (fileAge > oneDayInMs) {
        fs.unlinkSync(filePath);
        console.log(`Deleted old temp file: ${file}`);
      }
    });

    return true;
  } catch (error) {
    console.error('Temp folder cleaning error:', error);
    return false;
  }
};

// Schedule temp folder cleaning (har kuni bir marta)
setInterval(cleanTempFolder, 24 * 60 * 60 * 1000);

module.exports = {
  uploadPDF,
  uploadImages,
  uploadBeforeImages,
  uploadAfterImages,
  uploadWebCamera,
  uploadWebCameraMultiple,
  handleUploadError,
  deleteUploadedFile,
  deleteUploadedFiles,
  moveTempFile,
  cleanTempFolder,
  uploadDirs
};
