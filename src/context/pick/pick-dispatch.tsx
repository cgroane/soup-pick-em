import React, { Dispatch, SetStateAction, useContext } from "react";
import { Picks, Slate } from "../../model";
import { PickHistory } from "../../pages/Picks/PicksTable";
import { LoadingState } from "context/ui";

export type PickDispatch = {
  setSlate: Dispatch<SetStateAction<Slate>>;
  setPicks: Dispatch<SetStateAction<{ slateId: string; picks: Picks[] }>>;
  addPick: (pick: Picks) => void;
  getUserPicks: () => PickHistory | undefined;
  refreshSlatePicksStatus: ({ week, year }: { week?: number; year?: number }) => void;
  setWeek: Dispatch<SetStateAction<{ week: number; year: number; seasonType: "regular" | "postseason" }>>;
  setStatus: Dispatch<SetStateAction<LoadingState>>;
}
export type PickAction = |
{ type: 'SET_SLATE'; payload: Slate } |
{ type: 'SET_STATUS'; payload: LoadingState } |
{ type: 'SET_PICKS'; payload: { slateId: string; picks: Picks[] } } |
{ type: 'ADD_PICK'; payload: Picks } |
{ type: 'REFRESH_SLATE_PICKS_STATUS'; payload: { week?: number; year?: number } } |
{ type: 'SET_WEEK'; payload: { week: number; year: number; seasonType: "regular" | "postseason" } };

export const PickDispatchContext = React.createContext<Dispatch<PickAction>>(() => { });
export const usePickDispatch = () => useContext(PickDispatchContext);