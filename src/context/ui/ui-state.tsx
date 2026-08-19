import { SeasonDetailsData } from "api/schema/sportsDataIO";
import { createContext, useContext } from "react";

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

export type UIState = {
  modalOpen: boolean;
  seasonData?: SeasonDetailsData;
  status: keyof typeof LoadingState;
};

export const initialUIState: UIState = {
  modalOpen: false,
  seasonData: undefined,
  status: LoadingState.IDLE,
};

export const UIStateContext = createContext(initialUIState);

export const useUIStateContext = () => {
  const s = useContext(UIStateContext)
  return {
    ...s,
    usePostSeason: !!(s?.seasonData?.ApiSeason?.includes(SeasonTypes.POST)),
    useOffSeason: !!(s?.seasonData?.isOffseason)
  }
};
