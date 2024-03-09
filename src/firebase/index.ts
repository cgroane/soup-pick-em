// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { collection, getDocs, getFirestore } from "firebase/firestore";
import { GoogleAuthProvider, getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = JSON.parse(process.env.REACT_APP_FIREBASE_CONFIG as string)

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

export const analytics = getAnalytics(app);
export const db = getFirestore(app);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const getCollection = async <T>(collectionName: string, segments: string[]) => {
  
  try {
    const docs = await getDocs(collection(db, collectionName, ''))
    let results: T[] = [];
    docs.forEach((doc) => results.push(doc.data() as T));
  } catch (error) {
    console.error(error);
  }
}