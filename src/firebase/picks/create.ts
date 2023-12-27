import { arrayUnion, collection, doc, setDoc } from "firebase/firestore";
import { Outcome, Picks, UserCollectionData } from "../../model";
import { db } from "..";

/**
 * this operates as a create and update
 * create slate picks with id = userId + unique week
 * @param user 
 * @param picks 
 * @returns 
 */
export const makePicks = async (user: UserCollectionData, picks: { slateId: string; picks: Picks[]}) => {
  try {
    const docRef = await setDoc(doc(db, 'users', user.uid), {
      ...user,
      pickHistory: arrayUnion(picks)
    })
    return docRef;
  } catch (err) {
    console.error(err);
  }
}

export const makePicksAsACollection = async (
  userId: string,
  data: {
    week: number;
    matchups: { gameId: number; outcomeIndex: number; outcome: Outcome | "PUSH" }[] 
  }) => {
    const slateId = `w${data.week}-2023`
  try {
    
    const docRef = doc(db, 'picks', `${userId}-${slateId}`)
    const compoundRequest = await Promise.all([
      await setDoc(docRef, {
        week: data.week,
        slateId
      }),
      await data.matchups.map((m) => setDoc(doc(collection(db, 'picks', `${userId}-${slateId}` , 'matchups'), m.gameId.toString()), {
        gameId: m.gameId,
        outcome: m.outcome,
        outcomeIndex: m.outcomeIndex
      }))
    ]);
    return compoundRequest;
  } catch (error) {
    console.error(error)
  }
};