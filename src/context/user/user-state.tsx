import { createContext, useContext, useMemo } from "react";
import { UserCollectionData } from "../../model";
import { PickHistory } from "../../pages/Picks/PicksTable";
import { LoadingState } from "../ui";

export type UserState = {
  user: UserCollectionData | null;
  users: UserCollectionData[];
  allPickHistories: PickHistory[];
  /** Tracks `fetchUsers` only. Read-only to consumers. */
  usersStatus: keyof typeof LoadingState;
};

export const initialUserState: UserState = {
  user: {} as UserCollectionData,
  users: [],
  allPickHistories: [],
  usersStatus: LoadingState.IDLE,
};

export const UserStateContext = createContext(initialUserState);

export const useUserStateContext = () => {
  const s = useContext(UserStateContext);

  const userOverallRecord = useMemo(() => {
    return s.user?.record?.reduce<{ wins: number; losses: number }>((acc, cur) => {
      return {
        wins: acc.wins + cur.wins,
        losses: acc.losses + cur.losses
      }
    }, { wins: 0, losses: 0 }) ?? { wins: 0, losses: 0 }
  }, [s.user?.record]);

  return {
    ...s,
    userOverallRecord,
  };
};
