import React, { Dispatch, SetStateAction, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getCurrentWeek } from "../../api/getGames";
import { SeasonDetails, SeasonDetailsData } from "../../api/schema/sportsDataIO";


export enum LoadingState {
  IDLE = 'IDLE',
  ERROR = 'ERROR',
  LOADING = 'LOADING',
};

export enum SeasonTypes {
  POST = 'POST',
  REGULAR = 'REGULAR',
  OFF = 'OFF',
  PRE = 'PRE'
}

export type UIValueProp = {
  modalOpen: boolean;
  setModalOpen: Dispatch<SetStateAction<boolean>>;
  seasonData?: SeasonDetailsData;
  status: keyof typeof LoadingState;
  setStatus: Dispatch<SetStateAction<keyof typeof LoadingState>>;
  usePostSeason: boolean;
}

type ContextProp = {
  children: React.ReactNode
} 

export const UiContext = React.createContext({} as UIValueProp); //create the context API

//function body
export default function Context({ children }: ContextProp) {
const [seasonData, setSeasonData] = useState<SeasonDetailsData | undefined>({} as SeasonDetailsData);
const [status, setStatus] = useState<keyof typeof LoadingState>(LoadingState.IDLE);
const [modalOpen, setModalOpen] = useState(false);

/**
 * is there a better way to force historical? 
 * this gets called twice on app load, maybe 3 times.
 */
const getSeasonData = useCallback(async () => {
  const data: SeasonDetailsData = await getCurrentWeek() as SeasonDetailsData;
  /**
   * MOCK
   */
  const usePost = !!(data?.ApiSeason?.includes(SeasonTypes.POST) || data?.ApiSeason?.includes(SeasonTypes.OFF));
  if (process.env.REACT_APP_SEASON_KEY === 'offseason') {
    setSeasonData({
      ...data,
      Season: data.Season - 1,
      EndYear: data.EndYear - 1,
      ApiWeek: 1,
      Description: (parseInt(data.Description) - 1).toString(),
      seasonType: usePost ? 'postseason' : 'regular'
    })
  } else {
    setSeasonData({
      ...data,
      seasonType: usePostSeason ? 'postseason' : 'regular'
    })
  }
}, [setSeasonData]);

useEffect(() => {
  getSeasonData()
}, [getSeasonData]);

const usePostSeason = useMemo(() => {
  return !!(seasonData?.ApiSeason?.includes(SeasonTypes.POST) || seasonData?.ApiSeason?.includes(SeasonTypes.OFF))
}, [seasonData?.ApiSeason]);

  return (
    <UiContext.Provider value={{ modalOpen, setModalOpen, seasonData, status, setStatus, usePostSeason }}>
      {children}
    </UiContext.Provider>
  )
}

export const useUIContext = ():UIValueProp => {
    return useContext(UiContext);
}