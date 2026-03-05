import axios from "axios";
import { getAuth } from "firebase/auth";

const cfbdApi = axios.create({
  baseURL: `/api/`,
  headers: {
    "Content-Type": "application/json",
  }
});
cfbdApi.interceptors.request.use(async (config) => {
  const user = await getAuth().currentUser;
  const token = user ? await user.getIdToken() : null;
  if (token) {
    config.headers["Authorization"] = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default cfbdApi;
