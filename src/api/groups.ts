import cfbdApi from ".";
import { Group, GroupVisibility } from "../model";

/**
 * Assign the slate-picker role to a member of a group. Server-enforced:
 * only the group owner (or a global admin) may call this.
 */
export const assignSlatePicker = async (gid: string, uid: string) => {
  const res = await cfbdApi.post(`groups/${gid}/slate-picker`, { uid });
  return res.data;
};

/** Create a group; the caller becomes the owner. Returns the new group. */
export const createGroup = async (name: string, visibility: GroupVisibility) => {
  const res = await cfbdApi.post<Group>("groups", { name, visibility });
  return res.data;
};

/**
 * Join a group by invite code (private or public) or by id (public only).
 * Returns the joined group's id/name.
 */
export const joinGroup = async (opts: { inviteCode?: string; gid?: string }) => {
  const res = await cfbdApi.post<{ gid: string; name: string; alreadyMember?: boolean }>(
    "groups/join",
    opts
  );
  return res.data;
};

/** Discover public groups. */
export const listPublicGroups = async () => {
  const res = await cfbdApi.get<{ id: string; name: string; ownerUid: string }[]>("groups/public");
  return res.data;
};

/** Owner-only: update a group's name and/or visibility. */
export const updateGroup = async (
  gid: string,
  updates: { name?: string; visibility?: GroupVisibility }
) => {
  const res = await cfbdApi.patch(`groups/${gid}`, updates);
  return res.data;
};
