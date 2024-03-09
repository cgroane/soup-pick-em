import { doc, setDoc } from "firebase/firestore";
import { Matchup, UserCollectionData } from "../../model";
import { db } from "..";

export const createSlate = async (week: number, games: Matchup[], user: UserCollectionData) => {
  
  try {

    const docRef = await setDoc(doc(db, 'slates', `w${week}-${new Date().getFullYear()}`), {
      week: week,
      year: new Date().getFullYear(),
      games: games,
      uniqueWeek: `w${week}-${new Date().getFullYear()}`,
      user
    });
    return docRef;
  } catch (err) {
    console.error(err);
  }
}
