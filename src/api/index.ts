import axios from "axios";

const cfbdApi = axios.create({
  baseURL: `/api/`,
  headers: {
    "Content-Type": "application/json",
  }
});

export default cfbdApi;
