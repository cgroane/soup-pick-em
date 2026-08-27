import React, { Dispatch, useContext } from "react";
import { Picks, Slate } from "../../model";
import { LoadingState } from "context/ui";

export type PickAction = |
{ type: 'SET_SLATE'; payload: Slate } |
{ type: 'SET_STATUS'; payload: LoadingState } |
{ type: 'SET_PICKS'; payload: { slateId: string; picks: Picks[] } } |
{ type: 'ADD_PICK'; payload: Picks } |
{ type: 'SET_WEEK'; payload: { week: number; year: number; seasonType: "regular" | "postseason" } };

export const PickDispatchContext = React.createContext<Dispatch<PickAction>>(() => { });
export const usePickDispatch = () => useContext(PickDispatchContext);
