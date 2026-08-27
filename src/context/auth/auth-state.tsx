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

/** Everything identity-shaped, cleared. `SET_AUTH` spreads onto prior state, so
 *  signing out has to blank these explicitly or the last user's uid/email survive. */
export const signedOutAuthState: AuthState = {
  status: 'unauthenticated',
  uid: undefined,
  email: undefined,
  displayName: undefined,
  pending: false,
  error: undefined,
}

export const AuthStateContext = createContext(initialAuthState);
export const useAuthStateContext = () => {
  const s = useContext(AuthStateContext);
  return { ...s, isAuthenticated: s.status === 'authenticated' };
};
