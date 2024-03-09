import { doc, setDoc } from "firebase/firestore"
import { getGames } from "../../api/getGames"
import { db } from ".."
import { getSlate } from "./get"
import { Slate } from "../../model"


export const updateSlateScores = async (week: number): Promise<Slate | undefined> => {
  try {
    const games = await getGames()
    let slate = await getSlate(week);
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
    slate = await getSlate(week);
    return slate;
  } catch (err) {
    console.error(err);
  }
}