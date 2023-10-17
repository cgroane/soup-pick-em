import axiosInstane from "."
import { Matchup } from "../model";
import { convertKeyNames } from "../utils/convertKeyNames";
import { getTeams } from "./getTeams";

const year = new Date().getFullYear();

export const getGames = async (week: number) => {
  return axiosInstane.get<Matchup[]>(`/GamesByWeek/${year}/${week}`, {
  }).then(async (res) => {
    const teamInfo = await getTeams();
    return convertKeyNames(res.data).map((item) => {
      const away = teamInfo.find((team) => team.teamID === item.awayTeamID);
      const home = teamInfo.find((team) => team.teamID === item.homeTeamID);
      return {
        ...item,
        awayTeamData: { ...away },
        homeTeamData: { ...home }
      }
    })
  })
  .catch((err) => err);
}