import { Dispatch, SetStateAction, createContext, useCallback, useContext, useState } from "react";
import { Picks, Slate } from "../../model"
import { getWeek } from "../../utils/getWeek";
import { useGlobalContext } from "../user";
import { getSlate } from "../../firebase/slate/get";
import { updateSlateScores } from "../../firebase/slate/update";

/**
 * TODO
 * fetchSlate may need to accept a parameter for week number with current week default
 */
export type PickValueProp = {
  slate: Slate;
  picks: { slateId: string; picks: Picks[] };
  setSlate: Dispatch<SetStateAction<Slate>>;
  setPicks: Dispatch<SetStateAction< { slateId: string; picks: Picks[] }>>;
  addPick: (pick: Picks) => void;
  fetchSlate: () => void;
  getUserPicks: () => void;
  refreshSlatePicksStatus: () => void;
}

type ContextProp = {
  children: React.ReactNode
}

export const PickContext = createContext({} as PickValueProp);

const Context = ({
  children
}: ContextProp) => {
  const { user } = useGlobalContext()
  const [slate, setSlate] = useState({} as Slate);
  const [picks, setPicks] = useState({
    slateId: slate?.uniqueWeek,
    picks: [] as Picks[]
  });
  // const [initialPicks, setInitialPicks] = useState<{ slateId: string, picks: Picks[] }>({} as {slateId: string, picks: Picks[]})
  
  const addPick = useCallback((pick: Picks) => {
    /**
     * find outcome selection in pick.picks by matchup ID.
     * if selection is not the same, udpate selection
     */
    setPicks((previousPicks) => {
      const pickIndex = picks.picks.findIndex((p) => pick.matchup === p.matchup);
      if (pickIndex >= 0) {
        const findPick = picks.picks[pickIndex];
        if (JSON.stringify(pick) !== JSON.stringify(findPick)) {
          const newPicks = [...previousPicks.picks];
          newPicks.splice(pickIndex, 1, pick)
          return {
            ...previousPicks,
            picks: [...newPicks]
          }
        }
        return previousPicks;
      } else {
        return {
          ...previousPicks,
          picks: [
          ...previousPicks.picks,
          pick
        ]}
      }
    })

  }, [picks]);

  const fetchSlate = useCallback( async () => {
    const results = await getSlate(getWeek().week);
    setSlate(results as Slate);
    setPicks((prev) => ({ slateId: results?.uniqueWeek as string, picks: [...prev?.picks] }))
    return results;
  }, [setSlate, setPicks]);
  
  const refreshSlatePicksStatus = useCallback(async () => {
    const updatedSlate = await updateSlateScores(getWeek().week)
    setSlate(updatedSlate as Slate)
  }, [setSlate]);

  const getUserPicks = useCallback(async () => {
    const findPicks = user?.pickHistory?.find((p) => p.slateId === slate.uniqueWeek);
    if (findPicks) {
      setPicks(findPicks);
    }
  }, [user?.pickHistory, setPicks, slate.uniqueWeek]);

  return (
    <PickContext.Provider value={{ slate, setSlate, picks, setPicks, addPick, fetchSlate, getUserPicks, refreshSlatePicksStatus }} >
      {children}
    </PickContext.Provider>
  )
}
export default Context;
export const usePickContext = () => useContext(PickContext);