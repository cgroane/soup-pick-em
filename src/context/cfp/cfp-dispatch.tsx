import { createContext, Dispatch, useContext } from "react";
import { CFPBracket, Picks } from "../../model";

export type CFPActions = | { type: 'SET_BRACKET', payload: CFPBracket | null }
  | { type: 'SET_CFP_PICKS', payload: { slateId: string; picks: Picks[] } }
  | { type: 'ADD_CFP_PICK', payload: Picks }
  | { type: 'SET_REFRESHING', payload: boolean }
  | { type: 'SET_SAVING', payload: boolean }

export const CFPDispatchContext = createContext<Dispatch<CFPActions>>(() => { });

export const useCFPDispatchContext = () => useContext(CFPDispatchContext);
