import {
  collection,
  doc,
  getDocs,
  setDoc,
} from 'firebase/firestore';
import { app, db } from "..";
import { User, getAuth } from 'firebase/auth';
import { UserRoles } from '../../utils/constants';
import { UserCollectionData } from '../../model';
import UserClass from '../../classes/user';

const auth = getAuth(app);

export const getUser = async () => {
  const currUser = await auth.onAuthStateChanged((user) => {
    if (user) return user;
    else return null;
  });
  return currUser;
};
export const updateUser = async (firebaseUser?: User) => {
  try {
    const docRef = await setDoc(doc(db, 'users', firebaseUser?.uid as string), {
      fName: firebaseUser?.displayName?.split(' ')[0],
      lName: firebaseUser?.displayName?.split(' ')[1],
      id: firebaseUser?.uid,
      name: firebaseUser?.displayName,
      authProvider: "local",
      email: firebaseUser?.email,
      roles: [UserRoles.BASIC, UserRoles.SLATE_PICKER, UserRoles.ADMIN],
      record: {
        wins: 0,
        losses: 0
      },
      trophyCase: [],
      isAuthenticated: !!auth.currentUser
    });
    return docRef;
  }
  catch (err) {
    console.error(err)
  }
};
