import axios from "axios";


const axiosInstance = axios.create({
  baseURL: `https://api.sportsdata.io/v3/cfb/`,
  params: {
    key: process.env.REACT_APP_MATCHUPS_API_KEY
  },
});
export const cfbdApi = axios.create({
  baseURL: `http://localhost:3001/`,
});

export const theOddsInstance = axios.create({
  baseURL: `https://api.the-odds-api.com/v4${process.env.REACT_APP_SEASON_KEY === 'offseason' ? `/historical` : ''}/sports/`,
  params: {
    apiKey: process.env.REACT_APP_THE_ODDS_API_KEY
  }
});
export default axiosInstance;
