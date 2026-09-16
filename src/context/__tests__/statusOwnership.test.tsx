/**
 * Status ownership: each async operation owns exactly one status field, is the
 * only writer of it, and always lands on a terminal value.
 *
 * Guards the refactor in which `fetchUsers` stopped writing the UI context's
 * status (it set LOADING and never cleared it) and got its own `usersStatus`.
 */
import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AllProviders, TEST_GID, TEST_UID, membership, userDoc, makeGames, makeSlate, seasonData } from '../../test-utils/harness';
import { useUIStateContext } from '../ui/ui-state';
import { useUserStateContext } from '../user/user-state';
import { usePickState } from '../pick/pick-state';

jest.mock('firebase/auth');
jest.mock('../../firebase/user/user');
jest.mock('../../firebase/group/group');
jest.mock('../../firebase/slate/slate');
jest.mock('../../api/getGames');

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { __setAuthUser, __resetAuth } = require('firebase/auth');
const FirebaseUsers = require('../../firebase/user/user').default;
const FirebaseGroups = require('../../firebase/group/group').default;
const getGamesApi = require('../../api/getGames');

const Probe: React.FC = () => {
  const { status: seasonStatus } = useUIStateContext();
  const { usersStatus } = useUserStateContext();
  const { status: pickStatus } = usePickState();
  return (
    <>
      <span data-testid="season">{seasonStatus}</span>
      <span data-testid="users">{usersStatus}</span>
      <span data-testid="pick">{pickStatus}</span>
    </>
  );
};

const signIn = async () => {
  await act(async () => {
    __setAuthUser({ uid: TEST_UID, email: 'test@example.com', displayName: 'Test User' });
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  __resetAuth();
  localStorage.clear();
  // Happy-path defaults; individual tests override to force failures.
  getGamesApi.getCurrentWeek.mockResolvedValue(seasonData);
  getGamesApi.getGames.mockResolvedValue(makeGames(3));
  FirebaseUsers.getDocumentInCollection.mockResolvedValue(userDoc());
  FirebaseGroups.getUserMemberships.mockResolvedValue([membership(['member', 'slate-picker'])]);
  FirebaseGroups.getGroup.mockResolvedValue({ id: TEST_GID, name: 'Test Group' });
  FirebaseGroups.getMembers.mockResolvedValue([{ uid: TEST_UID, fName: 'Test', lName: 'User', record: [] }]);
  FirebaseGroups.getAllPicks.mockResolvedValue([]);
  FirebaseGroups.getMemberPicks.mockResolvedValue([]);
  FirebaseGroups.getMember.mockResolvedValue({ uid: TEST_UID, record: [] });
  FirebaseGroups.getSlate.mockResolvedValue(makeSlate(makeGames(3)));
});

test('every status reaches IDLE on the happy path', async () => {
  render(<Probe />, { wrapper: AllProviders });
  await signIn();

  await waitFor(() => expect(screen.getByTestId('season')).toHaveTextContent('IDLE'));
  await waitFor(() => expect(screen.getByTestId('users')).toHaveTextContent('IDLE'));
  expect(FirebaseGroups.getMembers).toHaveBeenCalledWith(TEST_GID);
});

test('a failing fetchUsers reports ERROR instead of hanging on LOADING', async () => {
  FirebaseGroups.getMembers.mockRejectedValue(new Error('permission denied'));
  jest.spyOn(console, 'error').mockImplementation(() => {});

  render(<Probe />, { wrapper: AllProviders });
  await signIn();

  await waitFor(() => expect(screen.getByTestId('users')).toHaveTextContent('ERROR'));
  // The failure stays in its own lane: the season fetch is unaffected.
  expect(screen.getByTestId('season')).toHaveTextContent('IDLE');
});

test('a failing season fetch does not mark users or picks as failed', async () => {
  getGamesApi.getCurrentWeek.mockRejectedValue(new Error('api down'));
  jest.spyOn(console, 'error').mockImplementation(() => {});

  render(<Probe />, { wrapper: AllProviders });
  await signIn();

  await waitFor(() => expect(screen.getByTestId('season')).toHaveTextContent('ERROR'));
  await waitFor(() => expect(screen.getByTestId('users')).toHaveTextContent('IDLE'));
  expect(screen.getByTestId('pick')).toHaveTextContent('IDLE');
});
