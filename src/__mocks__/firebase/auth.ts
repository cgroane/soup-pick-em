/**
 * Manual mock for the `firebase/auth` package.
 *
 * Both the auth context and the user context subscribe to `onAuthStateChanged`.
 * Tests drive that subscription with `__setAuthUser` / `__resetAuth` instead of
 * touching a real Firebase app.
 */
type AuthUser = { uid: string; email?: string | null; displayName?: string | null } | null;

let currentUser: AuthUser = null;
let listeners: ((u: AuthUser) => void)[] = [];

/** Push a new auth user (or null for signed-out) to every live subscriber. */
export const __setAuthUser = (u: AuthUser) => {
  currentUser = u;
  listeners.forEach((cb) => cb(u));
};

/** Clear subscribers and user between tests. */
export const __resetAuth = () => {
  currentUser = null;
  listeners = [];
};

export const getAuth = () => ({
  get currentUser() {
    return currentUser;
  },
  onAuthStateChanged: (cb: (u: AuthUser) => void) => {
    listeners.push(cb);
    // Firebase fires once with the current value on subscribe.
    cb(currentUser);
    return () => {
      listeners = listeners.filter((l) => l !== cb);
    };
  },
});

export class GoogleAuthProvider {}
export const signInWithPopup = jest.fn();
export const signInWithEmailAndPassword = jest.fn();
export const createUserWithEmailAndPassword = jest.fn();
export const signOut = jest.fn();
export const connectAuthEmulator = jest.fn();
