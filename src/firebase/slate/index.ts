import { collection, doc, getDocs, query, setDoc, where } from "firebase/firestore"
import { db } from ".."
import { Matchup, Slate, UserCollectionData } from "../../model"
import SlateClass from "../../classes/slate";

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

export const getSlate = async (week: number) => {
  try {
    const citiesRef = collection(db, "slates");

    const q = query(citiesRef, where('uniqueWeek', '==', `w${week}-${new Date().getFullYear()}`))
    const docRef = await getDocs(q)

    let results: Slate[] = []
    docRef.forEach((document) => {
      results = [...results, (new SlateClass( document.data() as Slate ).slate)]
    });

    return results[0]
  } catch (err) {
    console.error(err);
  }
}