import {
  doc,
  getDoc,
  setDoc,
} from 'firebase/firestore';
import { app, db } from "..";
import { User, getAuth } from 'firebase/auth';
import { UserRoles } from '../../utils/constants';
import UserClass from '../../classes/user';
import { UserCollectionData } from '../../model';

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
}

export const getUserCollectionData = async (userId: string) => {
  try {
    // const q = query(collection(db, "users"), where("uid", "==",  userId));
    const userDoc = await getDoc(doc(db, 'users', userId));
    return new UserClass(userDoc.data() as UserCollectionData);
  } catch (err) {
    console.error(err);
  }
}


// const userConverter = {
//   toFirestore: (user: User) => {
//     return {
//       fName: user?.displayName?.split(' ')[0],
//       lName: user?.displayName?.split(' ')[1],
//       id: user?.uid,
//       name: user?.displayName,
//       authProvider: "local",
//       email: user?.email,
//       roles: [UserRoles.BASIC, UserRoles.SLATE_PICKER, UserRoles.ADMIN],
//       record: {
//         wins: 0,
//         losses: 0
//       },
//       trophyCase: [],
//       isAuthenticated: !!auth.currentUser
//     }
//   },
//   fromFirestore: (snapshot: QueryDocumentSnapshot<DocumentData, DocumentData>, options: SnapshotOptions) => {
//     const data = snapshot.data(options);
//     return new UserClass(data as UserCollectionData);
//   }
// }
// const user = auth.currentUser;
// onAuthStateChanged(auth, (user) => {
//   if (user) {
//     // User is signed in, see docs for a list of available properties
//     // https://firebase.google.com/docs/reference/js/auth.user
//     const uid = user.uid;
//     return user
//     // ...
//   } else {
//     // User is signed out
//     // ...
//     return null
//   }
// });