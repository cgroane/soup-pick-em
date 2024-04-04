import axiosInstance, { cfbdApi, theOddsInstance } from "."
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

/**
 * 
 * @param options --> used to handle week and season, which are also passed into getSpreads to ensure we are getting data
 * from each api that is of the same time period.
 * This requires transforming the responses to match casing of types, and to match the results from one api to another,
 * and then again to another
 * 
 * refactor perhaps
 * @returns 
 */
export const getGames = async (options?: SpreadsAPIRequest): Promise<Matchup[]> => {
  const matchupRequestOptions: SpreadsAPIRequest = {
    ...options,
    weekNumber: options?.weekNumber,
    season: options?.season
  }
  const test = await cfbdApi.get('rankings', {params: { year: matchupRequestOptions?.season, week: matchupRequestOptions?.weekNumber }});
  console.log(test);
  return cfbdApi.get<Matchup[]>('games', { params: { year: matchupRequestOptions?.season, week: matchupRequestOptions?.weekNumber } })
    .then(async (res) => {
    const resWithUpdatedPropertyNames = convertKeyNames(res.data).sort((a, b) => Date.parse(a?.startDate) - Date.parse(b?.startDate))
    const weekRange = {
      start: resWithUpdatedPropertyNames[0],
      end: resWithUpdatedPropertyNames[resWithUpdatedPropertyNames.length - 1]
    };

    try {
      const spreadsOptions = process.env.REACT_APP_SEASON_KEY === 'offseason' ? {
        ...options,
        date: buildDateFormat(weekRange?.start?.startDate)
      } : {
        ...options,
        commenceTimeFrom: buildDateFormat((weekRange.start?.startDate)),
        commenceTimeTo: buildDateFormat((weekRange.end?.startDate)),
        date: buildDateFormat(weekRange?.start?.startDate)
      }
      const compoundRequest = await Promise.all([
        await getTeams(),
        await getSpreads({
          ...spreadsOptions
        })
      ]);
      const [teamInfo, spreads] = await compoundRequest;

      // bottle neck here with map containing an array.find -- REFACTOR
      return resWithUpdatedPropertyNames.map((item) => {
        const away = teamInfo.find((team) => JSON.stringify(team).includes(item.awayTeam));
        const home = teamInfo.find((team) => JSON.stringify(team).includes(item.homeTeam));
        return {
          ...item,
          awayTeamData: { ...away },
          homeTeamData: { ...home }
        }
      })
      .map((item) => {
        const strippedHomeTeam = stripAndReplaceSpace(JSON.stringify(Object.values(item.homeTeamData).join('')));
        const strippedAwayTeam = stripAndReplaceSpace(JSON.stringify(Object.values(item.awayTeamData).join('')));
        
        const gameSpread: TheOddsResult | undefined = spreads?.data?.find((spread: TheOddsResult) => {
          const strippedAway = stripAndReplaceSpace(spread.away_team);
          const strippedHome = stripAndReplaceSpace(spread.home_team);
          return ((strippedHomeTeam.includes(strippedHome)) &&
          (strippedAwayTeam.includes(strippedAway)))
        });
        
      const orderedOutcomes = gameSpread?.bookmakers[0]?.markets[0]?.outcomes.sort((a, b) => {
        const asArray = a.name.split(' ');
        const stripped = stripAndReplaceSpace(asArray.splice(asArray.length - 1, 1).join(''));
        return !!strippedHomeTeam.includes(stripped) ? -1 : 1
      })
        return {
          ...item,
          pointSpread: gameSpread?.bookmakers[0]?.markets[0]?.outcomes[0]?.point ?? item.pointSpread,
          theOddsId: gameSpread?.id,
          outcomes: orderedOutcomes ?? [],
        }
      })
      .filter((item) => item.outcomes.length)
      .map((item) => {
        let newPointSpread: number = item.pointSpread;
        const remainder = item.pointSpread % .5;
        if (remainder) {
          newPointSpread = item.pointSpread < 0 ? item.pointSpread - remainder : item.pointSpread + remainder;
        }
        return {
          ...item,
          gameID: item.id,
          pointSpread: remainder ? newPointSpread : item.pointSpread,
        }
      })

    } catch (err) {
      console.error(err);
    }
    
  })
  .catch((err) => err);
};