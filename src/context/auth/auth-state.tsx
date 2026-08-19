import { createContext, useContext } from "react";

export type AuthStatus = 'initializing' | 'authenticated' | 'unauthenticated';
export type AuthState = {
  status: AuthStatus;
  uid?: string;
  email?: string;
  displayName?: string;
  pending?: boolean;
  error?: string;
};

export const initialAuthState: AuthState = {
  status: 'initializing',
}

export const AuthStateContext = createContext(initialAuthState);
export const useAuthStateContext = () => {
  const s = useContext(AuthStateContext);
  return { ...s, isAuthenticated: s.status === 'authenticated' };
};
