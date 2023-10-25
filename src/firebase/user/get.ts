import { collection, doc, getDoc, getDocs, setDoc } from "firebase/firestore";
import { auth, db } from "..";
import { UserCollectionData } from "../../model";
import UserClass from "../../classes/user";
import { User } from "firebase/auth";
import { UserRoles } from "../../utils/constants";

export const getAllUsers = async () => {
  /** try to only return name and uid */
  try { 
    const usersRef = await getDocs(collection(db, 'users'));
    let results: UserCollectionData[] = [];
    usersRef.docs.forEach((user) => results.push(new UserClass(user.data() as UserCollectionData).user as UserCollectionData ));
    return results;
  } catch(err) {
    console.error(err)
  }
};

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