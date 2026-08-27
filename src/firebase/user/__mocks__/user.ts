/** Manual mock — the real module imports src/firebase/index.ts, which JSON.parses
 *  REACT_APP_FIREBASE_CONFIG and calls getAnalytics() at import time. Neither works
 *  under jsdom, so tests opt in with `jest.mock('.../firebase/user/user')`. */
const FirebaseUsersClassInstance = {
  app: { name: 'test-app' },
  getDocumentInCollection: jest.fn(async () => undefined),
  logInWithEmailAndPassword: jest.fn(async () => undefined),
  registerWithEmailAndPassword: jest.fn(async () => undefined),
  loginWithGoogle: jest.fn(async () => undefined),
  logout: jest.fn(async () => undefined),
};

export default FirebaseUsersClassInstance;
