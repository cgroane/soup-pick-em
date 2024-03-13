import { collection, doc, getDoc, getDocs, setDoc } from "firebase/firestore";
import { FirebaseDB, auth, db } from "..";
import { UserCollectionData } from "../../model";
import UserClass from "../../classes/user";
import { GoogleAuthProvider, User, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, signOut } from "firebase/auth";
import { UserRoles } from "../../utils/constants";

export class FirebaseUsers extends FirebaseDB<UserCollectionData> {
  constructor(collectionName: string = 'users') { super(collectionName) }
  auth = auth;
  googleProvider = new GoogleAuthProvider();
  usersRef = collection(db, 'users');
  queryUsers = async () => {
    console.log('query'); 
    
  };
  getAllUsers = async () => {
    try { 
      const usersDocsRefs = await getDocs(this.usersRef);
      let results: UserCollectionData[] = [];
      usersDocsRefs.docs.forEach((user) => results.push(new UserClass(user.data() as UserCollectionData).user as UserCollectionData ));
      return results;
    } catch(err) {
      console.error(err)
    }
  };
  getUserCollectionData = async (userId: string) => {
    try {
      // const q = query(collection(db, "users"), where("uid", "==",  userId));
      const userDoc = await getDoc(doc(db, 'users', userId));
      const userInfo = new UserClass(userDoc.data() as UserCollectionData);
      return userInfo.user;
    } catch (err) {
      console.error(err);
    }
  };
  getUserDoc = async (user: User, name?: string) => {
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (!userDoc.exists()) {
      await setDoc(doc(db, 'users', user.uid), {
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
      const newUserDoc = await getDoc(doc(db, 'users', user.uid));
      return new UserClass(newUserDoc.data() as UserCollectionData);
    } else {
      return new UserClass(userDoc.data() as UserCollectionData);
    }
  };
  registerWithEmailAndPassword = async (name: string, email: string, password: string) => {
    try {
      const res = await createUserWithEmailAndPassword(auth, email, password);
      const user = res.user;
      return await this.getUserDoc(user, name);
    } catch (err) {
      console.error(err);
    }
  };
  logInWithEmailAndPassword = async (email: string, password: string) => {
    try {
      const res = await signInWithEmailAndPassword(auth, email, password);
      const user = res.user;
      return await this.getDocumentInCollection(user.uid);
    } catch (err) {
      console.error(err);
    }
  };
  logout = async () => {
    try {
      signOut(auth).then(() => auth.updateCurrentUser(null))
    } catch (err) {
      console.error(err)
    }
  }
  loginWithGoogle = async () => {
      try {
        const res = await signInWithPopup(this.auth, this.googleProvider);
        const user = res.user
        return await this.getUserDoc(user);
      } catch (err) {
        console.error(err)
      }
    };
};
// export const getAllUsers = async () => {
//   /** try to only return name and uid */
//   try { 
//     const usersRef = await getDocs(collection(db, 'users'));
//     let results: UserCollectionData[] = [];
//     usersRef.docs.forEach((user) => results.push(new UserClass(user.data() as UserCollectionData).user as UserCollectionData ));
//     return results;
//   } catch(err) {
//     console.error(err)
//   }
// };

// export const getUserCollectionData = async (userId: string) => {
//   try {
//     // const q = query(collection(db, "users"), where("uid", "==",  userId));
//     const userDoc = await getDoc(doc(db, 'users', userId));
//     const userInfo = new UserClass(userDoc.data() as UserCollectionData);
//     return userInfo.user;
//   } catch (err) {
//     console.error(err);
//   }
// }

// /**
//  * Misc
//  */
// /**
//  * 
//  * @param user 
//  * @returns 
//  * use for google registration because it does not differentiate between login and signup
//  * if doc exists, just return it
//  * if not, create one with appropraite data
//  */


// export const getUserDoc = async (user: User, name?: string) => {
//   const userDoc = await getDoc(doc(db, "users", user.uid));
//   if (!userDoc.exists()) {
//     await setDoc(doc(db, 'users', user.uid), {
//       uid: user.uid,
//       name: name ? name : user.displayName,
//       authProvider: "local",
//       email: user.email,
//       fName: name ? name : user?.displayName?.split(' ')[0],
//       lName: name ? name : user.displayName?.split(' ')[user.displayName?.split(' ').length - 1],
//       id: user.uid,
//       roles: [UserRoles.BASIC],
//       record: {
//         wins: 0,
//         losses: 0
//       },
//       trophyCase: [],
//       isAuthenticated: !!auth.currentUser,
//       pickHistory: []
//     })
//     const newUserDoc = await getDoc(doc(db, 'users', user.uid));
//     return new UserClass(newUserDoc.data() as UserCollectionData);
//   } else {
//     return new UserClass(userDoc.data() as UserCollectionData);
//   }
// };

const FirebaseUsersClassInstance = new FirebaseUsers();
export default FirebaseUsersClassInstance;