import { theOddsInstance } from "."
import { SpreadsAPIRequest } from "./getGames"


export const getOtherMarkets = (gameId: string, markets: string[], options?: SpreadsAPIRequest) => {
  return theOddsInstance.get(`americanfootball_ncaaf/events/${gameId}/odds`, {
    params: {
      ...options,
      regions: 'us',
      markets: markets.join(','),
    }
  });
}