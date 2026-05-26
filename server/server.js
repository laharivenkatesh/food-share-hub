import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import authRoutes from "./routes/authRoutes.js";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS and JSON body parser
app.use(cors({
  origin: true, // Allow client origin mapping
  credentials: true
}));
app.use(express.json());

// --- Database Connection (MongoDB) ---
const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/otp-auth";

console.log("Connecting to MongoDB...");
mongoose
  .connect(MONGO_URI, {
    serverSelectionTimeoutMS: 2000, // Timeout after 2s so server boots instantly if offline
  })
  .then(() => {
    console.log(`[DATABASE] Connected to MongoDB database successfully: ${MONGO_URI}`);
  })
  .catch((err) => {
    console.warn("\n=========================================================================");
    console.warn("[DATABASE WARNING] Could not connect to MongoDB database.");
    console.warn("Reason:", err.message);
    console.warn("SOLUTION: Ensure a local MongoDB server instance is active.");
    console.warn("[FALLBACK ACTIVE] Booting Express server in OFFLINE SANDBOX MODE.");
    console.warn("All session user and OTP states will compile and be stored in local memory.");
    console.warn("=========================================================================\n");
  });

// --- Mount Routes ---
app.use("/api/auth", authRoutes);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    mongodb: mongoose.connection.readyState === 1 ? "connected" : "disconnected (sandbox active)",
    twilio: Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) ? "configured" : "sandbox active"
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Global express error handler:", err.message);
  res.status(500).json({ error: "Internal server error. Something broke on the backend." });
});

// Launch server listener
app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 Zerra OTP Auth Express Server Active on Port ${PORT}`);
  console.log(`📡 Base API Endpoint: http://localhost:${PORT}/api/auth`);
  console.log(`======================================================\n`);
});
