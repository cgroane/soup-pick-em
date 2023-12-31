import axiosInstane from "."
import { Team } from "../model";
import { convertKeyNames } from "../utils/convertKeyNames";

export const getTeams = async (): Promise<Team[]> => {
  return axiosInstane.get('Teams').then((response) => convertKeyNames(response.data))
}