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
const authRoutes = require("./routes/authRoutes");
const patientRoutes = require("./routes/patientRoutes");
const districtRoutes = require("./routes/districtRoutes");
const clinicRoutes = require("./routes/clinicRoutes");
const investigationRoutes = require("./routes/investigationRoutes");
const disinfectionRoutes = require("./routes/disinfectionRoutes");
const reportRoutes = require("./routes/reportRoutes");

const app = express();

// Enable CORS - CORS ni body parser dan OLDIN qo'yish kerak!
const corsOptions = {
  origin: [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  exposedHeaders: ["Content-Type", "Authorization"],
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mount routers
app.use("/api/auth", authRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/districts", districtRoutes);
app.use("/api/clinics", clinicRoutes);
app.use("/api/investigations", investigationRoutes);
app.use("/api/disinfections", disinfectionRoutes);
app.use("/api/reports", reportRoutes);

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server ishlayapti",
    timestamp: new Date().toISOString(),
  });
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
