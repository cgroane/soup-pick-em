import React, { useCallback, useContext, useEffect, useMemo, useReducer } from 'react';
import { getGames } from '../../api/getGames';
import { LoadingState } from '../ui';
import { GamesAPIResult, UserCollectionData } from '../../model';
import { usePickState } from 'context/pick/pick-state';
import { useUIStateContext } from 'context/ui/ui-state';
import { computeDeletions, initialSlateState, SlateState, SlateStateContext } from './slate-state';
import { SlateActions, SlateDispatchContext } from './slate-dispatch';
import { normalizeGame } from 'utils/normalizeGame';
import { useGroupStateContext } from 'context/group/group-state';
import FBSlateClassInstance from '../../firebase/slate/slate';
import { useUserStateContext } from 'context/user/user-state';
import { usePickContext } from 'context/pick';

export const slateReducer = (state: SlateState, action: SlateActions): SlateState => {
  switch (action.type) {
    case "SET_FILTER_TEXT":
      return { ...state, filterText: action.payload }
    case "SET_STATUS":
      return { ...state, status: action.payload }
    case "SET_GAMES":
      return { ...state, games: action.payload }
    case "SET_SELECTED_GAMES":
      return { ...state, selectedGames: action.payload }
    case "ADD_REMOVE": {
      const ind = state.selectedGames?.findIndex((g) => g.id === action.payload.id);
      return {
        ...state,
        selectedGames: ind >= 0 ? [...state.selectedGames.filter((_, idx) => ind !== idx)] : [...state.selectedGames, normalizeGame(action.payload)]
      }
    }
    default:
      return state
  }
}

export type SlateProviderValue = {
  fetchMatchups: (args: { weekNumber?: number; year?: number; seasonType: 'postseason' | 'regular' }) => Promise<GamesAPIResult[] | undefined>;
  submitSlate: (args: { week?: string; year?: string; seasonType: 'postseason' | 'regular' }) => Promise<void>;
};

export const SlateContext = React.createContext({} as SlateProviderValue); //create the context API

//function body
export default function CreateSlateContext({ children }: React.PropsWithChildren) {
  const [state, dispatch] = useReducer(slateReducer, initialSlateState);

  const {
    slate
  } = usePickState();
  const { fetchSlate } = usePickContext();
  const { seasonData } = useUIStateContext();
  const { activeGroupId } = useGroupStateContext();
  const { user, users, } = useUserStateContext();

  useEffect(() => {
    dispatch({ type: "SET_SELECTED_GAMES", payload: slate?.games ?? [] });
  }, [slate?.games, dispatch])
  /**
   * update fetchMatchups to accept a week param
   */
  const fetchMatchups = useCallback(async ({ weekNumber, seasonType, year }: { weekNumber?: number; year?: number; seasonType: 'postseason' | 'regular' }) => {
    dispatch({ type: "SET_STATUS", payload: LoadingState.LOADING });
    try {
      const week = weekNumber ? weekNumber?.toString() : seasonData?.ApiWeek ? seasonData.ApiWeek?.toString() : '1';
      const results = await getGames({
        weekNumber: week,
        season: year?.toString(),
        seasonType,
      })
      if (results?.length) {
        const filtered = seasonType === 'postseason'
          ? results.filter((g) => !(g.notes as string)?.includes('College Football Playoff'))
          : results;
        dispatch({ type: "SET_GAMES", payload: filtered.sort((a, b) => Date.parse(a?.startDate) - Date.parse(b?.startDate)) });
      }
      dispatch({ type: "SET_STATUS", payload: LoadingState.IDLE });
      return results;
    } catch (err) {
      dispatch({ type: "SET_STATUS", payload: LoadingState.ERROR });
      console.error(err);
      return;
    }
  }, [seasonData?.ApiWeek, dispatch]);

  const submitSlate = useCallback(async (selectedWeek: { week?: string; year?: string; seasonType: 'postseason' | 'regular' }) => {
    if (!activeGroupId) throw new Error('No active group');
    try {
      const uniqueId = `w${selectedWeek.week}-${selectedWeek.year}${selectedWeek?.seasonType === 'postseason' ? 'POST' : ''
        }`;
      const dels = computeDeletions(slate?.games, state.selectedGames);
      await FBSlateClassInstance.addSlate(
        activeGroupId,
        {
          week: parseInt(selectedWeek?.week as string),
          uniqueWeek: uniqueId,
          providedBy: user as UserCollectionData,
          processed: false,
          games: state.selectedGames,
        },
        users,
        dels?.length ? dels : undefined
      );
      await fetchSlate({ week: parseInt(selectedWeek.week as string), year: selectedWeek?.year, seasonType: selectedWeek.seasonType })
    } catch (err) {
      console.error(err);
      throw err;
    }
  }, [user, state.selectedGames, slate?.games, users, activeGroupId, fetchSlate]);

  const val = useMemo(() => ({
    fetchMatchups,
    submitSlate
  }), [fetchMatchups, submitSlate]);

  return (
    <SlateContext.Provider value={val}>
      <SlateDispatchContext.Provider value={dispatch}>
        <SlateStateContext.Provider value={state} >
          {children}
        </SlateStateContext.Provider>
      </SlateDispatchContext.Provider>
    </SlateContext.Provider>
  )
}

export const useSlateContext = () => {
  return useContext(SlateContext);
}