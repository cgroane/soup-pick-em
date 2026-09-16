import { createContext, Dispatch, useContext } from "react";
import { UserCollectionData } from "../../model";
import { PickHistory } from "../../pages/Picks/PicksTable";
import { LoadingState } from "../ui";

export type UserActions = | { type: 'SET_USER', payload: UserCollectionData | null }
  | { type: 'PATCH_USER', payload: Partial<UserCollectionData> }
  | { type: 'SET_MEMBERS', payload: { users: UserCollectionData[]; allPickHistories: PickHistory[] } }
  | { type: 'SET_USERS_STATUS', payload: keyof typeof LoadingState }

export const UserDispatchContext = createContext<Dispatch<UserActions>>(() => { });

export const useUserDispatchContext = () => useContext(UserDispatchContext);
