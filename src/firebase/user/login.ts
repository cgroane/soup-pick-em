import {
  GoogleAuthProvider,
  getAuth,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  User,
} from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { app, db } from ".."
import { UserRoles } from '../../utils/constants';
import UserClass from '../../classes/user';
import { UserCollectionData } from '../../model';

const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
/**
 * Login / register
 */


export const loginWithGoogle = async () => {
  try {
    const res = await signInWithPopup(auth, googleProvider);
    const user = res.user
    return await getUserDoc(user);
  } catch (err) {
    console.error(err)
  }
};

/**
 * register
 * create user and add data
 */
export const registerWithEmailAndPassword = async (name: string, email: string, password: string) => {
  try {
    const res = await createUserWithEmailAndPassword(auth, email, password);
    const user = res.user;
    return await getUserDoc(user);
  } catch (err) {
    console.error(err);
  }
};

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
 * Misc
 */
/**
 * 
 * @param user 
 * @returns 
 * use for google registration because it does not differentiate between login and signup
 * if doc exists, just return it
 * if not, create one with appropraite data
 */
export const getUserDoc = async (user: User, name?: string) => {
  const userDoc = await getDoc(doc(db, "users", user.uid));
  if (!userDoc.exists()) {
    const docRef = await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      name: name ? name : user.displayName,
      authProvider: "local",
      email: user.email,
      fName: name ? name : user?.displayName?.split(' ')[0],
      lName: name ? name : user.displayName?.split(' ')[user.displayName?.split(' ').length - 1],
      id: user.uid,
      roles: [UserRoles.BASIC],
      record: {
        wins: 0,
        losses: 0
      },
      trophyCase: [],
      isAuthenticated: !!auth.currentUser,
      pickHistory: []
    })
    return docRef;
  } else {
    return new UserClass(userDoc.data() as UserCollectionData);
  }
}

export const getUserCollectionData = async (userId: string) => {
  try {
    // const q = query(collection(db, "users"), where("uid", "==",  userId));
    const userDoc = await getDoc(doc(db, 'users', userId));
    const userInfo = new UserClass(userDoc.data() as UserCollectionData);
    return userInfo.user;
  } catch (err) {
    console.error(err);
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