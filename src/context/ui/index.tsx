import React, { Dispatch, SetStateAction, useContext, useState } from "react";

export type UIValueProp = {
  modalOpen: boolean;
  setModalOpen: Dispatch<SetStateAction<boolean>>;
}

type ContextProp = {
    children: React.ReactNode
} 

export const UiContext = React.createContext({} as UIValueProp); //create the context API

//function body
export default function Context({ children }: ContextProp) {

const [modalOpen, setModalOpen] = useState(false);


  return (
    <UiContext.Provider value={{ modalOpen, setModalOpen}}>
      {children}
    </UiContext.Provider>
  )
}

export const useUIContext = ():UIValueProp => {
    return useContext(UiContext);
}