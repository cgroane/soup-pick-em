import { addDoc, collection } from "firebase/firestore"
import { db } from ".."
import { Matchup } from "../../model"

export const createSlate = async (week: number, games: Matchup[]) => {
  
  try {
    const docRef = await addDoc(collection(db, 'slates'), {
      week: week,
      year: new Date().getFullYear(),
      games: games,
      uniqueWeek: `w${week}-${new Date().getFullYear()}`
    });
    return docRef;
  } catch (err) {
    console.error(err);
  }
}