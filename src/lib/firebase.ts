import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAeu92rfYKn1RubhnxsWS5NVJKChNIJ18A",
  authDomain: "zerra-food-hub-12.firebaseapp.com",
  projectId: "zerra-food-hub-12",
  storageBucket: "zerra-food-hub-12.firebasestorage.app",
  messagingSenderId: "109690805128",
  appId: "1:109690805128:web:f76b517be61dbc02ec383d",
  measurementId: "G-7ZCB09CTGR"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
auth.useDeviceLanguage();
