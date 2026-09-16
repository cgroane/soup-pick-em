import { createContext, useContext, useMemo } from "react";
import { Group, GroupMembership, GroupRole } from "../../model";

export type GroupState = {
  memberships: GroupMembership[];
  activeGroupId: string | undefined;
  activeGroup: Group | undefined;
};

// Intentionally NOT seeded from localStorage: doing so exposes a group id to
// downstream readers (slate/pick fetches) before auth resolves on a cold load,
// firing UNAUTHENTICATED Firestore reads that the group-scoped rules reject.
// The stored preference is applied by SET_MEMBERSHIPS once we have a uid and
// can validate it against the user's real memberships.
export const initialGroupState: GroupState = {
  memberships: [],
  activeGroupId: undefined,
  activeGroup: undefined,
};

export const GroupStateContext = createContext(initialGroupState);

export const useGroupStateContext = () => {
  const s = useContext(GroupStateContext);

  const activeRoles = useMemo<GroupRole[]>(
    () => s.memberships.find((m) => m.gid === s.activeGroupId)?.roles ?? [],
    [s.memberships, s.activeGroupId]
  );

  return {
    ...s,
    activeRoles,
    isSlatePicker: activeRoles.includes('slate-picker'),
    isGroupOwner: activeRoles.includes('owner'),
  };
};
