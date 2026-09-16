import { createContext, Dispatch, useContext } from "react";
import { Group, GroupMembership } from "../../model";

export type GroupActions = | { type: 'SET_MEMBERSHIPS', payload: { memberships: GroupMembership[]; storedGroupId?: string } }
  | { type: 'SET_ACTIVE_GROUP_ID', payload: string }
  | { type: 'SET_ACTIVE_GROUP', payload: Group | undefined }

export const GroupDispatchContext = createContext<Dispatch<GroupActions>>(() => { });

export const useGroupDispatchContext = () => useContext(GroupDispatchContext);
