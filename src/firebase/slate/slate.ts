import { doc, setDoc } from "firebase/firestore"
import { FirebaseDB, db } from ".."
import { Slate } from "../../model"
import { getGames } from "../../api/getGames";

/**
 * TODO -- updateSlateScores fix
 */

export class FirebaseSlatesClass extends FirebaseDB<Slate> {
  constructor(collectionName: string = 'slates') { super(collectionName) }
  updateSlateScores = async ({ week, year }: { week: number; year: number }): Promise<Slate | undefined> => {
    const slateId = `w${week}-${year}`;
    
    try {
      const games = await getGames()
      let slate = await this.getDocumentInCollection(slateId);
      await setDoc(doc(db, 'slates', `w${week}-2023`), {
        ...slate,
        games: slate?.games.map((g) => {
          const match = games.find((game) => game.gameID === g.gameID)
          return {
            ...g,
            ...match,
          }
        })
      })
      slate = await this.getDocumentInCollection(slateId);
      return slate;
    } catch (err) {
      console.error(err);
    }
  }
}
const FBSlateClassInstance = new FirebaseSlatesClass();
export default FBSlateClassInstance;