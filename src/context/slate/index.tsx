
import React, { Dispatch, SetStateAction, useCallback, useContext, useMemo, useState } from 'react';
import { Matchup } from '../../model';
import { getGames } from '../../api/getGames';
import { LoadingState, useUIContext } from '../ui';
import { useGlobalContext } from '../user';
import { UserRoles } from '../../utils/constants';

export type SlateValueProps = {
  games: Matchup[];
  filteredGames: Matchup[];
  setGames: Dispatch<SetStateAction<Matchup[]>>;
  setFilteredGames: Dispatch<SetStateAction<Matchup[]>>;
  fetchMatchups: ({ weekNumber, year, seasonType }: {weekNumber?: number; year?: number, seasonType: 'postseason' | 'regular'}) => void;
  canEdit: boolean;
}

type ContextProp = {
  children: React.ReactNode
}

export const SlateContext = React.createContext({} as SlateValueProps); //create the context API

//function body
export default function CreateSlateContext({ children }: ContextProp) {
  const {
    setStatus
  } = useUIContext();
  const {
    user
  } = useGlobalContext();
  const [games, setGames] = useState<Matchup[]>([]);
  const [filteredGames, setFilteredGames] = useState<Matchup[]>([]);
  
  const { seasonData } = useUIContext();


  const canEdit = useMemo(() => {
    const today = new Date();
    const earliestGame = Date.parse(games?.sort((a, b) => Date.parse(a?.startDate) - Date.parse(b?.startDate))[0]?.startDate)
    const now = Date.parse(today.toDateString())
    const pastDate = now > earliestGame;
    return !!((!pastDate && user?.roles?.includes(UserRoles.SLATE_PICKER)) || user?.roles?.includes(UserRoles.ADMIN))
  }, [games, user?.roles])
  /**
   * update fetchMatchups to accept a week param
   */
  const fetchMatchups = useCallback(async ({ weekNumber, year, seasonType }: {weekNumber?: number; year?: number; seasonType: 'postseason' | 'regular'}) => {
    setStatus(LoadingState.LOADING);
    const week = weekNumber ? weekNumber.toString() : seasonData?.ApiWeek ? seasonData.ApiWeek?.toString() : '1';
    const results = (await getGames({
      weekNumber: week,
      season: seasonData?.Season.toString(),
      seasonType
    }))?.sort((a, b) => Date.parse(a?.startDate) - Date.parse(b?.startDate));
    setGames(results);
    setFilteredGames(results);
    return results;
  }, [setGames, seasonData?.ApiWeek, setStatus, seasonData?.Season]);

  return (
    <SlateContext.Provider value={{
      games,
      setGames,
      filteredGames,
      setFilteredGames,
      fetchMatchups,
      canEdit
    }}>
      {children}
    </SlateContext.Provider>
  )
}

export const useSlateContext = ():SlateValueProps => {
  return useContext(SlateContext);
}