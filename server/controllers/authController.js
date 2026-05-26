import crypto from "crypto";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import mongoose from "mongoose";
import User from "../models/User.js";
import Otp from "../models/Otp.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev-local-secret-3c8d3523-cc88-4edf-b0e5-e4d50a7f47c2";

// --- Nodemailer Transporter Initialization ---
const emailUser = process.env.EMAIL_USER;
const emailPass = process.env.EMAIL_PASS;

let transporter = null;
const isEmailConfigured = Boolean(emailUser && emailPass);

if (isEmailConfigured) {
  try {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    });
  } catch (err) {
    console.error("Failed to initialize Nodemailer SMTP transporter:", err.message);
  }
} else {
  console.warn(
    "[DEV MODE] Google SMTP credentials missing from .env. The server will run in Email Sandbox mode: OTPs will be printed to the terminal console and returned in the API response."
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
 * Controller to send an OTP via email
 * POST /api/auth/send-otp
 */
export const sendOtp = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email address is required" });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: "Invalid email address format." });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const otpCode = generateNumericOtp();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiration

  try {
    if (isMongoConnected()) {
      // Store/replace in MongoDB
      await Otp.findOneAndUpdate(
        { email: normalizedEmail },
        { otp: otpCode, expiresAt },
        { upsert: true, new: true }
      );
    } else {
      // Store in memory
      inMemoryOtps.set(normalizedEmail, { otp: otpCode, expiresAt });
      console.log(`[IN-MEMORY DB] Saved OTP for ${normalizedEmail}`);
    }

    // Send Email via Google SMTP if configured, otherwise bypass
    if (isEmailConfigured && transporter) {
      try {
        const mailOptions = {
          from: `"Food Share Hub" <${emailUser}>`,
          to: normalizedEmail,
          subject: "Your Verification Code - Food Share Hub",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
              <h2 style="color: #2e7d32; text-align: center;">Food Share Hub</h2>
              <p>Hello,</p>
              <p>Thank you for using Food Share Hub. To complete your login or registration, please use the following 6-digit verification code:</p>
              <div style="background-color: #f1f8e9; padding: 15px; border-radius: 4px; text-align: center; margin: 20px 0;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #2e7d32;">${otpCode}</span>
              </div>
              <p>This code is valid for <strong>5 minutes</strong>. If you did not request this code, please ignore this email.</p>
              <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 25px 0;" />
              <p style="font-size: 12px; color: #757575; text-align: center;">Saving food, sharing love. &copy; 2026 Food Share Hub.</p>
            </div>
          `,
        };

        await transporter.sendMail(mailOptions);
        console.log(`[SMTP SUCCESS] Sent OTP ${otpCode} to ${normalizedEmail}`);
        return res.status(200).json({
          message: "OTP sent successfully via email. It is valid for 5 minutes.",
          email: normalizedEmail,
        });
      } catch (smtpError) {
        console.error("SMTP Email send failed:", smtpError.message);
        // Fallback to sandbox response
        return res.status(200).json({
          warning: "Google SMTP sending failed, falling back to sandbox mode.",
          message: "OTP generated successfully (Sandbox Mode).",
          email: normalizedEmail,
          dev_otp: otpCode,
        });
      }
    } else {
      // Sandbox bypass mode
      console.log(`\n======================================================`);
      console.log(`[SANDBOX OTP] Email: ${normalizedEmail} | Code: ${otpCode}`);
      console.log(`======================================================\n`);

      return res.status(200).json({
        message: "OTP generated successfully (Sandbox Mode).",
        email: normalizedEmail,
        dev_otp: otpCode, // Returned for dev convenience
      });
    }
  } catch (dbError) {
    console.error("Database error in sendOtp:", dbError.message);
    return res.status(500).json({ error: "Internal server error. Failed to generate and save OTP." });
  }
};

/**
 * Controller to verify OTP and issue JWT session token
 * POST /api/auth/verify-otp
 */
export const verifyOtp = async (req, res) => {
  const { email, otp, name, role, phone, password } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ error: "Email address and OTP are required" });
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    let otpRecord = null;

    if (isMongoConnected()) {
      otpRecord = await Otp.findOne({ email: normalizedEmail });
    } else {
      otpRecord = inMemoryOtps.get(normalizedEmail);
    }

    if (!otpRecord) {
      return res.status(400).json({ error: "No verification code has been sent to this email, or it has expired." });
    }

    // Verify expiration
    if (new Date() > new Date(otpRecord.expiresAt)) {
      if (isMongoConnected()) {
        await Otp.deleteOne({ email: normalizedEmail });
      } else {
        inMemoryOtps.delete(normalizedEmail);
      }
      return res.status(400).json({ error: "The verification code has expired (5 minutes timeout reached). Please request a new one." });
    }

    // Verify OTP matching
    if (otpRecord.otp !== otp.trim()) {
      return res.status(400).json({ error: "Incorrect verification code. Please check and try again." });
    }

    // OTP is correct! Clear it.
    if (isMongoConnected()) {
      await Otp.deleteOne({ email: normalizedEmail });
    } else {
      inMemoryOtps.delete(normalizedEmail);
    }

    // Sign up / log in user in database
    let user = null;

    if (isMongoConnected()) {
      user = await User.findOne({ email: normalizedEmail });
      if (!user) {
        // Create new profile
        user = await User.create({
          email: normalizedEmail,
          name: name?.trim() || `User_${normalizedEmail.split("@")[0]}`,
          role: role || "Student",
          phone: phone || undefined,
          password: password || undefined,
        });
        console.log(`[MONGODB] Registered new user: ${normalizedEmail}`);
      } else {
        // Update user details if passed in
        if (name || role || phone || password) {
          if (name) user.name = name.trim();
          if (role) user.role = role;
          if (phone) user.phone = phone.trim();
          if (password) user.password = password;
          await user.save();
        }
        console.log(`[MONGODB] Logged in existing user: ${normalizedEmail}`);
      }
    } else {
      // In-memory lookup/creation
      user = inMemoryUsers.get(normalizedEmail);
      if (!user) {
        user = {
          _id: crypto.randomUUID(),
          email: normalizedEmail,
          name: name?.trim() || `User_${normalizedEmail.split("@")[0]}`,
          role: role || "Student",
          phone: phone || undefined,
          password: password || undefined,
          streak: 1,
          trustScore: 4.5,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        inMemoryUsers.set(normalizedEmail, user);
        console.log(`[IN-MEMORY DB] Registered new user: ${normalizedEmail}`);
      } else {
        if (name) user.name = name.trim();
        if (role) user.role = role;
        if (phone) user.phone = phone.trim();
        if (password) user.password = password;
        user.updatedAt = new Date();
        inMemoryUsers.set(normalizedEmail, user);
        console.log(`[IN-MEMORY DB] Logged in existing user: ${normalizedEmail}`);
      }
    }

    // Generate JWT token containing key user parameters
    const token = jwt.sign(
      {
        id: user._id.toString(),
        email: user.email,
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
    const { id, email } = req.user;

    let user = null;

    if (isMongoConnected()) {
      user = await User.findById(id);
    } else {
      user = inMemoryUsers.get(email);
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
