import { Dispatch, SetStateAction, createContext, useCallback, useContext, useState } from "react";
import { Picks, Slate } from "../../model"
import { getSlate } from "../../firebase/slate";
import { getWeek } from "../../utils/getWeek";
import { useGlobalContext } from "../user";

export type PickValueProp = {
  slate: Slate;
  picks: { slateId: string; picks: Picks[] };
  setSlate: Dispatch<SetStateAction<Slate>>;
  setPicks: Dispatch<SetStateAction< { slateId: string; picks: Picks[] }>>;
  addPick: (pick: Picks) => void;
  fetchSlate: () => void;
  getUserPicks: () => void;
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
  
  const addPick = useCallback((pick: Picks) => {
    const findPick = picks.picks.find((p) => {
      return pick.matchup === p.matchup;
    })
    if (findPick) {
      return;
    } else {
      setPicks((prev) => ({
        ...prev,
        picks: [
        ...prev.picks,
        pick
      ]}))
    }
  }, [picks]);

  const fetchSlate = useCallback( async () => {
    const results = await getSlate(getWeek().week);
    setSlate(results as Slate);
    setPicks((prev) => ({ slateId: results?.uniqueWeek as string, picks: [...prev.picks] }))
  }, [setSlate, setPicks]);

  const getUserPicks = useCallback(async () => {
    const findPicks = user?.pickHistory?.find((p) => p.slateId === slate.uniqueWeek);
    if (findPicks) {
      setPicks(findPicks);
    }
  }, [user?.pickHistory, setPicks, slate.uniqueWeek]);

  return (
    <PickContext.Provider value={{ slate, setSlate, picks, setPicks, addPick, fetchSlate, getUserPicks }} >
      {children}
    </PickContext.Provider>
  )
}
export default Context;
export const usePickContext = () => useContext(PickContext);