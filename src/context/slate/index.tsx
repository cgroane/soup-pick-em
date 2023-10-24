
import React, { Dispatch, SetStateAction, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Matchup } from '../../model';
import { getGames } from '../../api/getGames';
import { daysOfTheWeek, getWeek } from '../../utils/getWeek';

export type SlateValueProps = {
  games: Matchup[];
  selectedGames: Matchup[];
  filteredGames: Matchup[];
  setGames: Dispatch<SetStateAction<Matchup[]>>;
  setFilteredGames: Dispatch<SetStateAction<Matchup[]>>;
  setSelectedGames: Dispatch<SetStateAction<Matchup[]>>;
  addAndRemove: (game: Matchup) => void;
  loading: string;
  setLoading: Dispatch<SetStateAction<string>>;
}

type ContextProp = {
  children: React.ReactNode
}

export const SlateContext = React.createContext({} as SlateValueProps); //create the context API

//function body
export default function CreateSlateContext({ children }: ContextProp) {
  const [games, setGames] = useState<Matchup[]>([]);
  // const [textFilter, setTextFilter] = useState('');
  const [filteredGames, setFilteredGames] = useState<Matchup[]>([]);
  const [selectedGames, setSelectedGames] = useState<Matchup[]>([]);
  const [loading, setLoading] = useState('');

  const week = useMemo(() => getWeek().week, []);
  const fetchMatchups = useCallback(async () => {

    // const results = await getGames(getWeek() + 1);
    const results = await getGames(week);
    setGames(results);
    setFilteredGames(results);
  }, [setGames, week]);
  
  useEffect(() => {
    fetchMatchups();
  }, [fetchMatchups]);

  const addAndRemove = useCallback((game: Matchup) => {
    const found = selectedGames.findIndex((selectedGame) => game.gameID === selectedGame.gameID);
    
    const newSelections = [...selectedGames];
    if (found >= 0) {
      newSelections.splice(found, 1);
    } else {
      const newGame = {
        gameID:                game.gameID ?? 0,
        season:                game.season ?? 0,
        seasonType:            game.seasonType ?? 0,
        week:                  game.week ?? 0,
        status:                game.status ?? '',
        day:                   game.day ?? daysOfTheWeek[new Date().getDay()],
        dateTime:              game.dateTime ?? '',
        awayTeam:              game.awayTeam ?? '',
        homeTeam:              game.homeTeam ?? '',
        awayTeamID:            game.awayTeamID ?? 0,
        homeTeamID:            game.homeTeamID ?? 0,
        awayTeamName:          game.awayTeamName ?? '',
        homeTeamName:          game.homeTeamName ?? '',
        awayTeamScore:         game.awayTeamScore ?? 0,
        homeTeamScore:         game.homeTeamScore ?? 0,
        period:                game.period ?? '',
        timeRemainingMinutes:  game.timeRemainingMinutes ?? 0,
        timeRemainingSeconds:  game.timeRemainingSeconds ?? 0,
        pointSpread:           game.pointSpread ?? 0,
        overUnder:             game.overUnder ?? 0,
        awayTeamMoneyLine:     game.awayTeamMoneyLine ?? 0,
        homeTeamMoneyLine:     game.homeTeamMoneyLine ?? 0,
        updated:               game.day ?? daysOfTheWeek[new Date().getDay()],
        created:               game.day ?? daysOfTheWeek[new Date().getDay()],
        globalGameID:          game.globalGameID ?? 0,
        globalAwayTeamID:      game.globalAwayTeamID ?? 0,
        globalHomeTeamID:      game.globalHomeTeamID ?? 0,
        stadiumID:             game.stadiumID ?? 0,
        yardLine:              game.yardLine ?? 0,
        yardLineTerritory:     game.yardLineTerritory ?? '',
        down:                  game.down ?? 0,
        distance:              game.distance ?? 0,
        possession:            game.possession ?? '',
        isClosed:              false,
        gameEndDateTime:       game.day ?? daysOfTheWeek[new Date().getDay()],
        title:                 game.title ?? '',
        homeRotationNumber:    game.homeRotationNumber ?? 0,
        awayRotationNumber:    game.awayRotationNumber ?? 0,
        channel:               game.channel ?? '',
        neutralVenue:          game.neutralVenue ?? false,
        awayPointSpreadPayout: game.awayPointSpreadPayout ?? 0,
        homePointSpreadPayout: game.homePointSpreadPayout ?? 0,
        overPayout:            game.overPayout ?? 0,
        underPayout:           game.underPayout ?? 0,
        dateTimeUTC:           game.dateTimeUTC ?? '',
        attendance:            game.attendance ?? 0,
        stadium:               game.stadium ?? { 
          stadiumID: 0,
          active:    false,
          name:      '',
          dome:      false,
          city:      '',
          state:     '',
          geoLat:    0,
          geoLong:   0
         },
        periods:  game.periods ?? [{
          periodID:  0,
          gameID:    0,
          number:    0,
          name:       '',
          awayScore: 0,
          homeScore: 0,
        }],
        awayTeamAPRanking:    game.awayTeamAPRanking ?? 0,
        homeTeamAPRanking:    game.homeTeamAPRanking ?? 0,
        awayTeamCFPRanking:   game.awayTeamCFPRanking ?? 0,
        homeTeamCFPRanking:   game.homeTeamCFPRanking ?? 0,
        awayTeamData:          game.awayTeamData,
        homeTeamData:          game.homeTeamData,
        theOddsId:             game.theOddsId ?? '',
        outcomes: game.outcomes ?? []
      }
      newSelections.push(newGame as Matchup);
    }
    setSelectedGames(newSelections);
  }, [setSelectedGames, selectedGames]);

  return (
    <SlateContext.Provider value={{
      games,
      setGames,
      filteredGames,
      setFilteredGames,
      selectedGames,
      setSelectedGames,
      addAndRemove,
      loading,
      setLoading
    }}>
      {children}
    </SlateContext.Provider>
  )
}

export const useSlateContext = ():SlateValueProps => {
    return useContext(SlateContext);
}