import axios from "axios";

// https://api.sportsdata.io/v3/cfb/stats/json/GamesByDate/{date}?key=9cf07bb7b3a04848b676102b0232635e
const axiosInstance = axios.create({
  baseURL: `https://api.sportsdata.io/v3/cfb/`,
  params: {
    key: process.env.REACT_APP_MATCHUPS_API_KEY
  },
});

export const theOddsInstance = axios.create({
  baseURL: `https://api.the-odds-api.com/v4/sports/`,
  params: {
    apiKey: process.env.REACT_APP_THE_ODDS_API_KEY
  }
});
export default axiosInstance;
