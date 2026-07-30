export enum UserRoles {
  ADMIN = 'admin',
  SLATE_PICKER = 'slate-picker',
  BASIC = 'basic',
}

/** Per-group role, stored on the membership doc (groups/{gid}/members/{uid}).
 * Unlike UserRoles (global), these are scoped to a single group. */
export enum GroupRole {
  OWNER = 'owner',
  SLATE_PICKER = 'slate-picker',
  MEMBER = 'member',
}

export enum GroupVisibility {
  PRIVATE = 'private',
  PUBLIC = 'public',
}

/** The default group all pre-groups data is migrated into. */
export const LEGACY_GROUP_ID = 'legacy';

export enum DataState {
  INITIAL,
  LOADING,
  ERROR,
  FULFILLED,
}