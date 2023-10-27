import axiosInstane, { theOddsInstance } from "."
import { Matchup, TheOddsMatchup } from "../model";
import { convertKeyNames } from "../utils/convertKeyNames";
import { getTeams } from "./getTeams";
import { stripAndReplaceSpace } from "../utils/stringMatching";
import { getWeek } from "../utils/getWeek";

const year = new Date().getFullYear();


export interface SpreadsAPIRequest {
  bookmakers?: string;
  markets?: string;
  commenceTimeFrom?: string
  commenceTimeTo?: string;
  event?: string;
}
const buildDateFormat = (date: Date) => {
  return `${date.toISOString().split('T')[0]}T${date.getHours().toLocaleString('en-us', {
    minimumIntegerDigits: 2
  })}:${date.getMinutes().toLocaleString('en-us', {
    minimumIntegerDigits: 2
  })}:${date.getSeconds().toLocaleString('en-us', {
    minimumIntegerDigits: 2
  })}Z`;
}
const thisWeek = getWeek().weekRange;

export const getSpreads = async ({
  commenceTimeFrom = buildDateFormat(thisWeek[0]),
  commenceTimeTo = buildDateFormat(thisWeek[1]),
  ...options
}: SpreadsAPIRequest) => {
  return theOddsInstance.get<TheOddsMatchup[]>('americanfootball_ncaaf/odds', {
    params: {
      ...options,
      regions: 'us',
      markets: options.markets ?? 'spreads',
    }
  }).then((response) => response.data);
}

export const getGames = async (week: number, options?: SpreadsAPIRequest): Promise<Matchup[]> => {
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
        theOddsId: gameSpread?.id,
        outcomes: gameSpread?.bookmakers[0]?.markets[0]?.outcomes ?? [],
      }
    }).filter((item) => item.outcomes.length)
    .map((item) => {
      let newPointSpread: number = item.pointSpread;
      const remainder = item.pointSpread % .5;
      if (remainder) {
        newPointSpread = item.pointSpread < 0 ? item.pointSpread - remainder : item.pointSpread + remainder;
      }
      return {
        ...item,
        pointSpread: remainder ? newPointSpread : item.pointSpread,
      }
    })
  })
  .catch((err) => err);
};