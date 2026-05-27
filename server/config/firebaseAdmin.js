import admin from "firebase-admin";

const isFirebaseConfigured = Boolean(
  process.env.FIREBASE_PROJECT_ID &&
  process.env.FIREBASE_PRIVATE_KEY &&
  process.env.FIREBASE_CLIENT_EMAIL
);

let firebaseAdmin = null;

if (isFirebaseConfigured) {
  try {
    // Format private key properly to handle newlines
    const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n");
    
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
    });
    
    firebaseAdmin = admin;
    console.log("[FIREBASE] Firebase Admin SDK initialized successfully.");
  } catch (error) {
    console.error("Firebase Admin initialization error:", error.message);
  }
} else {
  console.warn(
    "[DEV MODE] Firebase credentials missing from .env. The backend server will run in OTP Sandbox mode: verification tokens will bypass verification or run a sandbox matching algorithm."
  );
}

export { admin as default, isFirebaseConfigured };
