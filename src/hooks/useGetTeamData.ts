import { useMemo } from "react";
import { daysOfTheWeek, months } from "../utils/getWeek";
import { GamesAPIResult } from "../model";


export const useGetTeamData = (game: GamesAPIResult) => {
  const dateTime = useMemo(() => {
    const converted = new Date(game.startDate)
    return {
      dayOfTheWeek: daysOfTheWeek[converted.getDay()],
      minutes: converted.getMinutes().toLocaleString('en-US', {
        minimumIntegerDigits: 2
      }),
      hours: converted.getHours() > 12 ? converted.getHours() - 12 : converted.getHours(),
      amPm: converted.getHours() > 12 ? 'P.M.' : 'A.M.',
      dayOfTheMonth: converted.getDate(),
      year: converted.getFullYear(),
      month: months[converted.getMonth()]
    }
  }, [game.startDate]);

  // `homeTeamData`/`awayTeamData` are typed as required but arrive unvalidated
  // from the CFBD matchups response, so a malformed game must not crash render.
  const rankings = useMemo(() => {
    return {
      awayRank: game.awayTeamData?.playoffRank ? game.awayTeamData.playoffRank : game.awayTeamData?.apRank,
      homeRank: game.homeTeamData?.playoffRank ? game.homeTeamData.playoffRank : game.homeTeamData?.apRank,
    }
  }, [game.awayTeamData, game.homeTeamData]);
  return {
    rankings,
    dateTime
  }
}