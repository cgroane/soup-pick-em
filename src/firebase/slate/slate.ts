import { doc, setDoc, writeBatch } from "firebase/firestore"
import { FirebaseDB, db } from ".."
import { Slate, UserCollectionData } from "../../model"
import { getGames } from "../../api/getGames";

/**
 * TODO -- updateSlateScores fix
 */

export class FirebaseSlatesClass extends FirebaseDB<Slate> {
  constructor(collectionName: string = 'slates') { super(collectionName) }
  addSlate = async (data: Slate, users: UserCollectionData[]) => {
    const batch = writeBatch(this.db);
    users.forEach((userData, _, array) => {
      const docRef = doc(this.db, this.collectionName, userData.uid);
      batch.set(docRef, { ...userData, pickHistory: userData.pickHistory })
    })
    this.addDocument(data);
  }
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