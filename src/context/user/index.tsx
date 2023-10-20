import React, { useContext, useEffect, useState } from "react";
import { UserCollectionData } from "../../model";
import { getAuth } from "firebase/auth";
import { app } from "../../firebase";
import { getUserCollectionData } from "../../firebase/user/users";
import { useNavigate } from "react-router-dom";

type ValueProp = {
    user: UserCollectionData | null;
    setUser: React.Dispatch<React.SetStateAction<UserCollectionData | null>>;
}

type ContextProp = {
    children: React.ReactNode
} 

export const AppContext = React.createContext({} as ValueProp); //create the context API

//function body
export default function Context({ children }: ContextProp) {

const [ user, setUser ] = useState<UserCollectionData | null>({} as UserCollectionData);
const navigate = useNavigate();

useEffect(() => {
  const unsubscribe = getAuth(app).onAuthStateChanged((currUser) => {
    if (!!currUser) {
      getUserCollectionData(currUser.uid).then((res) => {
        if (res?.user) {
          setUser(res?.user as UserCollectionData)
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
    <AppContext.Provider value={{user, setUser}}>
      {children}
    </AppContext.Provider>
  )
}

export const useGlobalContext = ():ValueProp => {
    return useContext(AppContext);
}