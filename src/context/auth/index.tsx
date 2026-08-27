import React, { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useReducer } from "react"
import { AuthAction, AuthDispatchContext } from "./auth-dispatch"
import { AuthState, AuthStateContext, initialAuthState, signedOutAuthState } from "./auth-state"
import { getAuth } from "firebase/auth"
import FirebaseUsersClassInstance from "../../firebase/user/user";
import { useNavigate } from "react-router-dom";

type AuthContextType = {
  signInWithGoogle: () => void;
  signIn: (email: string, password: string) => void;
  signOut: () => void;
}

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'SET_AUTH':
      return { ...state, ...action.payload, pending: false, error: undefined }
    case "AUTH_PENDING":
      return { ...state, pending: true, error: undefined }
    case "AUTH_FAILED":
      return { ...state, error: action.payload, pending: false }
    default:
      return state;
  }
}

export const AuthContext = createContext({} as AuthContextType);


const AuthContextProvider = ({ children }: PropsWithChildren) => {
  const [state, dispatch] = useReducer(authReducer, initialAuthState);
  const navigate = useNavigate();
  const navToProfile = useCallback(() => navigate("/profile"), [navigate]);

  useEffect(() => {
    const unSub = getAuth(FirebaseUsersClassInstance.app).onAuthStateChanged((cu) => {
      if (!cu) {
        dispatch({ type: "SET_AUTH", payload: signedOutAuthState })
        return;
      }
      dispatch({
        type: "SET_AUTH",
        payload: {
          status: 'authenticated',
          uid: cu.uid,
          email: cu.email ?? undefined,
          displayName: cu.displayName ?? undefined,
        }
      })
    });
    return unSub;
  }, []);

  // Both sign-in helpers THROW on failure. Their resolved value is the user's
  // Firestore doc, which is legitimately undefined on paths that only write it
  // (a first-time Google user goes through addDocument, which returns void), so
  // a falsy result must not be read as a failed login.
  const signIn = useCallback(async (email: string, password: string) => {
    dispatch({ type: "AUTH_PENDING" });
    try {
      await FirebaseUsersClassInstance.logInWithEmailAndPassword(email, password);
      navToProfile();
    } catch (e) {
      dispatch({
        type: "AUTH_FAILED",
        payload: String(e)
      })
    }
  }, [navToProfile]);

  const signInWithGoogle = useCallback(async () => {
    dispatch({ type: "AUTH_PENDING" });
    try {
      await FirebaseUsersClassInstance.loginWithGoogle();
      navToProfile();
    } catch (e) {
      dispatch({
        type: "AUTH_FAILED",
        payload: String(e)
      })
    }
  }, [navToProfile]);

  const signOut = useCallback(async () => {
    try {
      await FirebaseUsersClassInstance.logout();
      navigate("/");

    } catch (e) {
      dispatch({
        type: "AUTH_FAILED",
        payload: String(e)
      })
    }
  }, [navigate])

  const actions = useMemo(() => ({ signIn, signInWithGoogle, signOut }), [signIn, signInWithGoogle, signOut])

  return (
    <AuthContext.Provider value={actions}>
      <AuthDispatchContext.Provider value={dispatch}>
        <AuthStateContext.Provider value={state}>
          {children}
        </AuthStateContext.Provider>
      </AuthDispatchContext.Provider>
    </AuthContext.Provider>
  )
}

export default AuthContextProvider;
export const useAuthContext = () => useContext(AuthContext);