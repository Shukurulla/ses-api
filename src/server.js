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

const app = express();

// Enable CORS - CORS ni body parser dan OLDIN qo'yish kerak!
const corsOptions = {
  origin: [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://localhost:5176",
    "http://localhost:5177",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "https://ses-beta.vercel.app",
    "https://ses-forma-60.vercel.app",
    "https://ses-karta.vercel.app",
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
