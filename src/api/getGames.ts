import axiosInstance, { cfbdApi, theOddsInstance } from "."
import { Matchup, Rank, Team, TheOddsResult } from "../model";
import { convertKeyNames } from "../utils/convertKeyNames";
import { stripAndReplaceSpace } from "../utils/stringMatching";
import { getRankings, getTeams } from "./getTeams";
import { SeasonDetails } from "./schema/sportsDataIO";
import { add } from 'date-fns';
export interface SpreadsAPIRequest {
  weekNumber?: string;
  season?: string;
  bookmakers?: string;
  markets?: string;
  commenceTimeFrom?: string
  commenceTimeTo?: string;
  event?: string;
  date?: string;
  seasonType?: string;
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
    return err;
  }
}

/**
 * 
 * @param options --> used to handle week and season, which are also passed into getSpreads to ensure we are getting data
 * from each api that is of the same time period.
 * This requires transforming the responses to match casing of types, and to match the results from one api to another,
 * and then again to another
 * 
 * need to know what values to send to week and year parameters
 * if it's postseason, week may be 1, or null
 * use getCurrentWeek to get this information
 * seasonType for cfbd api will be 'postseason' or 'regular'
 * 
 * if season is OFF or POST, default week to most recent? 
 * 
 * refactor perhaps
 * @returns 
 */
export const getGames = async (options?: SpreadsAPIRequest): Promise<Matchup[]> => {
  const matchupRequestOptions: SpreadsAPIRequest = {
    ...options,
    weekNumber: options?.weekNumber,
    season: options?.season,
  };
  
    return cfbdApi.get<Matchup[]>('games', { params: {
        year: matchupRequestOptions?.season,
        week: matchupRequestOptions?.weekNumber,
        seasonType: matchupRequestOptions?.seasonType
      }
    })
    .then(async (res) => {
    const resWithUpdatedPropertyNames = convertKeyNames(res.data).sort((a, b) => Date.parse(a?.startDate) - Date.parse(b?.startDate))
    const weekRange = {
      start: resWithUpdatedPropertyNames[0],
      end: resWithUpdatedPropertyNames[resWithUpdatedPropertyNames.length - 1],
    }

    try {
      const endDate = add(new Date(new Date(weekRange?.end?.startDate)), { days: 1 });
      // const toDate =  new Date(new Date(weekRange?.end?.startDate).setDate(new Date(weekRange?.end?.startDate).getDate() + 1)).toDateString();
      const spreadsOptions = process.env.REACT_APP_SEASON_KEY === 'offseason' ? {
        ...options,
        date: buildDateFormat(weekRange?.start?.startDate)
      } : {
        ...options,
        commenceTimeFrom: buildDateFormat((weekRange.start?.startDate)),
        commenceTimeTo: buildDateFormat((endDate).toISOString()),
        date: buildDateFormat(weekRange?.start?.startDate)
      }
      const compoundRequest = await Promise.all([
        await getRankings(matchupRequestOptions?.season as string, matchupRequestOptions?.weekNumber as string, matchupRequestOptions?.seasonType as string),
        await getTeams(),
        await getSpreads({
          ...spreadsOptions
        })
      ]);
      const [rankings, teamInfo, spreads] = await compoundRequest;

      // bottle neck here with map containing an array.find -- REFACTOR
      const updated = resWithUpdatedPropertyNames.map((item) => {
        const rankPropAccessor = rankings.poll === 'AP Top 25' ? 'apRank' : 'playoffRank';
        const finder = (team: Team | Rank, valueToSearch: string) => stripAndReplaceSpace(team.school) === stripAndReplaceSpace(valueToSearch);
        const away = {
          ...teamInfo.find((team) => finder(team, item.awayTeam)),
          [rankPropAccessor]: rankings.ranks.find((r) => finder(r, item.awayTeam))?.rank
        };
        const home = {
          ...teamInfo.find((team) => finder(team, item.homeTeam)),
          [rankPropAccessor]: rankings.ranks.find((team) => finder(team, item.homeTeam))?.rank
        };
        return {
          ...item,
          awayTeamData: { ...away, },
          homeTeamData: { ...home, }
        }
      })
      .map((item) => {
        const strippedHomeTeam = stripAndReplaceSpace(`${item.homeTeamData.school}${item.homeTeamData.name}`);
        const strippedAwayTeam = stripAndReplaceSpace(`${item.awayTeamData.school}${item.awayTeamData.name}`);
        
        const gameSpread: TheOddsResult | undefined = spreads?.find((spread: TheOddsResult) => {
          const strippedAway = stripAndReplaceSpace(spread.away_team);
          const strippedHome = stripAndReplaceSpace(spread.home_team);
 
          /**
           * find odds where hometeam 
           * */
          if (!!item.neutralSite && ((strippedHome === strippedAwayTeam && strippedAway === strippedHomeTeam))) {
            return ((strippedHomeTeam === strippedAway) && (strippedAwayTeam === strippedHome));
          } else {
            return ((strippedHomeTeam === strippedHome) &&
            (strippedAwayTeam === strippedAway))
          }
        });
      const orderedOutcomes = gameSpread?.bookmakers[0]?.markets[0]?.outcomes.sort((a, _) => {
        const stripped = stripAndReplaceSpace(a.name);
        return !!strippedHomeTeam.includes(stripped) ? -1 : 1
      })
        return {
          ...item,
          pointSpread: gameSpread?.bookmakers[0]?.markets[0]?.outcomes[0]?.point ?? item.pointSpread,
          theOddsId: gameSpread?.id,
          outcomes: orderedOutcomes ?? [],
        }
      });
      const newUpdate = updated
      .filter((item) => item.outcomes.length)
      .map((item) => {
        if (item.homeTeam === 'Northwestern' ) {
          console.log('item', item);
        }
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
      return newUpdate;

    } catch (err) {
      console.error(err);
      return;
    }
    
  })
  .catch((err) => {
    console.error(err)
    return err});
};