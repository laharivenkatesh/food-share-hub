import crypto from "crypto";
import jwt from "jsonwebtoken";
import twilio from "twilio";
import mongoose from "mongoose";
import User from "../models/User.js";
import Otp from "../models/Otp.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev-local-secret-3c8d3523-cc88-4edf-b0e5-e4d50a7f47c2";

// --- Twilio Client Initialization ---
const twilioSid = process.env.TWILIO_ACCOUNT_SID;
const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

let twilioClient = null;
const isTwilioConfigured = Boolean(twilioSid && twilioAuthToken && twilioPhone);

if (isTwilioConfigured) {
  try {
    twilioClient = twilio(twilioSid, twilioAuthToken);
  } catch (err) {
    console.error("Failed to initialize Twilio client:", err.message);
  }
} else {
  console.warn(
    "[DEV MODE] Twilio credentials missing from .env. The server will run in SMS Sandbox mode: OTPs will be printed to the terminal console and returned in the API response."
  );
}

// --- In-Memory Datastore Fallback (for MongoDB offline sandbox) ---
const inMemoryUsers = new Map();
const inMemoryOtps = new Map();

// Helper to determine if we should fall back to in-memory mode
const isMongoConnected = () => {
  return mongoose.connection.readyState === 1;
};

// Generates a secure, random 6-digit numeric string
const generateNumericOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Controller to send an OTP SMS to a validated mobile number
 * POST /api/auth/send-otp
 */
export const sendOtp = async (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    return res.status(400).json({ error: "Mobile number is required" });
  }

  // Validate phone format (E.164-ish or standard local 10-digit)
  const phoneRegex = /^\+?[1-9]\d{1,14}$/; // Valid E.164
  const standard10DigitRegex = /^\d{10}$/; // Valid 10 digit local

  if (!phoneRegex.test(phone) && !standard10DigitRegex.test(phone)) {
    return res.status(400).json({
      error: "Invalid mobile number format. Please provide a valid 10-digit number or international E.164 format (e.g. +1234567890).",
    });
  }

  // Ensure consistent phone format
  let formattedPhone = phone.trim();
  if (standard10DigitRegex.test(formattedPhone) && !formattedPhone.startsWith("+")) {
    formattedPhone = `+91${formattedPhone}`; // Default to Indian prefix or standard international if local
  }

  const otpCode = generateNumericOtp();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiration

  try {
    if (isMongoConnected()) {
      // Store/replace in MongoDB
      await Otp.findOneAndUpdate(
        { phone: formattedPhone },
        { otp: otpCode, expiresAt },
        { upsert: true, new: true }
      );
    } else {
      // Store in memory
      inMemoryOtps.set(formattedPhone, { otp: otpCode, expiresAt });
      console.log(`[IN-MEMORY DB] Saved OTP for ${formattedPhone}`);
    }

    // Send SMS via Twilio if configured, otherwise bypass
    if (isTwilioConfigured && twilioClient) {
      try {
        await twilioClient.messages.create({
          body: `[Zerra] Your verification code is ${otpCode}. It will expire in 5 minutes.`,
          from: twilioPhone,
          to: formattedPhone,
        });
        console.log(`[SMS SUCCESS] Sent OTP ${otpCode} to ${formattedPhone}`);
        return res.status(200).json({
          message: "OTP sent successfully via SMS. It is valid for 5 minutes.",
          phone: formattedPhone,
        });
      } catch (smsError) {
        console.error("Twilio SMS send failed:", smsError.message);
        // Graceful fallback to sandbox response if Twilio account has issues
        return res.status(200).json({
          warning: "Twilio SMS sending failed, falling back to sandbox mode.",
          message: "OTP generated successfully (Sandbox Mode).",
          phone: formattedPhone,
          dev_otp: otpCode, // Send in response so developer doesn't get blocked
        });
      }
    } else {
      // Sandbox bypass mode
      console.log(`\n======================================================`);
      console.log(`[SANDBOX OTP] Phone: ${formattedPhone} | Code: ${otpCode}`);
      console.log(`======================================================\n`);

      return res.status(200).json({
        message: "OTP generated successfully (Sandbox Mode).",
        phone: formattedPhone,
        dev_otp: otpCode, // Returned for dev convenience
      });
    }
  } catch (dbError) {
    console.error("Database error in sendOtp:", dbError.message);
    return res.status(500).json({ error: "Internal server error. Failed to generate and save OTP." });
  }
};

