import { BettingGame, GetGamesResponse, GetLinesResponse, Team } from "cfbd";
import axiosInstance, { cfbdApi } from "."
import { GamesAPIResult, Rank } from "../model";
import { stripAndReplaceSpace } from "../utils/stringMatching";
import { getRankings, getTeams } from "./getTeams";
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
  seasonType?: string;
  historical?: boolean;
};

const getSpreads = async (options: {
  week?: string;
  year?: string;
  seasonType?: string;
}): Promise<GetLinesResponse> => {
  return cfbdApi.get(`/odds`, {
    params: {
      week: options.week,
      year: options.year,
      seasonType: options.seasonType,
    }
  }).then((response) => {

    return response.data
  }).catch((err) => console.error(err));
};

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
export const getGames = async (options?: SpreadsAPIRequest): Promise<GamesAPIResult[]> => {
  const matchupRequestOptions: SpreadsAPIRequest = {
    ...options,
    weekNumber: options?.weekNumber,
    season: options?.season,
  };

  return cfbdApi.get<any[]>('games', {
    params: {
      year: matchupRequestOptions?.season,
      week: matchupRequestOptions?.weekNumber,
      seasonType: matchupRequestOptions?.seasonType
    }
  })
    .then(async (resp) => {
      const resSorted: GetGamesResponse = resp?.data?.sort((a, b) => Date.parse(a?.startDate) - Date.parse(b?.startDate));

      try {
        const compoundRequest = await Promise.all([
          await getRankings(matchupRequestOptions?.season as string, matchupRequestOptions?.weekNumber as string, matchupRequestOptions?.seasonType as string),
          await getTeams(),
          await getSpreads({
            week: matchupRequestOptions?.weekNumber,
            year: matchupRequestOptions?.season,
            seasonType: matchupRequestOptions?.seasonType,
          }),
        ]);
        const [rankings, teamInfo, spreads] = await compoundRequest;
        console.log(teamInfo);
        // bottle neck here with map containing an array.find -- REFACTOR
        /**
         * find teams via cfbd, sportsdataio, or own db? migrate teams from cfbd?
         */
        const updated = resSorted.map((item) => {
          const rankPropAccessor = rankings.poll === 'AP Top 25' ? 'apRank' : 'playoffRank';
          const finder = (team: Team | Rank, valueToSearch: string) => stripAndReplaceSpace(team.school) === stripAndReplaceSpace(valueToSearch);
          const away = {
            ...teamInfo.find((t) => t.id === item.awayId),
            [rankPropAccessor]: rankings.ranks.find((r) => finder(r, item.awayTeam))?.rank
          };
          const home = {
            ...teamInfo.find((t) => t.id === item.homeId),
            [rankPropAccessor]: rankings.ranks.find((team) => finder(team, item.homeTeam))?.rank
          };
          return {
            ...item,
            awayTeamData: { ...away, },
            homeTeamData: { ...home, }
          }
        }).map((item) => {
          const gameSpread: BettingGame | undefined = spreads?.find((spread: BettingGame) => {
            return spread.awayTeamId === item.awayTeamData.id && spread.homeTeamId === item.homeTeamData.id;
          });
          const pointSpread = gameSpread?.lines?.filter(l => l.provider === "DraftKings")?.[0]?.spread || 0;
          if (!!gameSpread) {
            console.log(item, gameSpread)
          }
          return {
            ...item,
            pointSpread: pointSpread,
            outcomes: gameSpread ? ({
              home: {
                name: item.homeTeamData.school,
                point: pointSpread > 0 ? `+${pointSpread}` : `${pointSpread}`, /** string representation +x for positive point spreads, -x for negative */
                pointValue: pointSpread, /** string representation +x for positive point spreads, -x for negative */
                id: 1
              },
              away: {
                name: item.awayTeamData.school,
                point: -1 * pointSpread > 0 ? `+${-1 * pointSpread}` : `${-1 * pointSpread}`, /** string representation +x for positive point spreads, -x for negative */
                pointValue: -1 * pointSpread,
                id: 2
              }
            }) : undefined
          }
        });
        let newUpdate = updated
          .filter((item) => !!item?.outcomes);
        return newUpdate;

      } catch (err) {
        console.error(err);
        return;
      }

    })
    .catch((err) => {
      console.error(err)
      return err
    });
};