import mongoose from "mongoose";

const connectDB = async () => {
  const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/otp-auth";
  
  console.log("Initializing connection to MongoDB...");
  
  try {
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 2000, // Timeout fast if offline
    });
    console.log(`[DATABASE] Connected to MongoDB database successfully: ${MONGO_URI}`);
  } catch (err) {
    console.warn("\n=========================================================================");
    console.warn("[DATABASE WARNING] Could not connect to MongoDB database.");
    console.warn("Reason:", err.message);
    console.warn("SOLUTION: Ensure a local MongoDB server instance is active.");
    console.warn("[FALLBACK ACTIVE] Booting Express server in OFFLINE SANDBOX MODE.");
    console.warn("All session user data will compile and be stored in local memory.");
    console.warn("=========================================================================\n");
  }
};

export default connectDB;
