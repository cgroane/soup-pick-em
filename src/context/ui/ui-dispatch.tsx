import { SeasonDetailsData } from "api/schema/sportsDataIO";
import { createContext, Dispatch, useContext } from "react";
import { LoadingState } from "./ui-state";

export type UIDispatchActions = | { type: 'SET_MODAL'; payload: boolean }
  | { type: 'SET_STATUS', payload: keyof typeof LoadingState }
  | { type: 'SET_SEASON_DATA', payload: SeasonDetailsData }
  | { type: 'SET_SEASON_CONTEXT', payload: { val: boolean, target: 'useOffSeason' | 'usePostSeason' } }

export const UIDispatchContext = createContext<Dispatch<UIDispatchActions>>(() => { });
export const useUIDispatchContext = () => useContext(UIDispatchContext);