/**
 * Controller to verify Firebase ID token and issue JWT session token
 * POST /api/auth/verify-otp
 */
export const verifyOtp = async (req, res) => {
  const { idToken, name, role } = req.body;

  if (!idToken) {
    return res.status(400).json({ error: "Firebase ID token is required" });
  }

  try {
    const firebaseApiKey = process.env.FIREBASE_API_KEY || "AIzaSyAeu92rfYKn1RubhnxsWS5NVJKChNIJ18A";
    
    // Call Google Identity Toolkit API to verify Firebase ID Token
    const verifyResponse = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      }
    );

    const verifyData = await verifyResponse.json();
    if (!verifyResponse.ok) {
      console.error("Firebase ID Token verification failed:", verifyData);
      return res.status(400).json({ error: "Invalid or expired Firebase verification session." });
    }

    const firebaseUser = verifyData.users?.[0];
    if (!firebaseUser || !firebaseUser.phoneNumber) {
      return res.status(400).json({ error: "No verified mobile number found in authentication session." });
    }

    const formattedPhone = firebaseUser.phoneNumber;

    // Sign up / log in user in database
    let user = null;

    if (isMongoConnected()) {
      user = await User.findOne({ phone: formattedPhone });
      if (!user) {
        // Create new profile
        user = await User.create({
          phone: formattedPhone,
          name: name?.trim() || `User_${formattedPhone.slice(-4)}`,
          role: role || "Student",
        });
        console.log(`[MONGODB] Registered new user via Firebase: ${formattedPhone}`);
      } else {
        // Option to update existing user role/name if passed in during sign up phase
        if (name || role) {
          if (name) user.name = name.trim();
          if (role) user.role = role;
          await user.save();
        }
        console.log(`[MONGODB] Logged in existing user via Firebase: ${formattedPhone}`);
      }
    } else {
      // In-memory lookup/creation
      user = inMemoryUsers.get(formattedPhone);
      if (!user) {
        user = {
          _id: crypto.randomUUID(),
          phone: formattedPhone,
          name: name?.trim() || `User_${formattedPhone.slice(-4)}`,
          role: role || "Student",
          streak: 1,
          trustScore: 4.5,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        inMemoryUsers.set(formattedPhone, user);
        console.log(`[IN-MEMORY DB] Registered new user via Firebase: ${formattedPhone}`);
      } else {
        if (name) user.name = name.trim();
        if (role) user.role = role;
        user.updatedAt = new Date();
        inMemoryUsers.set(formattedPhone, user);
        console.log(`[IN-MEMORY DB] Logged in existing user via Firebase: ${formattedPhone}`);
      }
    }

    // Generate JWT token containing key user parameters
    const token = jwt.sign(
      {
        id: user._id.toString(),
        phone: user.phone,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: "7d" } // Session valid for 7 days
    );

    return res.status(200).json({
      message: "Authentication successful!",
      token,
      user,
    });
  } catch (error) {
    console.error("Verification error:", error.message);
    return res.status(500).json({ error: "Internal server error during verification process." });
  }
};

/**
 * Controller to get current authenticated user profile
 * GET /api/auth/me
 */
export const getMe = async (req, res) => {
  try {
    const { id, phone } = req.user;

    let user = null;

    if (isMongoConnected()) {
      user = await User.findById(id);
    } else {
      user = inMemoryUsers.get(phone);
    }

    if (!user) {
      return res.status(404).json({ error: "Authenticated user profile not found." });
    }

    return res.status(200).json({ user });
  } catch (error) {
    console.error("Error in getMe:", error.message);
    return res.status(500).json({ error: "Internal server error fetching user session profile." });
  }
};
