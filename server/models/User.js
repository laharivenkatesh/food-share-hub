import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    name: {
      type: String,
      default: "New User",
    },
    role: {
      type: String,
      enum: ["Student", "Provider", "NGO"],
      default: "Student",
    },
    streak: {
      type: Number,
      default: 1,
    },
    trustScore: {
      type: Number,
      default: 4.5,
    },
  },
  {
    timestamps: true,
  }
);

// Graceful fallback for mock database support
let User;
try {
  User = mongoose.model("User", userSchema);
} catch (e) {
  User = mongoose.model("User");
}

export default User;
