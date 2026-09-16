import React, { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useReducer } from "react";
import { UserCollectionData } from "../../model";
import { getAuth } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import FirebaseUsersClassInstance from "../../firebase/user/user";
import { LoadingState } from "../ui";
import { useGroupStateContext } from "../group/group-state";
import FirebaseGroupsInstance from "../../firebase/group/group";
import { UserActions, UserDispatchContext } from "./user-dispatch";
import { initialUserState, UserState, UserStateContext } from "./user-state";

export const userReducer = (state: UserState, action: UserActions): UserState => {
  switch (action.type) {
    case "SET_USER":
      return { ...state, user: action.payload };
    case "PATCH_USER":
      return state.user ? { ...state, user: { ...state.user, ...action.payload } } : state;
    case "SET_MEMBERS":
      return { ...state, users: action.payload.users, allPickHistories: action.payload.allPickHistories };
    case "SET_USERS_STATUS":
      return { ...state, usersStatus: action.payload };
    default:
      return state;
  }
};

export type UserProviderValue = {
  fetchUsers: () => Promise<void>;
};

export const UserContext = createContext({} as UserProviderValue);

const Context: React.FC<PropsWithChildren> = ({ children }: React.PropsWithChildren) => {
  const [state, dispatch] = useReducer(userReducer, initialUserState);
  const { activeGroupId } = useGroupStateContext();
  const uid = state.user?.uid;

  // Owns `usersStatus`: this is the only writer, and it always lands on a
  // terminal value so consumers gating on it can't hang.
  const fetchUsers = useCallback(async () => {
    if (!activeGroupId) {
      dispatch({ type: "SET_MEMBERS", payload: { users: [], allPickHistories: [] } });
      dispatch({ type: "SET_USERS_STATUS", payload: LoadingState.IDLE });
      return;
    }
    dispatch({ type: "SET_USERS_STATUS", payload: LoadingState.LOADING });
    try {
      // Group-scoped: only this group's members + their picks. Replaces the old
      // global getCollection('users') + collectionGroup('picks') that read everyone.
      const [members, allPickHistories] = await Promise.all([
        FirebaseGroupsInstance.getMembers(activeGroupId),
        FirebaseGroupsInstance.getAllPicks(activeGroupId),
      ]);
      const users = members.map((m) => ({
        ...m,
        // consumers (Leaderboard/Profile) expect `id`; the member doc keys on `uid`.
        id: m.uid,
        pickHistory: allPickHistories.filter((p) => p.userId === m.uid),
      })) as unknown as UserCollectionData[];
      dispatch({ type: "SET_MEMBERS", payload: { users, allPickHistories } });
      dispatch({ type: "SET_USERS_STATUS", payload: LoadingState.IDLE });
    } catch (e) {
      console.error("Error fetching group members:", e);
      dispatch({ type: "SET_USERS_STATUS", payload: LoadingState.ERROR });
    }
  }, [activeGroupId]);

  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = getAuth(FirebaseUsersClassInstance.app).onAuthStateChanged((currUser) => {
      if (!!currUser) {
        FirebaseUsersClassInstance.getDocumentInCollection(currUser.uid).then((res) => {
          dispatch({ type: "SET_USER", payload: res ? { ...(res as UserCollectionData) } : null });
        })
      } else {
        navigate('/');
      }
    });
    return unsubscribe;
  }, [navigate]);

  // The user's per-group state (picks, record, trophyCase) now lives on their
  // membership doc — load it for the active group whenever either changes.
  useEffect(() => {
    if (!uid || !activeGroupId) return;
    Promise.all([
      FirebaseGroupsInstance.getMemberPicks(activeGroupId, uid),
      FirebaseGroupsInstance.getMember(activeGroupId, uid),
    ]).then(([picks, member]) => {
      dispatch({
        type: "PATCH_USER",
        payload: {
          pickHistory: picks,
          record: member?.record ?? [],
          ...(member?.trophyCase ? { trophyCase: member.trophyCase } : {}),
        },
      });
    });
  }, [uid, activeGroupId]);

  useEffect(() => {
    if (uid) {
      fetchUsers();
    }
  }, [fetchUsers, uid]);

  const value = useMemo<UserProviderValue>(() => ({ fetchUsers }), [fetchUsers]);

  return (
    <UserContext.Provider value={value}>
      <UserDispatchContext.Provider value={dispatch}>
        <UserStateContext.Provider value={state}>
          {children}
        </UserStateContext.Provider>
      </UserDispatchContext.Provider>
    </UserContext.Provider>
  )
}
export default Context;
export const useUserContext = (): UserProviderValue => useContext(UserContext);
