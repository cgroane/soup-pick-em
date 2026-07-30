import { doc, getDoc, setDoc, writeBatch } from "firebase/firestore"
import { FirebaseDB, db } from ".."
import { GamesAPIResult, Slate, UserCollectionData } from "../../model"
import { getGames } from "../../api/getGames";

/**
 * TODO -- updateSlateScores fix
 *
 * Slates and picks are group-scoped: groups/{gid}/slates/{uniqueWeek} and
 * groups/{gid}/members/{uid}/picks/{uniqueWeek}.
 */

export class FirebaseSlatesClass extends FirebaseDB<Slate> {
  constructor(collectionName: string = 'slates') { super(collectionName) }
  addSlate = async (gid: string, data: Slate, users: UserCollectionData[], deletions?: number[]) => {
    try {
      const existingSnap = await getDoc(doc(this.db, 'groups', gid, 'slates', data.uniqueWeek));
      const existingSlate = existingSnap.exists() ? (existingSnap.data() as Slate) : undefined;
      /**
       * returns games that ARE deleted
       * return games where statement is true
       */
      const overWrittenGames = existingSlate?.games.filter((_, index) => !!deletions?.includes(index)).map((g) => (g.id))
      /**
       * returns games from existing slate that will not be deleted
       * return all games where statement is false
       */
      const keptGames = existingSlate?.games.filter((_, index) => !deletions?.includes(index)).map((g) => (g.id))
      console.log(overWrittenGames, keptGames);
      // what is goiung to represent the new games? data that is not already in pick game list to update
      /**
       * delete from each user the games included in overwritten games
       * user pick history games filter delections !include index
       */
      await setDoc(doc(this.db, 'groups', gid, 'slates', data.uniqueWeek), data);
      const batch = writeBatch(this.db);

      users.forEach((userData) => {
          /**
          * find pick history that needs to be updated using slateid
          * keep old picks that weren't deleted
          */
          const pickHToUpdate = userData.pickHistory.find((pH) => pH.slateId === data?.uniqueWeek);
          const docRef = doc(this.db, 'groups', gid, 'members', userData.uid, 'picks', data.uniqueWeek);
          /** below needs to set doc data equal to the unique weeks pick history */
          /**
           * find each game that is in keptgames == games to copy over
           * picks.filter
           
           */
          const usersKept = pickHToUpdate?.picks.filter((pH) => keptGames?.includes(pH.matchup)) as [];

          /**
           * filter data.games for games NOT in picks
           * pick.find data.games game.id === pick.id
           */
          const newMatchups = (data.games.filter((g) => !pickHToUpdate?.picks.map((p) => p.matchup)?.includes(g.id)) as GamesAPIResult[])
            ?.map((matchup) => {
              return {
                isCorrect: false,
                matchup: matchup.id,
                selection: null,
                userId: null,
                week: matchup.week
              }
            })
          if (pickHToUpdate) {
            batch.set(docRef, { ...pickHToUpdate, picks: [
              ...usersKept,
              ...newMatchups
            ]
          })
          }
      })
      batch.commit();
    } catch(err) {
      console.error(err);
      throw new Error('Could not update slate to the database')
    }
  }
  updateSlateScores = async (gid: string, { week, year }: { week: number; year: number }): Promise<Slate | undefined> => {
    const slateId = `w${week}-${year}`;
    const slateRef = doc(db, 'groups', gid, 'slates', slateId);

    try {
      const games = await getGames()
      const existing = await getDoc(slateRef);
      const slate = existing.exists() ? (existing.data() as Slate) : undefined;
      const updated = {
        ...slate,
        games: slate?.games.map((g) => {
          const match = games.find((game) => game.id === g.id)
          return {
            ...g,
            ...match,
          }
        })
      };
      await setDoc(slateRef, updated);
      return updated as Slate;
    } catch (err) {
      console.error(err);
      return;
    }
  }
}
const FBSlateClassInstance = new FirebaseSlatesClass();
export default FBSlateClassInstance;