import React, { Dispatch, SetStateAction, useCallback, useContext, useEffect, useState } from "react";
import { getCurrentWeek } from "../../api/getGames";
import { SeasonDetails } from "../../api/schema/sportsDataIO";

export type UIValueProp = {
  modalOpen: boolean;
  setModalOpen: Dispatch<SetStateAction<boolean>>;
  seasonData: SeasonDetails;
}

type ContextProp = {
  children: React.ReactNode
} 

export const UiContext = React.createContext({} as UIValueProp); //create the context API

//function body
export default function Context({ children }: ContextProp) {
const [seasonData, setSeasonData] = useState<SeasonDetails>({} as SeasonDetails);
/**
 * is there a better way to force historical? 
 */
const getSeasonData = useCallback(async () => {
  const data = await getCurrentWeek();
  if (data?.ApiSeason.includes('OFF')) {
    setSeasonData({
      ...data,
      ApiSeason: (data.Season - 1).toString(),
      Season: data.Season - 1,
      EndYear: data.EndYear - 1,
      Description: (parseInt(data.Description) - 1).toString()
    })
  }
}, [setSeasonData])
useEffect(() => {
  getSeasonData()

}, [getSeasonData])
const [modalOpen, setModalOpen] = useState(false);


  return (
    <UiContext.Provider value={{ modalOpen, setModalOpen, seasonData }}>
      {children}
    </UiContext.Provider>
  )
}

export const useUIContext = ():UIValueProp => {
    return useContext(UiContext);
}