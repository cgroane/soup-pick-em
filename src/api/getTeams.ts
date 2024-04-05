import axiosInstance, { cfbdApi } from "."
import { Poll, Team } from "../model";
import { convertKeyNames } from "../utils/convertKeyNames";

export const getTeams = async (): Promise<Team[]> => {
  return axiosInstance.get('/scores/json/Teams').then((response) => convertKeyNames(response.data))
}
export const getRankings = async (year: string, week: string, seasonType: string): Promise<Poll> => {
  return cfbdApi.get<Poll>('rankings', { params: { year, week, seasonType } }).then((resp) => resp.data).catch((err) => {
    throw new Error(err)
  })
}