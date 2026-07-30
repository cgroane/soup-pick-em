import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { getAuth } from 'firebase/auth';
import { Group, GroupMembership, GroupRole } from '../../model';
import FirebaseGroupsInstance from '../../firebase/group/group';
import { app } from '../../firebase';

const ACTIVE_GROUP_KEY = 'activeGroupId';

export type GroupValueProp = {
  memberships: GroupMembership[];
  activeGroupId: string | undefined;
  activeGroup: Group | undefined;
  activeRole: GroupRole | undefined;
  /** True when the user is the slate-picker (or owner) of the active group. */
  isSlatePicker: boolean;
  isGroupOwner: boolean;
  setActiveGroup: (gid: string) => void;
  refreshMemberships: () => Promise<void>;
  /** Re-fetch the active group doc (after an owner edits name/visibility). */
  refreshActiveGroup: () => Promise<void>;
};

export const GroupContext = createContext({} as GroupValueProp);

const GroupContextProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [uid, setUid] = useState<string | undefined>(getAuth(app).currentUser?.uid);
  const [memberships, setMemberships] = useState<GroupMembership[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string | undefined>(
    () => localStorage.getItem(ACTIVE_GROUP_KEY) ?? undefined
  );
  const [activeGroup, setActiveGroupData] = useState<Group | undefined>(undefined);

  // Track the authenticated uid independently of the user context so this
  // provider can sit above it and feed the active group id downward.
  useEffect(() => {
    return getAuth(app).onAuthStateChanged((u) => setUid(u?.uid ?? undefined));
  }, []);

  const refreshMemberships = useCallback(async () => {
    if (!uid) {
      setMemberships([]);
      return;
    }
    const m = await FirebaseGroupsInstance.getUserMemberships(uid);
    setMemberships(m);
    // Keep the stored active group if still valid, else default to the first.
    setActiveGroupId((prev) => (prev && m.some((x) => x.gid === prev) ? prev : m[0]?.gid));
  }, [uid]);

  useEffect(() => {
    refreshMemberships();
  }, [refreshMemberships]);

  useEffect(() => {
    if (!activeGroupId) {
      setActiveGroupData(undefined);
      return;
    }
    FirebaseGroupsInstance.getGroup(activeGroupId).then(setActiveGroupData);
  }, [activeGroupId]);

  const setActiveGroup = useCallback((gid: string) => {
    localStorage.setItem(ACTIVE_GROUP_KEY, gid);
    setActiveGroupId(gid);
  }, []);

  const refreshActiveGroup = useCallback(async () => {
    if (!activeGroupId) return;
    setActiveGroupData(await FirebaseGroupsInstance.getGroup(activeGroupId));
  }, [activeGroupId]);

  const activeRole = useMemo<GroupRole | undefined>(
    () => memberships.find((m) => m.gid === activeGroupId)?.role,
    [memberships, activeGroupId]
  );

  const value = useMemo<GroupValueProp>(
    () => ({
      memberships,
      activeGroupId,
      activeGroup,
      activeRole,
      isSlatePicker: activeRole === 'owner' || activeRole === 'slate-picker',
      isGroupOwner: activeRole === 'owner',
      setActiveGroup,
      refreshMemberships,
      refreshActiveGroup,
    }),
    [memberships, activeGroupId, activeGroup, activeRole, setActiveGroup, refreshMemberships, refreshActiveGroup]
  );

  return <GroupContext.Provider value={value}>{children}</GroupContext.Provider>;
};

export default GroupContextProvider;
export const useGroupContext = (): GroupValueProp => useContext(GroupContext);
