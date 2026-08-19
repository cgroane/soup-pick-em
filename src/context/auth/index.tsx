import React, { createContext, PropsWithChildren, useCallback, useEffect, useMemo, useReducer } from "react"
import { AuthAction, AuthDispatchContext } from "./auth-dispatch"
import { AuthState, AuthStateContext, initialAuthState } from "./auth-state"
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
      return { ...state }
    case "AUTH_FAILED":
      return { ...state, error: action.payload, pending: false }
    default:
      return state;
  }
}

const AuthContext = createContext({} as AuthContextType);


const AuthContextProvider = ({ children }: PropsWithChildren) => {
  const [state, dispatch] = useReducer(authReducer, initialAuthState);
  const navigate = useNavigate();
  const navToProfile = useCallback(() => navigate("/profile"), [navigate]);

  useEffect(() => {
    const unSub = getAuth(FirebaseUsersClassInstance.app).onAuthStateChanged((cu) => {
      if (!cu) {
        dispatch({ type: "SET_AUTH", payload: { status: "unauthenticated" } })
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
  }, [navToProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    dispatch({ type: "AUTH_PENDING" });
    try {
      const res = await FirebaseUsersClassInstance.logInWithEmailAndPassword(email, password);
      if (res) navToProfile();
    } catch (e) {
      dispatch({
        type: "AUTH_FAILED",
        payload: String(e)
      })
    }
  }, [navToProfile]);

  const signInWithGoogle = useCallback(async () => {
    try {
      dispatch({ type: "AUTH_PENDING" });
      const res = await FirebaseUsersClassInstance.loginWithGoogle();
      if (res) navToProfile();
      else {
        dispatch({ type: "AUTH_FAILED", payload: 'Failed to login' })
        navigate('/');
      }
    } catch (e) {
      dispatch({
        type: "AUTH_FAILED",
        payload: String(e)
      })
    }
  }, [navigate, navToProfile]);

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