import { collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { db } from '..';
import { Group, GroupMember, GroupMembership, Slate } from '../../model';
import { PickHistory } from '../../pages/Picks/PicksTable';

const GROUPS = 'groups';

/**
 * Group-scoped Firestore access. All reads/writes are nested under
 * groups/{gid}/... so a member only ever touches their own group's data.
 * Replaces the pre-groups global collections (users, top-level slates,
 * collectionGroup('picks')) which leaked across the whole app.
 */
class FirebaseGroups {
  /** users/{uid}/memberships — the groups a user belongs to. */
  getUserMemberships = async (uid: string): Promise<GroupMembership[]> => {
    const snap = await getDocs(collection(db, 'users', uid, 'memberships'));
    return snap.docs.map((d) => d.data() as GroupMembership);
  };

  getGroup = async (gid: string): Promise<Group | undefined> => {
    const snap = await getDoc(doc(db, GROUPS, gid));
    return snap.exists() ? (snap.data() as Group) : undefined;
  };

  /** The full roster — used for the leaderboard (records live on the member doc). */
  getMembers = async (gid: string): Promise<GroupMember[]> => {
    const snap = await getDocs(collection(db, GROUPS, gid, 'members'));
    return snap.docs.map((d) => d.data() as GroupMember);
  };

  getMember = async (gid: string, uid: string): Promise<GroupMember | undefined> => {
    const snap = await getDoc(doc(db, GROUPS, gid, 'members', uid));
    return snap.exists() ? (snap.data() as GroupMember) : undefined;
  };

  /** Every member's pick history (groups are small — a full read is fine). */
  getAllPicks = async (gid: string): Promise<PickHistory[]> => {
    const members = await getDocs(collection(db, GROUPS, gid, 'members'));
    const all: PickHistory[] = [];
    for (const m of members.docs) {
      const picks = await getDocs(collection(db, GROUPS, gid, 'members', m.id, 'picks'));
      picks.forEach((p) => all.push(p.data() as PickHistory));
    }
    return all;
  };

  getMemberPicks = async (gid: string, uid: string): Promise<PickHistory[]> => {
    const snap = await getDocs(collection(db, GROUPS, gid, 'members', uid, 'picks'));
    return snap.docs.map((d) => d.data() as PickHistory);
  };

  getSlate = async (gid: string, slateId: string): Promise<Slate | undefined> => {
    const snap = await getDoc(doc(db, GROUPS, gid, 'slates', slateId));
    return snap.exists() ? (snap.data() as Slate) : undefined;
  };

  saveSlate = async (gid: string, slate: Slate): Promise<void> => {
    await setDoc(doc(db, GROUPS, gid, 'slates', slate.uniqueWeek), slate);
  };

  saveMemberPicks = async (
    gid: string,
    uid: string,
    slateId: string,
    data: PickHistory
  ): Promise<void> => {
    await setDoc(doc(db, GROUPS, gid, 'members', uid, 'picks', slateId), data);
  };
}

export const FirebaseGroupsInstance = new FirebaseGroups();
export default FirebaseGroupsInstance;
