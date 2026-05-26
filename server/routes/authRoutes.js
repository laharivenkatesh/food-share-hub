import express from "express";
import rateLimit from "express-rate-limit";
import { sendOtp, verifyOtp, getMe } from "../controllers/authController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// --- Rate Limiters to Prevent OTP Abuse & Brute Force Attack ---
const sendOtpLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute window
  max: 3, // Limit each IP to 3 OTP requests per minute
  message: {
    error: "Too many OTP requests from this connection. Please wait 1 minute before requesting another verification code.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const verifyOtpLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minute window
  max: 10, // Limit each IP to 10 verification attempts per 5 minutes
  message: {
    error: "Too many failed login attempts. Please wait 5 minutes before trying again.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// --- Routes Definition ---
router.post("/send-otp", sendOtpLimiter, sendOtp);
router.post("/verify-otp", verifyOtpLimiter, verifyOtp);
router.get("/me", verifyToken, getMe);

export default router;
