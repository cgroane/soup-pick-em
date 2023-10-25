import { collection,  getDocs, query, where } from "firebase/firestore"
import { db } from ".."
import { Slate } from "../../model"
import SlateClass from "../../classes/slate";


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