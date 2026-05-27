import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    phone: {
      type: String,
      trim: true,
      index: true,
      default: null,
    },
    password: {
      type: String,
      default: null, // Null for Google/phone-only authentication
    },
    role: {
      type: String,
      enum: ["User", "Provider", "NGO"],
      default: "User",
    },
    loginMethod: {
      type: String,
      enum: ["email", "phone", "google"],
      required: true,
    },
    otpVerifiedStatus: {
      type: Boolean,
      default: false,
    },
    streak: {
      type: Number,
      default: 1,
    },
    trustScore: {
      type: Number,
      default: 4.5,
    },
    createdDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

let User;
try {
  User = mongoose.model("User", userSchema);
} catch (e) {
  User = mongoose.model("User");
}

export default User;

