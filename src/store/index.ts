import { configureStore } from "@reduxjs/toolkit";
import user from "./user";
import slate from "./slate";


const store = configureStore({
  reducer: {
    user: user,
    slate: slate
  },
  devTools: true
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;