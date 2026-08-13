import React, { createContext, useCallback, useContext, useReducer, useRef } from "react";
import { Slate } from "../../model"
import { useGlobalContext } from "../user";
import FirebaseGroupsInstance from "../../firebase/group/group";
import { useGroupContext } from "../group";
import { LoadingState, useUIContext } from "../ui";
import { PickHistory } from "../../pages/Picks/PicksTable";
import { initialPickState, PicksState, PickStateContext } from "./pick-state";
import { PickAction, PickDispatchContext } from "./pick-dispatch";

/**
 * TODO
 * fetchSlate may need to accept a parameter for week number with current week default
 */

const pickReducer = (state: PicksState, action: PickAction): PicksState => {
  switch (action.type) {
    case 'SET_STATUS':
      return { ...state, status: action.payload };
    case 'SET_SLATE': {
      const uniqueWeek = action?.payload?.uniqueWeek ?? '';
      if (state.picks.slateId === uniqueWeek) return { ...state, slate: action.payload }
      return { ...state, slate: action.payload, picks: { slateId: uniqueWeek, picks: [] } };
    }
    case 'SET_PICKS':
      return { ...state, picks: action.payload };
    case 'ADD_PICK': {
      const i = state.picks.picks.findIndex((p) => p.matchup ===
        action.payload.matchup);
      if (i < 0) {
        return {
          ...state, picks: {
            ...state.picks, picks: [...state.picks.picks,
            action.payload]
          }
        };
      }
      if (JSON.stringify(state.picks.picks[i]) === JSON.stringify(action.payload))
        return state;
      const next = [...state.picks.picks];
      next[i] = action.payload;
      return { ...state, picks: { ...state.picks, picks: next } };
    }
    case "SET_WEEK":
      return { ...state, week: action.payload.week, year: action.payload.year, seasonType: action.payload.seasonType };
    default:
      return state;
  }
};

export type PickValueProp = {
  fetchSlate: ({ week, year, seasonType }: { week?: number; year?: string; seasonType: 'regular' | 'postseason' }) => Promise<Slate | undefined>;
  getUserPicks: () => PickHistory | undefined;
}

export const PickContext = createContext({} as PickValueProp);

const PickProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, dispatch] = useReducer(pickReducer, initialPickState);
  const { user } = useGlobalContext();
  const { activeGroupId } = useGroupContext();
  const { usePostSeason } = useUIContext();

  const getUserPicks = useCallback(() => {
    if (!user?.pickHistory || !state.slate?.uniqueWeek) return;
    const picks = user.pickHistory.find((p) => p.slateId === state.slate?.uniqueWeek);
    if (!picks) return;
    dispatch({ type: 'SET_PICKS', payload: picks });
    return picks;
  }, [user?.pickHistory, state.slate?.uniqueWeek]);
  const reqId = useRef(0);

  const fetchSlate = useCallback(async ({ week, year, seasonType }: { week?: number; year?: string; seasonType: 'regular' | 'postseason' }) => {
    if (!activeGroupId || !week || !year) return;
    const id = ++reqId.current;
    dispatch({ type: 'SET_STATUS', payload: LoadingState.LOADING });
    try {
      const slateId = `w${week}-${seasonType === 'regular' ? year : `${year}POST`}`;
      const slate = await FirebaseGroupsInstance.getSlate(activeGroupId, slateId);
      if (id !== reqId.current) return;
      dispatch({ type: 'SET_SLATE', payload: slate as Slate });
      dispatch({ type: 'SET_STATUS', payload: LoadingState.IDLE });
      return slate;
    } catch (error) {
      console.error("Error fetching slate:", error);
      dispatch({ type: 'SET_STATUS', payload: LoadingState.IDLE });
      return;
    }
  }, [activeGroupId, usePostSeason]);
  return (
    <PickContext.Provider value={{
      fetchSlate,
      getUserPicks,
    }}>
      <PickDispatchContext.Provider value={dispatch}>
        <PickStateContext.Provider value={state}>
          {children}
        </PickStateContext.Provider>
      </PickDispatchContext.Provider>
    </PickContext.Provider>
  )
}
export const usePickContext = (): PickValueProp => useContext(PickContext);
export default PickProvider;