import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';

// Firebase configuration - Add your Firebase config here

const firebaseConfig = {
  apiKey: "AIzaSyAShvRLd_xg-rrByDZ1dLofOQ9nf8ihDi8",
  authDomain: "bimo-test-6fea9.firebaseapp.com",
  databaseURL: "https://bimo-test-6fea9-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "bimo-test-6fea9",
  storageBucket: "bimo-test-6fea9.firebasestorage.app",
  messagingSenderId: "337244766924",
  appId: "1:337244766924:web:da3ef1380ba6da4898f869",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const rtdb = getDatabase(app);
export const storage = getStorage(app);

export default app;
