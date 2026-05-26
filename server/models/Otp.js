import mongoose from "mongoose";

const otpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      index: true,
      trim: true,
      lowercase: true,
    },
    otp: {
      type: String,
      required: true,
    },
    // MongoDB TTL Index will automatically delete this document at expiresAt time
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 },
    },
  },
  {
    timestamps: true,
  }
);

let Otp;
try {
  Otp = mongoose.model("Otp", otpSchema);
} catch (e) {
  Otp = mongoose.model("Otp");
}

export default Otp;
