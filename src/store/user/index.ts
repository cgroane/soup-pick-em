import { createSlice } from "@reduxjs/toolkit";
import { UserCollectionData } from "../../model";
import { GenericDataState } from "../../types";
import { RootState } from "..";
import { DataState } from "../../utils/constants";


const initialState: GenericDataState<UserCollectionData> = {
  dataState: DataState.INITIAL,
};

const userSlice = createSlice({
  name: 'customer',
  initialState,
  reducers: {},
  // extraReducers: (builder) => {},
});

export const selectUserRoles = (state: RootState) => state.user.data?.roles;
export default userSlice.reducer;
