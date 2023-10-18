// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: "soup-pick-em.firebaseapp.com",
  projectId: "soup-pick-em",
  storageBucket: "soup-pick-em.appspot.com",
  messagingSenderId: "745609435591",
  appId: "1:745609435591:web:07f9856dc9e2afbfade1e2",
  measurementId: "G-43J81PPEPB"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

export const analytics = getAnalytics(app);
export const db = getFirestore(app);
