import React, { Dispatch, PropsWithChildren, SetStateAction, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { UserCollectionData } from "../../model";
import { getAuth } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import FirebaseUsersClassInstance from "../../firebase/user/user";
import { UserRoles } from "../../utils/constants";
import { LoadingState, useUIContext } from "../ui";
import { PickHistory } from "../../pages/Picks/PicksTable";

export type UserValueProp = {
    user: UserCollectionData | null;
    setUser: Dispatch<React.SetStateAction<UserCollectionData | null>>;
    users: UserCollectionData[];
    setUsers: Dispatch<SetStateAction<UserCollectionData[]>>;
    fetchUsers: () => Promise<void>;
    isSlatePicker: boolean;
    allPickHistories: PickHistory[];
    userOverallRecord: {wins: number, losses: number};
}

export const AppContext = React.createContext({} as UserValueProp); //create the context API

//function body
const Context: React.FC<PropsWithChildren> = ({ children }: React.PropsWithChildren) => {

const {
  setStatus
} = useUIContext();

const [ user, setUser ] = useState<UserCollectionData | null>({} as UserCollectionData);
const [users, setUsers] = useState<UserCollectionData[]>([]);
const [ usersPicks, setUsersPicks ] = useState<PickHistory[]>([] as PickHistory[]);

const userOverallRecord = useMemo(() => {
  return user?.record?.reduce<{ wins: number; losses: number }>((acc, cur) => {
    return {
      wins: acc.wins + cur.wins,
      losses: acc.losses + cur.losses
    }
  }, { wins: 0, losses: 0 }) ?? { wins: 0, losses: 0 }
}, [user?.record]);
  
const fetchUsers = useCallback(async () => {
  setStatus(LoadingState.LOADING);
  const allPickHistories = await FirebaseUsersClassInstance.getSubCollection<PickHistory>('picks');
  const results = await FirebaseUsersClassInstance.getCollection<UserCollectionData>();
  results?.map((u) => u.pickHistory = allPickHistories.filter((p) => p.userId === u.uid))
  setUsers(results as UserCollectionData[]);
  setUsersPicks(allPickHistories)
}, [setUsers, setStatus, setUsersPicks]);

const navigate = useNavigate();

useEffect(() => {
  const unsubscribe = getAuth(FirebaseUsersClassInstance.app).onAuthStateChanged((currUser) => {
    if (!!currUser) {
      FirebaseUsersClassInstance.getDocumentInCollection(currUser.uid).then((res) => {
        /** get doc in colletion with extra path segment to get all picks */
        FirebaseUsersClassInstance.getCollection<PickHistory>([`${res?.id}`, 'picks']).then((completeRequest) => {
          if (res) {
            setUser({ ...res as Omit<UserCollectionData, 'pickHistory'>, pickHistory: completeRequest as PickHistory[] })
          } else {
            setUser(null);
          }
        });
      })
    } else {
      navigate('/');
    }
  });
  return unsubscribe;
}, [navigate]);

  useEffect(() => {
    if (user?.uid) {
      fetchUsers();
    }
  }, [fetchUsers, user?.uid]);

  const isSlatePicker = useMemo(() => {
    return !!user?.roles?.includes(UserRoles.SLATE_PICKER);
  }, [user?.roles])

  return (
    <AppContext.Provider value={{
      user,
      setUser,
      users,
      setUsers,
      fetchUsers,
      isSlatePicker,
      userOverallRecord,
      allPickHistories: usersPicks
    }}>
      {children}
    </AppContext.Provider>
  )
}
export default Context;
export const useGlobalContext = (): UserValueProp => useContext(AppContext);