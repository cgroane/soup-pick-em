import { createContext, Dispatch, useContext } from "react";
import { AuthState } from "./auth-state";


export type AuthAction = | { type: 'SET_AUTH', payload: Partial<AuthState> }
  | { type: 'AUTH_PENDING' }
  | { type: 'AUTH_FAILED', payload: string };

export const AuthDispatchContext = createContext<Dispatch<AuthAction>>(() => { })
export const useAuthDispatch = () => useContext(AuthDispatchContext);