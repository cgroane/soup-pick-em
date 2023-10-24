import { doc, setDoc } from "firebase/firestore";
import { Picks, UserCollectionData } from "../../model";
import { db } from "..";


export const makePicks = async (user: UserCollectionData, picks: {slateId: string; picks: Picks[]}) => {
  try {
    const docRef = await setDoc(doc(db, 'users', user.uid), {
      ...user,
      pickHistory: picks
    })
    return docRef;
  } catch (err) {
    console.error(err);
  }
}