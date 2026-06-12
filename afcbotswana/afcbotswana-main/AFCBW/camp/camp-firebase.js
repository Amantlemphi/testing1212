
// ═══════════════════════════════════════════════
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy, onSnapshot, where, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCsRVjm8GYT78x0BPFVMoTtpRj2H96EfBI",
  authDomain: "afc-botswana.firebaseapp.com",
  projectId: "afc-botswana",
  storageBucket: "afc-botswana.firebasestorage.app",
  messagingSenderId: "112173481312",
  appId: "1:112173481312:web:a0f416e326442f788f3205"
};

const app  = initializeApp(firebaseConfig);
const db   = getFirestore(app);
const auth = getAuth(app);

// ── COLLECTIONS ──
const CAMP_REGS        = "camp_registrations";
const CAMP_ORDERS      = "camp_orders";
const CAMP_ANN         = "camp_announcements";
const CAMP_ATT         = "camp_attendance";
const CAMP_PRAYERS     = "camp_prayers";
const CAMP_JOURNAL     = "camp_journal";
const CAMP_TESTIM      = "camp_testimonies";
const STORE_PRODUCTS   = "store_products";
const CAMP_SERVICE_ATT = "camp_service_attendance";
const CAMP_SCHEDULE = "camp_schedule";

// ── ROLE EMAIL MAP ──
// Each admin role maps to a Firebase Auth account.
// Update these to match the actual emails you created in Firebase Console.
// Firebase Console → Authentication → Users → Add user
const ROLE_EMAILS = {
  manager:   "bw.ycm.2024@gmail.com",    // Camp Manager  — full access
  store:     "bwstore2026@gmail.com",      // Store Manager — products & orders
  secretary: "bwstore20226@gmail.com",  // Secretary     — attendance (formerly usher)
  mainsite:  "bw.ycm.2024@gmail.com",      // Main site admin
};

export {
  db, auth,
  collection, addDoc, getDocs, doc, updateDoc, deleteDoc,
  query, orderBy, onSnapshot, where, serverTimestamp,
  signInWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail,
  CAMP_REGS, CAMP_ORDERS, CAMP_ANN, CAMP_ATT,
  CAMP_PRAYERS, CAMP_JOURNAL, CAMP_TESTIM,
  STORE_PRODUCTS, CAMP_SERVICE_ATT,
  ROLE_EMAILS,  CAMP_SCHEDULE
};