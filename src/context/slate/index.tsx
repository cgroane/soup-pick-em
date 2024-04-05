
import React, { Dispatch, SetStateAction, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Matchup } from '../../model';
import { getGames } from '../../api/getGames';
import { LoadingState, useUIContext } from '../ui';
import { usePickContext } from '../pick';
import { useGlobalContext } from '../user';
import { UserRoles } from '../../utils/constants';

export type SlateValueProps = {
  games: Matchup[];
  selectedGames: Matchup[];
  filteredGames: Matchup[];
  setGames: Dispatch<SetStateAction<Matchup[]>>;
  setFilteredGames: Dispatch<SetStateAction<Matchup[]>>;
  setSelectedGames: Dispatch<SetStateAction<Matchup[]>>;
  addAndRemove: (game: Matchup) => void;
  fetchMatchups: ({ weekNumber, year, seasonType }: {weekNumber?: number; year?: number, seasonType: 'postseason' | 'regular'}) => void;
  deletions: number[];
  canEdit: boolean;
}

type ContextProp = {
  children: React.ReactNode
}

export const SlateContext = React.createContext({} as SlateValueProps); //create the context API

//function body
export default function CreateSlateContext({ children }: ContextProp) {

  const {
    slate
  } = usePickContext();
  const {
    setStatus
  } = useUIContext();
  const {
    user
  } = useGlobalContext()
  const [games, setGames] = useState<Matchup[]>([]);
  const [filteredGames, setFilteredGames] = useState<Matchup[]>([]);
  const [selectedGames, setSelectedGames] = useState<Matchup[]>([]);
  const [deletions, setDeletions] = useState<number[]>([])
  const { seasonData } = useUIContext();

  useEffect(() => {
    setSelectedGames(slate?.games ?? []);
  }, [slate, setSelectedGames])

  const canEdit = useMemo(() => {
    const today = new Date();
    const earliestGame = Date.parse(slate?.games?.sort((a, b) => Date.parse(a.startDate) - Date.parse(b.startDate))[0].startDate)
    const now = Date.parse(today.toDateString())
    const pastDate = now > earliestGame;
    return !!((!pastDate && user?.roles?.includes(UserRoles.SLATE_PICKER)) || user?.roles?.includes(UserRoles.ADMIN))
  }, [slate?.games, user?.roles])
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
  }, [setGames, seasonData?.ApiSeason, seasonData?.ApiWeek, setStatus]);
  

  const addAndRemove = useCallback((game: Matchup) => {
    /**
     * this runs either if updating or adding from scratch
     * need to differentiate between edit and new
     * on remove, if slate.games includes removed -- edit bc slate.games is the original from the api
     * otherwise it is new
     */
    const found = selectedGames.findIndex((selectedGame) => game.gameID === selectedGame.gameID);
    const dels = [...deletions];
    const newSelections = [...selectedGames];
    if (found >= 0) {
      newSelections.splice(found, 1);
      const deletedItem = slate?.games.find((g) => g.gameID === selectedGames[found].gameID)
      if (deletedItem) {
        dels.push(found);
        setDeletions(dels);
      }

    } else {
      const newGame = {
        id:                     game.id ?? 0,
        gameID:                 game.gameID ?? 0,
        season:                 game.season ?? 0,
        seasonType:             game.seasonType ?? 0,
        week:                   game.week ?? 0,
        startDate:              game.startDate ?? '',
        awayTeam:               game.awayTeam ?? '',
        homeTeam:               game.homeTeam ?? '',
        awayPoints:             game.awayPoints ?? 0,
        homePoints:             game.homePoints ?? 0,        
        pointSpread:            game.pointSpread ?? 0,
        attendance:             game.attendance ?? 0,
        awayTeamAPRanking:      game.awayTeamAPRanking ?? 0,
        homeTeamAPRanking:      game.homeTeamAPRanking ?? 0,
        awayTeamCFPRanking:     game.awayTeamCFPRanking ?? 0,
        homeTeamCFPRanking:     game.homeTeamCFPRanking ?? 0,
        awayTeamData:           game.awayTeamData,
        homeTeamData:           game.homeTeamData,
        theOddsId:              game.theOddsId ?? '',
        notes:                  game.notes ?? [],
        startTimeTbd:           game?.startTimeTbd ?? false,
        venueId:                game?.venueId ?? 0,
        venue:                  game?.venue ?? '',
        outcomes:               game.outcomes ?? [],
        neutralSite:            game.neutralSite ?? false,
        conferenceGame:         game.neutralSite ?? false,
        homeId:                 game.homeId ?? 0,
        homeConference:         game.homeConference ?? '',
        homeLineScores:         game.homeLineScores ?? [],
        homePostWinProb:        game.homePostWinProb ?? 0,
        homePregameElo:         game.homePregameElo ?? 0,
        homePostgameElo:        game.homePostgameElo ?? 0,
        awayId:                 game.awayId ?? 0,
        awayConference:         game.awayConference ?? '',
        awayLineScores:         game.awayLineScores ?? [],
        awayPostWinProb:        game.awayPostWinProb ?? 0,
        awayPregameElo:         game.awayPregameElo ?? 0,
        awayPostgameElo:        game.awayPostgameElo ?? 0,
        excitementIndex:        game.excitementIndex ?? 0,
        highlights:             game.highlights ?? []
      }
      newSelections.push(newGame as Matchup);
    }
    setSelectedGames(newSelections);
  }, [setSelectedGames, selectedGames, deletions, setDeletions, slate?.games]);

  return (
    <SlateContext.Provider value={{
      games,
      setGames,
      filteredGames,
      setFilteredGames,
      selectedGames,
      setSelectedGames,
      addAndRemove,
      fetchMatchups,
      deletions,
      canEdit
    }}>
      {children}
    </SlateContext.Provider>
  )
}

export const useSlateContext = ():SlateValueProps => {
  return useContext(SlateContext);
}