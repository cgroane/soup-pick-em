import { collection } from "firebase/firestore";
import { FirebaseDB, auth } from "..";
import { UserCollectionData } from "../../model";
import { GoogleAuthProvider, User, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, signOut } from "firebase/auth";
import { UserRoles } from "../../utils/constants";

export class FirebaseUsers extends FirebaseDB<UserCollectionData> {
  constructor(collectionName: string = 'users') { super(collectionName) }
  auth = auth;
  googleProvider = new GoogleAuthProvider();
  usersRef = collection(this.db, 'users');
  /** 
   * on sign in / sign up, need to get user info into document
   * addDoc does not do anything other than add user to the db users collection
   * 
   */
  registerWithEmailAndPassword = async (name: string, fName:string, lName: string, email: string, password: string, year?: number) => {
    try {
      const res = await createUserWithEmailAndPassword(this.auth, email, password);
      const user = this.transformUserData(res.user, year, name, fName, lName);
      await this.addDocument(user, user.uid);
      return await this.getDocumentInCollection(user.uid);
    } catch (err) {
      console.error(err);
    }
  };
  logInWithEmailAndPassword = async (email: string, password: string) => {
    try {
      const res = await signInWithEmailAndPassword(this.auth, email, password);
      const user = res.user;
      return await this.getDocumentInCollection(user.uid);
    } catch (err) {
      console.error(err);
    }
  };
  logout = async () => {
    try {
      signOut(auth).then(() => this.auth.updateCurrentUser(null))
    } catch (err) {
      console.error(err)
    }
  }
  loginWithGoogle = async (year?: number) => {
      try {
        const res = await signInWithPopup(this.auth, this.googleProvider);
        const user = this.transformUserData(res.user, year);
        const userRef = await this.getDocumentInCollection(user.uid);
        if (!!userRef) {
          return userRef;
        }
        return await this.addDocument(user, user.uid);
      } catch (err) {
        console.error(err)
      }
    };
    transformUserData = (user: User, year: number = new Date().getFullYear(), name?: string, fName?: string, lName?: string) => {
      return {
        uid: user.uid,
        name: name ? name : user.displayName,
        authProvider: "local",
        email: user.email,
        fName: fName ? fName : name ? name : user?.displayName?.split(' ')[0],
        lName: lName ? lName : name ? name : user.displayName?.split(' ')[user.displayName?.split(' ').length - 1],
        id: user.uid,
        roles: [UserRoles.BASIC],
        record: [
          {
            wins: 0,
            losses: 0
          }
        ],
        trophyCase: [],
        isAuthenticated: !!auth.currentUser,
        pickHistory: [],
      }
    }
};

const FirebaseUsersClassInstance = new FirebaseUsers();
export default FirebaseUsersClassInstance;