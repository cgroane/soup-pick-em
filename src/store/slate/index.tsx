import { createSlice } from "@reduxjs/toolkit";
import { GenericDataState } from "../../types";
import { RootState } from "..";
import { DataState } from "../../utils/constants";
import { Slate } from "../../model";


const initialState: GenericDataState<Slate> = {
  dataState: DataState.INITIAL
};

const slateState = createSlice({
  name: 'slate',
  initialState,
  reducers: {},
  // extraReducers: (builder) => {},
});

export const selectWeek = (state: RootState) => state.slate.data?.week;
export default slateState.reducer;
