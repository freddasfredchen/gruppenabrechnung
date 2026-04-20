import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCXOics4BJIKHKyX97vypHApRjSgvR6Lpc",
  authDomain: "gruppenabrechnung.firebaseapp.com",
  projectId: "gruppenabrechnung",
  storageBucket: "gruppenabrechnung.firebasestorage.app",
  messagingSenderId: "563685890703",
  appId: "1:563685890703:web:f46a26126bb5e198616efa",
  measurementId: "G-52FGQNKRWF"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
