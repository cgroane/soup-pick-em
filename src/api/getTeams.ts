import axiosInstance from "."
import { Team } from "../model";
import { convertKeyNames } from "../utils/convertKeyNames";

export const getTeams = async (): Promise<Team[]> => {
  return axiosInstance.get('Teams').then((response) => convertKeyNames(response.data))
}