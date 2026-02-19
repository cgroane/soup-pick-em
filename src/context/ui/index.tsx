import React, { Dispatch, SetStateAction, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getCurrentWeek } from "../../api/getGames";
import { SeasonDetailsData } from "../../api/schema/sportsDataIO";


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
  useOffSeason: boolean;
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

  const usePostSeason = useMemo(() => {
    return !!(seasonData?.ApiSeason?.includes(SeasonTypes.POST))
  }, [seasonData?.ApiSeason]);

  const useOffSeason = useMemo(() => !!seasonData?.isOffseason, [seasonData?.isOffseason]);

  const getSeasonData = useCallback(async () => {
    const data: SeasonDetailsData = await getCurrentWeek() as SeasonDetailsData;
    const isOff = data.isOffseason;
    const offseasonAdjustment = isOff ? {
      Season: data.Season - 1,
      EndYear: data.EndYear - 1,
      ApiWeek: 1,
      Description: (parseInt(data.Description) - 1)?.toString(),
      seasonType: 'offseason' as const
    } : {};

    setSeasonData({
      ...data,
      ...offseasonAdjustment,
    });
  }, [setSeasonData]);

  useEffect(() => {
    getSeasonData()
  }, [getSeasonData]);



  return (
    <UiContext.Provider value={{ modalOpen, setModalOpen, seasonData, status, setStatus, usePostSeason, useOffSeason }}>
      {children}
    </UiContext.Provider>
  )
}

export const useUIContext = (): UIValueProp => {
  return useContext(UiContext);
}