import { doc, setDoc } from "firebase/firestore";
import { db } from "..";
import { UserCollectionData } from "../../model";


export const updateUserDoc = async <T,>(fieldName: string, user: UserCollectionData, value: T) => {
  try {
    const userDoc = await setDoc(doc(db, 'users', user.uid), {
      ...user,
      [fieldName]: value
    })
    return userDoc
  } catch (err) {
    console.error(err)
  }
}