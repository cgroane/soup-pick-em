import {
  signInWithEmailAndPassword,
  signOut,
  User,
} from 'firebase/auth'
import { doc, setDoc } from 'firebase/firestore'
import { auth, db } from ".."
import { UserRoles } from '../../utils/constants';
import { getUserCollectionData } from './get';

/**
 * Login / register
 */


/**
 * 
 * @param email 
 * @param password 
 * @returns 
 * login, get user data and return it
 */
export const logInWithEmailAndPassword = async (email: string, password: string) => {
  try {
    const res = await signInWithEmailAndPassword(auth, email, password);
    const user = res.user;
    return await getUserCollectionData(user.uid);
  } catch (err) {
    console.error(err);
  }
};
/**
 * logout
 */
export const logout = async () => {
  try {
    signOut(auth).then((res) => auth.updateCurrentUser(null))
  } catch (err) {
    console.error(err)
  }
}


/**
 * for editing user
 */


export const updateUser = async (firebaseUser?: User) => {
  try {
    const docRef = await setDoc(doc(db, 'users', firebaseUser?.uid as string), {
      fName: firebaseUser?.displayName?.split(' ')[0],
      lName: firebaseUser?.displayName?.split(' ')[firebaseUser?.displayName?.split(' ').length - 1],
      id: firebaseUser?.uid,
      name: firebaseUser?.displayName,
      authProvider: "local",
      email: firebaseUser?.email,
      roles: [UserRoles.BASIC],
      record: {
        wins: 0,
        losses: 0
      },
      trophyCase: [],
      isAuthenticated: !!auth.currentUser,
      pickHistory: []
    });
    return docRef;
  }
  catch (err) {
    console.error(err)
  }
};