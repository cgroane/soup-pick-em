import { useMemo } from "react";
import { Matchup } from "../model";
import { daysOfTheWeek, months } from "../utils/getWeek";


export const useGetTeamData = (game: Matchup) => {
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
      month: months[converted.getMonth() - 1]
    }
  }, [game.startDate]);

  const rankings = useMemo(() => {
    return {
      awayRank: game.awayTeamData.playoffRank ? game.awayTeamData.playoffRank : game.awayTeamData.apRank,
      homeRank: game.homeTeamData.playoffRank ? game.homeTeamData.playoffRank : game.homeTeamData.apRank,
    }
  }, [game.awayTeamData, game.homeTeamData]);
  return {
    rankings,
    dateTime
  }
}