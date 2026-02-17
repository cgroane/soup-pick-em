import { GetTeamsResponse } from "cfbd";
import { cfbdApi } from "."
import { Poll } from "../model";

export const getRankings = async (year: string, week: string, seasonType: string): Promise<Poll> => {
  return cfbdApi.get<Poll>('rankings', { params: { year, week, seasonType } }).then((resp) => resp.data).catch((err) => {
    throw new Error(err)
  })
};

export const getTeams = async (): Promise<GetTeamsResponse> => {
  return cfbdApi.get<GetTeamsResponse>('/teams', {}).then((response) => {
    return response.data
  }).catch((err) => {
    console.error(err)
    throw new Error(err)
  });
}