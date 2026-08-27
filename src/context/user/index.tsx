import React, { Dispatch, PropsWithChildren, SetStateAction, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { UserCollectionData } from "../../model";
import { getAuth } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import FirebaseUsersClassInstance from "../../firebase/user/user";
import { LoadingState } from "../ui";
import { PickHistory } from "../../pages/Picks/PicksTable";
import { useGroupContext } from "../group";
import FirebaseGroupsInstance from "../../firebase/group/group";

export type UserValueProp = {
  user: UserCollectionData | null;
  setUser: Dispatch<React.SetStateAction<UserCollectionData | null>>;
  users: UserCollectionData[];
  setUsers: Dispatch<SetStateAction<UserCollectionData[]>>;
  fetchUsers: () => Promise<void>;
  /** Tracks `fetchUsers` only. Read-only to consumers. */
  usersStatus: keyof typeof LoadingState;
  isSlatePicker: boolean;
  allPickHistories: PickHistory[];
  userOverallRecord: { wins: number, losses: number };
}

export const AppContext = React.createContext({} as UserValueProp); //create the context API

//function body
const Context: React.FC<PropsWithChildren> = ({ children }: React.PropsWithChildren) => {

  const { activeGroupId, isSlatePicker } = useGroupContext();

  const [user, setUser] = useState<UserCollectionData | null>({} as UserCollectionData);
  const [users, setUsers] = useState<UserCollectionData[]>([]);
  const [usersPicks, setUsersPicks] = useState<PickHistory[]>([] as PickHistory[]);
  const [usersStatus, setUsersStatus] = useState<keyof typeof LoadingState>(LoadingState.IDLE);

  const userOverallRecord = useMemo(() => {
    return user?.record?.reduce<{ wins: number; losses: number }>((acc, cur) => {
      return {
        wins: acc.wins + cur.wins,
        losses: acc.losses + cur.losses
      }
    }, { wins: 0, losses: 0 }) ?? { wins: 0, losses: 0 }
  }, [user?.record]);

  // Owns `usersStatus`: this is the only writer, and it always lands on a
  // terminal value so consumers gating on it can't hang.
  const fetchUsers = useCallback(async () => {
    if (!activeGroupId) { setUsers([]); setUsersPicks([]); setUsersStatus(LoadingState.IDLE); return; }
    setUsersStatus(LoadingState.LOADING);
    try {
      // Group-scoped: only this group's members + their picks. Replaces the old
      // global getCollection('users') + collectionGroup('picks') that read everyone.
      const [members, allPickHistories] = await Promise.all([
        FirebaseGroupsInstance.getMembers(activeGroupId),
        FirebaseGroupsInstance.getAllPicks(activeGroupId),
      ]);
      const results = members.map((m) => ({
        ...m,
        // consumers (Leaderboard/Profile) expect `id`; the member doc keys on `uid`.
        id: m.uid,
        pickHistory: allPickHistories.filter((p) => p.userId === m.uid),
      })) as unknown as UserCollectionData[];
      setUsers(results);
      setUsersPicks(allPickHistories);
      setUsersStatus(LoadingState.IDLE);
    } catch (e) {
      console.error("Error fetching group members:", e);
      setUsersStatus(LoadingState.ERROR);
    }
  }, [activeGroupId]);

  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = getAuth(FirebaseUsersClassInstance.app).onAuthStateChanged((currUser) => {
      if (!!currUser) {
        FirebaseUsersClassInstance.getDocumentInCollection(currUser.uid).then((res) => {
          setUser(res ? { ...(res as UserCollectionData) } : null);
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
    const uid = user?.uid;
    if (!uid || !activeGroupId) return;
    Promise.all([
      FirebaseGroupsInstance.getMemberPicks(activeGroupId, uid),
      FirebaseGroupsInstance.getMember(activeGroupId, uid),
    ]).then(([picks, member]) => {
      setUser((prev) => prev ? {
        ...prev,
        pickHistory: picks,
        record: member?.record ?? [],
        trophyCase: member?.trophyCase ?? prev.trophyCase,
      } : prev);
    });
  }, [user?.uid, activeGroupId]);

  useEffect(() => {
    if (user?.uid) {
      fetchUsers();
    }
  }, [fetchUsers, user?.uid]);

  const value = useMemo<UserValueProp>(() => ({
    user,
    setUser,
    users,
    setUsers,
    fetchUsers,
    usersStatus,
    isSlatePicker,
    userOverallRecord,
    allPickHistories: usersPicks,
  }), [user, users, fetchUsers, usersStatus, isSlatePicker, userOverallRecord, usersPicks]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  )
}
export default Context;
export const useGlobalContext = (): UserValueProp => useContext(AppContext);