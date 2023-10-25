import { createUserWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { getUserDoc } from "./get";
import { auth, googleProvider } from "..";


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
