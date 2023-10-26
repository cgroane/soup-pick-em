import React, { Dispatch, PropsWithChildren, SetStateAction, useCallback, useContext, useEffect, useState } from "react";
import { UserCollectionData } from "../../model";
import { getAuth } from "firebase/auth";
import { app } from "../../firebase";
import { useNavigate } from "react-router-dom";
import { getAllUsers, getUserCollectionData } from "../../firebase/user/get";

export type UserValueProp = {
    user: UserCollectionData | null;
    setUser: Dispatch<React.SetStateAction<UserCollectionData | null>>;
    users: UserCollectionData[];
    setUsers: Dispatch<SetStateAction<UserCollectionData[]>>;
    fetchUsers: () => void;
}


export const AppContext = React.createContext({} as UserValueProp); //create the context API

//function body
const Context: React.FC<PropsWithChildren> = ({ children }: React.PropsWithChildren) => {

const [ user, setUser ] = useState<UserCollectionData | null>({} as UserCollectionData);
const [users, setUsers] = useState<UserCollectionData[]>([]);
  
const fetchUsers = useCallback(async () => {
  const results = await getAllUsers();
  setUsers(results as UserCollectionData[]);
}, [setUsers]);

const navigate = useNavigate();

useEffect(() => {
  const unsubscribe = getAuth(app).onAuthStateChanged((currUser) => {
    if (!!currUser) {
      getUserCollectionData(currUser.uid).then((res) => {
        if (res) {
          setUser(res as UserCollectionData)
        } else {
          setUser(null);
        }
      })
    } else {
      navigate('/login');
    }
  });
  return unsubscribe;
}, [navigate]);



  return (
    <AppContext.Provider value={{
      user,
      setUser,
      users,
      setUsers,
      fetchUsers
    }}>
      {children}
    </AppContext.Provider>
  )
}
export default Context;
export const useGlobalContext = (): UserValueProp => useContext(AppContext);