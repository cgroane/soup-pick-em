import cfbdApi from "."
import { MatchupsAPIResponse } from "../model";
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


export const getCurrentWeek = async () => {
  try {
    const response = await cfbdApi.get<SeasonDetails>(`/current-week`);
    return response.data
  } catch (err) {
    console.error(err)
    return err;
  }
}


export const getGames = async (options?: SpreadsAPIRequest) => {
  const matchups = await cfbdApi.get<MatchupsAPIResponse>(`/matchups`, {
    params: {
      year: options?.season,
      week: options?.weekNumber,
      seasonType: options?.seasonType
    }
  });
  return matchups.data;
}

export const getCFPGames = async (year: number): Promise<MatchupsAPIResponse> => {
  const response = await cfbdApi.get<MatchupsAPIResponse>('/cfp-games', {
    params: { year }
  });
  return response.data;
}
