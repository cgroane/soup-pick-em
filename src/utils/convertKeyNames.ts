/**
 * parameters
 * object and object type
 * return type argument to return that type
 */

export const convertKeyNames = <T extends {}>(obj: T[]) => {
  const keys = Object.keys(obj[0]);
  return obj.map((item) => {
    const newItem = keys.reduce<T>((acc, key) => {
      const transformedKey = key.charAt(0).toLowerCase() + key.slice(1);
      return {
        ...acc,
        [transformedKey]: item[key as keyof T]
      }
    }, {} as T);
    return {
      ...newItem
    }
  });
}

// export const getGames = async (week: number) => {
//   return axiosInstance.get<Matchup[]>(`/GamesByWeek/${year}/${week}`, {
//   }).then((res) => {
//     const teamInfo = getTeams().then((response) => response.data);
//     const keys = Object.keys(res.data[0]);

//     return res.data.map((item: Matchup) => {
//       const newItem = keys.reduce<Matchup>((accumulator, key) => {
//         const transformedKey = key.charAt(0).toLowerCase() + key.slice(1);
//         const rankings = {
//           awayTeamAPRanking: null,
//           homeTeamAPRanking: null,
//           awayTeamCFPRanking: null,
//           homeTeamCFPRanking: null,
//         }
//         return {
//           ...accumulator,
//           [transformedKey]: item[key as keyof Matchup],
//           // awayTeamAPRanking: 
//         };
//       }, {} as Matchup);
//       return {
//         ...newItem
//       }
//     })
//   })
//   .catch((err) => err);
// }