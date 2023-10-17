import axiosInstane, { theOddsInstance } from "."
import { Matchup, TheOddsMatchup } from "../model";
import { convertKeyNames } from "../utils/convertKeyNames";
import { getTeams } from "./getTeams";
import { stripAndReplaceSpace } from "../utils/stringMatching";

const year = new Date().getFullYear();


interface SpreadsAPIRequest {
  bookmakers?: string;
  markets?: string;
  commenceTimeFrom?: string
  commenceTimeTo?: string;
}
export const getSpreads = async (options: SpreadsAPIRequest) => {
  return theOddsInstance.get<TheOddsMatchup[]>('americanfootball_ncaaf/odds', {
    params: {
      ...options,
      regions: 'us',
      markets: 'spreads',
      commenceTimeFrom: '2023-10-17T00:00:00Z',
      commenceTimeTo: '2023-10-21T23:59:00Z',
    }
  }).then((response) => response.data);
}

export const getGames = async (week: number, options?: SpreadsAPIRequest) => {
  return axiosInstane.get<Matchup[]>(`/GamesByWeek/${year}/${week}`, {
  }).then(async (res) => {
    const teamInfo = await getTeams();
    const spreads = await getSpreads({ ...options });
    return convertKeyNames(res.data).map((item) => {
      const away = teamInfo.find((team) => team.teamID === item.awayTeamID);
      const home = teamInfo.find((team) => team.teamID === item.homeTeamID);
      return {
        ...item,
        awayTeamData: { ...away },
        homeTeamData: { ...home }
      }
    }).map((item) => {
      const strippedHomeTeam = stripAndReplaceSpace(item.homeTeamName);
      const strippedAwayTeam = stripAndReplaceSpace(item.awayTeamName);

      const gameSpread: TheOddsMatchup | undefined = spreads.find((spread: TheOddsMatchup) => {
        const strippedAway = stripAndReplaceSpace(spread.away_team);
        const strippedHome = stripAndReplaceSpace(spread.home_team);
        return ((strippedHome === strippedHomeTeam) &&
        (strippedAway === strippedAwayTeam))
      }
      );
      return {
        ...item,
        pointSpread: gameSpread?.bookmakers[0]?.markets[0]?.outcomes[0]?.point ?? item.pointSpread,
      }
    })
    .map((item) => {
      let newPointSpread: number = item.pointSpread;
      const remainder = item.pointSpread % .5;
      if (remainder) {
        newPointSpread = item.pointSpread < 0 ? item.pointSpread - remainder : item.pointSpread + remainder;
      }
      return {
        ...item,
        pointSpread: remainder ? newPointSpread : item.pointSpread 
      }
    })
  })
  .catch((err) => err);
};