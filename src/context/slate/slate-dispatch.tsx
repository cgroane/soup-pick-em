import { LoadingState } from "context/ui";
import { GamesAPIResult } from "model";
import { createContext, Dispatch, useContext } from "react";

export type SlateActions = | { type: "SET_GAMES", payload: GamesAPIResult[] }
  | { type: "SET_FILTER_TEXT", payload: string }
  | { type: "SET_SELECTED_GAMES", payload: GamesAPIResult[] }
  | { type: "ADD_REMOVE", payload: GamesAPIResult }
  | { type: "SET_STATUS", payload: keyof typeof LoadingState }

export const SlateDispatchContext = createContext<Dispatch<SlateActions>>(() => { });

export const useSlateDispatchContext = () => useContext(SlateDispatchContext);