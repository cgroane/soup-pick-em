import React, { PropsWithChildren, useCallback, useEffect, useReducer } from "react";
import { getCurrentWeek } from "../../api/getGames";
import { SeasonDetailsData } from "../../api/schema/sportsDataIO";
import { initialUIState, LoadingState, UIState, UIStateContext } from "./ui-state";
import { UIDispatchActions, UIDispatchContext } from "./ui-dispatch";

export { LoadingState, SeasonTypes } from "./ui-state";

const uiReducer = (state: UIState, action: UIDispatchActions): UIState => {
  switch (action.type) {
    case "SET_MODAL":
      return { ...state, modalOpen: action.payload }
    case "SET_SEASON_CONTEXT":
      return { ...state, [action.payload.target]: action.payload.val }
    case "SET_SEASON_DATA":
      return { ...state, seasonData: action.payload }
    case "SET_STATUS":
      return { ...state, status: action.payload }
    default:
      return state;
  }
};

const UIProvider: React.FC<PropsWithChildren> = ({ children }: React.PropsWithChildren) => {
  const [state, dispatch] = useReducer(uiReducer, initialUIState);

  const getSeasonData = useCallback(async () => {
    try {
      const data: SeasonDetailsData = await getCurrentWeek() as SeasonDetailsData;
      const isOff = data.isOffseason;
      const offseasonAdjustment = isOff ? {
        Season: data.Season - 1,
        EndYear: data.EndYear - 1,
        ApiWeek: 1,
        Description: (parseInt(data.Description) - 1)?.toString(),
        seasonType: 'offseason' as const
      } : {};

      dispatch({
        type: 'SET_SEASON_DATA',
        payload: {
          ...data,
          ...offseasonAdjustment,
        }
      });
    } catch (e) {
      dispatch({ type: "SET_STATUS", payload: LoadingState.ERROR })
    }
  }, [dispatch]);

  useEffect(() => {
    getSeasonData()
  }, [getSeasonData]);


  return (
    <UIDispatchContext.Provider value={dispatch}>
      <UIStateContext.Provider value={state}>
        {children}
      </UIStateContext.Provider>
    </UIDispatchContext.Provider>
  )
};


export default UIProvider;