import axiosInstance, { theOddsInstance } from "."
import { Matchup, TheOddsResult } from "../model";
import { convertKeyNames } from "../utils/convertKeyNames";
import { getTeams } from "./getTeams";
import { stripAndReplaceSpace } from "../utils/stringMatching";
import { SeasonDetails } from "./schema/sportsDataIO";
export interface SpreadsAPIRequest {
  weekNumber?: string;
  season?: string;
  bookmakers?: string;
  markets?: string;
  commenceTimeFrom?: string
  commenceTimeTo?: string;
  event?: string;
  date?: string;
}
const buildDateFormat = (date: string) => {
  const convertedToDate = new Date(date);
  return `${convertedToDate.toISOString().split('T')[0]}T${convertedToDate.getHours().toLocaleString('en-us', {
    minimumIntegerDigits: 2
  })}:${convertedToDate.getMinutes().toLocaleString('en-us', {
    minimumIntegerDigits: 2
  })}:${convertedToDate.getSeconds().toLocaleString('en-us', {
    minimumIntegerDigits: 2
  })}Z`;
}

export const getSpreads = async (options: SpreadsAPIRequest) => {
  return theOddsInstance.get(`americanfootball_ncaaf/odds`, {
    params: {
      ...options,
      regions: 'us',
      markets: options.markets ?? 'spreads',
    }
  }).then((response) => {
    return response.data
  }).catch((err) => console.error(err));
}

export const getCurrentWeek = async () => {
  try {
    const response = await axiosInstance.get<SeasonDetails>(`/scores/json/CurrentSeasonDetails`);
    return response.data
  } catch (err) {
    console.error(err)
  }
}
export const getGames = async (options?: SpreadsAPIRequest): Promise<Matchup[]> => {
  const matchupRequestOptions: SpreadsAPIRequest = {
    ...options,
    weekNumber: options?.weekNumber,
    season: options?.season
  }
  return axiosInstance.get<Matchup[]>(`/stats/json/GamesByWeek/${matchupRequestOptions.season}/${matchupRequestOptions.weekNumber}`, {

  }).then(async (res) => {
    const resWithUpdatedPropertyNames = convertKeyNames(res.data);
    const weekRange = {
      start: resWithUpdatedPropertyNames?.sort((a, b) => Date.parse(a?.dateTimeUTC) - Date.parse(b?.dateTimeUTC))[0],
      end: resWithUpdatedPropertyNames?.sort((a, b) => Date.parse(a?.dateTimeUTC) - Date.parse(b?.dateTimeUTC))[res.data.length - 1]
    };

    try {
      const compoundRequest = await Promise.all([
        await getTeams(),
        await getSpreads({
          ...options,
          commenceTimeFrom: buildDateFormat((weekRange.start?.dateTimeUTC)),
          commenceTimeTo: buildDateFormat((weekRange.end?.dateTimeUTC)),
          date: buildDateFormat(weekRange?.end?.dateTimeUTC)
        })
      ]);
      const [teamInfo, spreads] = await compoundRequest;
      return resWithUpdatedPropertyNames.map((item) => {
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
  
        const gameSpread: TheOddsResult | undefined = spreads?.data?.find((spread: TheOddsResult) => {
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
    } catch (err) {
      console.error(err);
    }

  })
  .catch((err) => err);
};