const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ses-db', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB ga ulanish muvaffaqiyatli!');
  } catch (error) {
    console.error('MongoDB ga ulanishda xatolik:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
