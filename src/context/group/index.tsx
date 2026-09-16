import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from 'react';
import FirebaseGroupsInstance from '../../firebase/group/group';
import { useAuthStateContext } from 'context/auth/auth-state';
import { GroupActions, GroupDispatchContext } from './group-dispatch';
import { GroupState, GroupStateContext, initialGroupState } from './group-state';

const ACTIVE_GROUP_KEY = 'activeGroupId';

export const groupReducer = (state: GroupState, action: GroupActions): GroupState => {
  switch (action.type) {
    case 'SET_MEMBERSHIPS': {
      const { memberships, storedGroupId } = action.payload;
      // Resolve the active group now that we're authed and know the real
      // memberships: prefer an in-session selection, then the stored preference,
      // and only accept it if it's still a group the user belongs to (E3);
      // otherwise fall back to the first membership.
      const candidate = state.activeGroupId ?? storedGroupId;
      return {
        ...state,
        memberships,
        activeGroupId: candidate && memberships.some((m) => m.gid === candidate) ? candidate : memberships[0]?.gid,
      };
    }
    case 'SET_ACTIVE_GROUP_ID':
      return { ...state, activeGroupId: action.payload };
    case 'SET_ACTIVE_GROUP':
      return { ...state, activeGroup: action.payload };
    default:
      return state;
  }
};

export type GroupProviderValue = {
  setActiveGroup: (gid: string) => void;
  refreshMemberships: () => Promise<void>;
  /** Re-fetch the active group doc (after an owner edits name/visibility). */
  refreshActiveGroup: () => Promise<void>;
};

export const GroupContext = createContext({} as GroupProviderValue);

const GroupContextProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [state, dispatch] = useReducer(groupReducer, initialGroupState);
  const { uid } = useAuthStateContext();
  const { activeGroupId } = state;

  const refreshMemberships = useCallback(async () => {
    if (!uid) {
      dispatch({ type: 'SET_MEMBERSHIPS', payload: { memberships: [] } });
      return;
    }
    const memberships = await FirebaseGroupsInstance.getUserMemberships(uid);
    dispatch({
      type: 'SET_MEMBERSHIPS',
      payload: { memberships, storedGroupId: localStorage.getItem(ACTIVE_GROUP_KEY) ?? undefined },
    });
  }, [uid]);

  useEffect(() => {
    refreshMemberships();
  }, [refreshMemberships]);

  useEffect(() => {
    if (!activeGroupId) {
      dispatch({ type: 'SET_ACTIVE_GROUP', payload: undefined });
      return;
    }
    FirebaseGroupsInstance.getGroup(activeGroupId).then((g) => dispatch({ type: 'SET_ACTIVE_GROUP', payload: g }));
  }, [activeGroupId]);

  const setActiveGroup = useCallback((gid: string) => {
    localStorage.setItem(ACTIVE_GROUP_KEY, gid);
    dispatch({ type: 'SET_ACTIVE_GROUP_ID', payload: gid });
  }, []);

  const refreshActiveGroup = useCallback(async () => {
    if (!activeGroupId) return;
    dispatch({ type: 'SET_ACTIVE_GROUP', payload: await FirebaseGroupsInstance.getGroup(activeGroupId) });
  }, [activeGroupId]);

  const value = useMemo<GroupProviderValue>(
    () => ({ setActiveGroup, refreshMemberships, refreshActiveGroup }),
    [setActiveGroup, refreshMemberships, refreshActiveGroup]
  );

  return (
    <GroupContext.Provider value={value}>
      <GroupDispatchContext.Provider value={dispatch}>
        <GroupStateContext.Provider value={state}>
          {children}
        </GroupStateContext.Provider>
      </GroupDispatchContext.Provider>
    </GroupContext.Provider>
  );
};

export default GroupContextProvider;
export const useGroupContext = (): GroupProviderValue => useContext(GroupContext);
