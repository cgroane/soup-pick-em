/** Manual mock — see src/firebase/user/__mocks__/user.ts for why. */
const FirebaseGroupsInstance = {
  getUserMemberships: jest.fn(async () => [] as unknown[]),
  getGroup: jest.fn(async () => undefined),
  getMembers: jest.fn(async () => [] as unknown[]),
  getMember: jest.fn(async () => undefined),
  getAllPicks: jest.fn(async () => [] as unknown[]),
  getMemberPicks: jest.fn(async () => [] as unknown[]),
  getSlate: jest.fn(async () => undefined),
  saveSlate: jest.fn(async () => undefined),
  saveMemberPicks: jest.fn(async () => undefined),
};

export default FirebaseGroupsInstance;
