import { GoogleAuthProvider, createUserWithEmailAndPassword, getAuth, signInWithPopup } from "firebase/auth";
import { getUserDoc } from "./get";
import { app } from "..";


/**
 * sign in bugs
 * log in w email and pw not working 
 * fix routing behavior after sign in and sign up
 */
const auth = getAuth(app);

export const loginWithGoogle = async () => {
const googleProvider = new GoogleAuthProvider();
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
    return await getUserDoc(user, name);
  } catch (err) {
    console.error(err);
  }
};
