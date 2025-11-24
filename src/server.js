const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/database");
const errorHandler = require("./middlewares/errorHandler");

// Load env vars
dotenv.config();

// Connect to database
connectDB();

// Route files
const authRoutes = require("./routes/auth.routes");
const forma60Routes = require("./routes/forma60.routes");
const kartaRoutes = require("./routes/karta.routes");
const dezinfeksiyaRoutes = require("./routes/dezinfeksiya.routes");
const districtRoutes = require("./routes/district.routes");
const nukusLocationRoutes = require("./routes/nukusLocation.routes");
const contactRoutes = require("./routes/contact.routes");
const foodInspectionRoutes = require("./routes/foodInspection.routes");
const reportRoutes = require("./routes/report.routes");
const mapRoutes = require("./routes/map.routes");
const statsRoutes = require("./routes/stats.routes");
// const parsedDataRoutes = require("./routes/parsedData.routes"); // ARXIVLANDI - PDF parsing olib tashlandi

const app = express();

// Enable CORS - CORS ni body parser dan OLDIN qo'yish kerak!
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://localhost:5176",
  "http://localhost:5177",
  "http://localhost:5178",
  "http://localhost:5179",
  "http://localhost:5180",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "https://ses-dezinfektor.vercel.app",
  "https://ses-beta.vercel.app",
  "https://ses-forma-60.vercel.app",
  "https://ses-karta.vercel.app",
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, postman)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log("CORS blocked origin:", origin);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  exposedHeaders: ["Content-Type", "Authorization"],
  preflightContinue: false,
  optionsSuccessStatus: 204,
  maxAge: 86400, // 24 hours
};

app.use(cors(corsOptions));

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mount routers
app.use("/api/auth", authRoutes);
app.use("/api/forma60", forma60Routes);
app.use("/api/karta", kartaRoutes);
app.use("/api/dezinfeksiya", dezinfeksiyaRoutes);
app.use("/api/districts", districtRoutes);
app.use("/api/locations", nukusLocationRoutes);
app.use("/api/contacts", contactRoutes);
app.use("/api/food-inspection", foodInspectionRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/map", mapRoutes);
app.use("/api/stats", statsRoutes);
// app.use("/api/parsed-data", parsedDataRoutes); // ARXIVLANDI - PDF parsing olib tashlandi

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server ishlayapti",
    timestamp: new Date().toISOString(),
  });
});
app.get("/", async (req, res) => {
  try {
    const countKarta = await require("./models/Karta").countDocuments();
    const countForma60 = await require("./models/Forma60").countDocuments();
    res.status(200).json({
      success: true,
      message: "SES API server ishlayapti",
      kartaRecords: countKarta,
      forma60Records: countForma60,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Serverda xatolik yuz berdi",
      error: error.message,
    });
  }
});

// Error handler
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route topilmadi",
  });
});

const PORT = process.env.PORT || 5001;

const server = app.listen(PORT, () => {
  console.log(
    `Server ${process.env.NODE_ENV} rejimida ${PORT} portda ishlamoqda`
  );
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err, promise) => {
  console.log(`Xatolik: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});

module.exports = app;
