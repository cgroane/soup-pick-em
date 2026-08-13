import React, { useContext } from "react";
import { Picks, Slate } from "../../model";
import { LoadingState } from "context/ui";

export type PicksState = {
  slate: Slate;
  picks: { slateId: string; picks: Picks[] };
  week?: number;
  year?: number;
  seasonType: 'regular' | 'postseason';
  status: LoadingState;
}

export const initialPickState: PicksState = {
  slate: {} as Slate,
  picks: { slateId: '', picks: [] },
  seasonType: 'regular',
  status: LoadingState.IDLE,
  week: 1,
  year: 2026
};

export const PickStateContext = React.createContext(initialPickState);

export const usePickState = () => useContext(PickStateContext);