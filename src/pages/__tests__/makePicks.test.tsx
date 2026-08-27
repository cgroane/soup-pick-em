/**
 * MakePicks submit path. Guards the move from a shared UI status flag to local
 * page state: a rejected write used to leave the modal spinning forever because
 * `submitPicks` had no try/catch and the success icon was driven by an unrelated
 * context status.
 */
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MakePicks from '../MakePicks';
import { AllProviders, TEST_GID, TEST_UID, membership, userDoc, makeGames, makeSlate, seasonData } from '../../test-utils/harness';

jest.mock('firebase/auth');
jest.mock('../../firebase/user/user');
jest.mock('../../firebase/group/group');
jest.mock('../../firebase/slate/slate');
jest.mock('../../api/getGames');

const { __setAuthUser, __resetAuth } = require('firebase/auth');
const FirebaseUsers = require('../../firebase/user/user').default;
const FirebaseGroups = require('../../firebase/group/group').default;
const getGamesApi = require('../../api/getGames');

const GAMES = makeGames(10);
/** A complete, already-submitted set of picks for the current slate. */
const completeHistory = [
  {
    slateId: 'w5-2024',
    userId: TEST_UID,
    name: 'Test User',
    week: 5,
    year: 2024,
    picks: GAMES.map((g) => ({
      matchup: g.id,
      isCorrect: false,
      userId: TEST_UID,
      week: 5,
      selection: { name: g.homeTeam, point: '-3', pointValue: -3, id: g.id },
    })),
  },
];

const renderPage = async () => {
  render(<MakePicks />, { wrapper: AllProviders });
  await act(async () => {
    __setAuthUser({ uid: TEST_UID, email: 'test@example.com', displayName: 'Test User' });
  });
  expect(await screen.findByText('Picks: 10/10')).toBeInTheDocument();
};

beforeEach(() => {
  jest.clearAllMocks();
  __resetAuth();
  localStorage.clear();
  getGamesApi.getCurrentWeek.mockResolvedValue(seasonData);
  getGamesApi.getGames.mockResolvedValue(GAMES);
  FirebaseUsers.getDocumentInCollection.mockResolvedValue(userDoc());
  FirebaseGroups.getUserMemberships.mockResolvedValue([membership(['member'])]);
  FirebaseGroups.getGroup.mockResolvedValue({ id: TEST_GID, name: 'Test Group' });
  FirebaseGroups.getMembers.mockResolvedValue([{ uid: TEST_UID, fName: 'Test', lName: 'User', record: [] }]);
  FirebaseGroups.getAllPicks.mockResolvedValue([]);
  FirebaseGroups.getMemberPicks.mockResolvedValue(completeHistory);
  FirebaseGroups.getMember.mockResolvedValue({ uid: TEST_UID, record: [] });
  FirebaseGroups.getSlate.mockResolvedValue(makeSlate(GAMES));
  FirebaseGroups.saveMemberPicks.mockResolvedValue(undefined);
});

test('renders the slate and prepopulates a complete set of picks', async () => {
  await renderPage();

  expect(FirebaseGroups.getSlate).toHaveBeenCalledWith(TEST_GID, 'w5-2024');
  expect(screen.getByRole('button', { name: 'Submit Picks' })).toBeEnabled();
});

test('submitting saves the picks and offers the profile link', async () => {
  await renderPage();

  userEvent.click(screen.getByRole('button', { name: 'Submit Picks' }));

  expect(await screen.findByText('PROFILE')).toBeInTheDocument();
  expect(FirebaseGroups.saveMemberPicks).toHaveBeenCalledTimes(1);
  const [gid, uid, slateId, payload] = FirebaseGroups.saveMemberPicks.mock.calls[0];
  expect(gid).toBe(TEST_GID);
  expect(uid).toBe(TEST_UID);
  expect(slateId).toBe('w5-2024');
  expect(payload.picks).toHaveLength(10);
});

test('a rejected save shows an error instead of spinning forever', async () => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  FirebaseGroups.saveMemberPicks.mockRejectedValue(new Error('permission denied'));
  await renderPage();

  userEvent.click(screen.getByRole('button', { name: 'Submit Picks' }));

  expect(await screen.findByText('Could not save your picks. Please try again.')).toBeInTheDocument();
  // No success affordance on a failed write.
  expect(screen.queryByText('PROFILE')).not.toBeInTheDocument();
});
