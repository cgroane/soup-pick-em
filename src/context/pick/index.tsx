import { Dispatch, SetStateAction, createContext, useCallback, useContext, useEffect, useState } from "react";
import { Picks, Slate } from "../../model"
import { getSlate } from "../../firebase/slate";
import { getWeek } from "../../utils/getWeek";

export type PickValueProp = {
  slate: Slate;
  picks: Picks[];
  setSlate: Dispatch<SetStateAction<Slate>>;
  setPicks: Dispatch<SetStateAction<Picks[]>>;
  addPick: (pick: Picks) => void;
}

type ContextProp = {
  children: React.ReactNode
}

export const PickContext = createContext({} as PickValueProp);

const Context = ({
  children
}: ContextProp) => {
  const [slate, setSlate] = useState({} as Slate);
  const [picks, setPicks] = useState([] as Picks[]);
  
  const addPick = useCallback((pick: Picks) => {
    const findPick = picks.find((p) => {
      return pick.matchup === p.matchup;
    })
    if (findPick) {
      return;
    } else {
      setPicks((prev) => ([
        ...prev,
        pick
      ]))
    }
  }, [picks]);

  const fetchSlate = useCallback( async () => {
    const results = await getSlate(getWeek().week);
    setSlate(results as Slate);
  }, [setSlate]);
  useEffect(() => {
    fetchSlate()
  }, [fetchSlate]);

  return (
    <PickContext.Provider value={{ slate, setSlate, picks, setPicks, addPick }} >
      {children}
    </PickContext.Provider>
  )
}
export default Context;
export const usePickContext = () => useContext(PickContext);