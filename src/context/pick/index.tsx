import { Dispatch, SetStateAction, createContext, useCallback, useContext, useEffect, useState } from "react";
import { Picks, Slate } from "../../model"
import { useGlobalContext } from "../user";
import FBSlateClassInstance from "../../firebase/slate/slate";
import { LoadingState, useUIContext } from "../ui";
import { PickHistory } from "../../pages/Picks/PicksTable";

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
  fetchSlate: ({ week, year }: { week?: number; year?: number }) => Promise<Slate | undefined>;
  getUserPicks: () => PickHistory | undefined;
  refreshSlatePicksStatus: ({ week, year }: { week?: number; year?: number }) => void;
}

type ContextProp = {
  children: React.ReactNode
}

export const PickContext = createContext({} as PickValueProp);

const Context = ({
  children
}: ContextProp) => {
  const { user } = useGlobalContext()
  const { seasonData, setStatus } = useUIContext();
  const [slate, setSlate] = useState({} as Slate);
  // const [weeklyResults, setWeeklyResults] = useState()
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

  const fetchSlate = useCallback( async ({ week, year }: { week?: number; year?: number }) => {
    /** update to use seasons data as fallback */
    setStatus(LoadingState.LOADING)
    const results = await FBSlateClassInstance.getDocumentInCollection(`w${week ? week : seasonData?.ApiWeek as number}-${year ? year : seasonData?.Season as number}`);
    setSlate(results as Slate);
    setPicks((prev) => ({ slateId: results?.uniqueWeek as string, picks: [...prev?.picks] }))
    return results;
  }, [setSlate, setPicks, seasonData?.ApiWeek, seasonData?.Season, setStatus]);
  
  const refreshSlatePicksStatus = useCallback(async ({ week, year }: { week?: number; year?: number }) => {
    const updatedSlate = await FBSlateClassInstance.updateSlateScores({ week: week ? week: seasonData?.ApiWeek as number, year: year ? year : seasonData?.Season as number })
    setSlate(updatedSlate as Slate)
  }, [setSlate, seasonData?.ApiWeek, seasonData?.Season]);

  const getUserPicks = useCallback(() => {
    const findPicks = user?.pickHistory?.find((p) => p.slateId === slate?.uniqueWeek);
    if (findPicks) {
      setPicks(findPicks);
    }
    return findPicks
  }, [user?.pickHistory, setPicks, slate?.uniqueWeek]);

  useEffect(() => {
    fetchSlate({ });
  }, [fetchSlate]);

  return (
    <PickContext.Provider value={{ slate, setSlate, picks, setPicks, addPick, fetchSlate, getUserPicks, refreshSlatePicksStatus }} >
      {children}
    </PickContext.Provider>
  )
}
export default Context;
export const usePickContext = () => useContext(PickContext);