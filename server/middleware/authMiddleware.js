import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/User.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev-local-secret-3c8d3523-cc88-4edf-b0e5-e4d50a7f47c2";

export const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Access denied. Secure authorization token missing." });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // Contains id, email, phone, role

    // Check if user exists in MongoDB (if database is connected)
    if (mongoose.connection.readyState === 1) {
      const userExists = await User.findById(decoded.id);
      if (!userExists) {
        return res.status(401).json({ error: "Access denied. Associated user profile was not found." });
      }
    }

    next();
  } catch (error) {
    console.error("JWT Verification Middleware error:", error.message);
    return res.status(401).json({ error: "Invalid, expired, or corrupted session token. Please log in again." });
  }
};
