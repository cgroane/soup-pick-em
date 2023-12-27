/**
 * 
 */

import { collection, doc, getDoc, getDocs } from "firebase/firestore"
import { db } from ".."
import { Outcome } from "../../model";

export const getUserPicksFromFirestore = async (week: number, userId: string) => {
  try {

    const pickDoc = await getDoc(doc(db, 'picks', `${userId}-w${week}-2023`))
    const matchups = await getDocs(collection(db, 'picks', `${userId}-w${week}-2023`, 'matchups'));

    let results: { gameId: string; outcomeIndex: number; outcome: Outcome | "PUSH"}[] = [];
    matchups.forEach((doc) => results.push(doc.data() as { gameId: string; outcomeIndex: number; outcome: Outcome | "PUSH"}));
    const resultingData = {
      ...pickDoc.data(),
      matchups: results
    }
    return resultingData;
  } catch (err) {
    console.error(err)
  }
};