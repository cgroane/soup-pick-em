import axios from "axios";


const axiosInstane = axios.create({
  baseURL: `https://api.sportsdata.io/v3/cfb/scores/json/`,
  params: {
    key: process.env.REACT_APP_MATCHUPS_API_KEY
  },
})
export default axiosInstane;