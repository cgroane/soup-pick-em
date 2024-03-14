// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { CollectionReference, DocumentData, collection, deleteDoc, doc, getDoc, getDocs, getFirestore, setDoc, updateDoc } from "firebase/firestore";
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

/**
 * parent class for firebase basic functions for each collection
 * each data type (user, slate, pick) should have CRUD ops.
 * creating class based firebase arch so i only have to instantiate auth, provider, db, app, once
 */
export class FirebaseDB<T> {
  collectionName: string;
  collectionRef: CollectionReference<DocumentData, DocumentData>;

  constructor(collectionName: string) { 
    this.collectionName = collectionName;
    this.collectionRef = collection(this.db, collectionName);
  }
  db = db;
  app = app;
  /** create */
  addDocument = async <V extends {}>(docData: V, docId?: string) => {
    try {
      const docRef = await setDoc(doc(this.db, this.collectionName, docId ?? ''), docData)
      return docRef;
    } catch (error) {
      console.error(error);
    }
  }
  /** read */
  getCollection = async () => {
    try {
      const docs = await getDocs(collection(db, this.collectionName, ''))
      let results: T[] = [];
      docs.forEach((doc) => results.push(doc.data() as T));
      return results;
    } catch (error) {
      console.error(error);
    }
  }
  getDocumentInCollection = async (docId: string) => {
    try {
      const documentRef = await getDoc(doc(this.db, this.collectionName, docId));
      const docData = documentRef.data() as T;
      return docData;
    } catch (err) {
      console.error(err);
    }
  }
  /** update */
  updateDocumentInCollection = async <V extends {}>(docId: string, values: V) => {
    /**
     * if the value property type is an object or an array, you have to copy the initial vals of that property into the new val
     * the question is whether to do this here, or in the invocation
    */
    try {
      await updateDoc(doc(this.db, this.collectionName, docId), values);
      const updatedDoc = await this.getDocumentInCollection(docId);
      return updatedDoc;
    } catch (error) {
      console.error(error);
    }
  }
  /** delete */
  deleteDocumentInCollection = async (docId: string) => {
    try {
      const docRef = await deleteDoc(doc(this.db, this.collectionName, docId));
      return docRef;
    } catch (error) {
      console.error(error);
    }
  }
}

/**
 * each isntance of a collection (1 for user, 1 for slate) is an instance of this class 
 * so FirebaseUsersClassInstance 
 */