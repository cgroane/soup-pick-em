/**
 * Profile happy path. The page's loading gate moved from a single shared UI
 * status to the three statuses it actually depends on, so the regression to
 * guard is the skeleton never clearing.
 */
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import Profile from '../Profile';
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

const MEMBERS = [
  { uid: TEST_UID, fName: 'Test', lName: 'User', record: [{ year: 2024, wins: 7, losses: 3 }] },
  { uid: 'user-2', fName: 'Other', lName: 'Person', record: [{ year: 2024, wins: 4, losses: 6 }] },
];

const renderPage = async (roles: string[] = ['member']) => {
  FirebaseGroups.getUserMemberships.mockResolvedValue([membership(roles)]);
  render(<Profile />, { wrapper: AllProviders });
  await act(async () => {
    __setAuthUser({ uid: TEST_UID, email: 'test@example.com', displayName: 'Test User' });
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  __resetAuth();
  localStorage.clear();
  getGamesApi.getCurrentWeek.mockResolvedValue(seasonData);
  getGamesApi.getGames.mockResolvedValue(makeGames(10));
  FirebaseUsers.getDocumentInCollection.mockResolvedValue(
    userDoc({ record: [{ year: 2024, wins: 7, losses: 3 }] } as never)
  );
  FirebaseGroups.getGroup.mockResolvedValue({ id: TEST_GID, name: 'Test Group' });
  FirebaseGroups.getMembers.mockResolvedValue(MEMBERS);
  FirebaseGroups.getAllPicks.mockResolvedValue([]);
  FirebaseGroups.getMemberPicks.mockResolvedValue([]);
  FirebaseGroups.getMember.mockResolvedValue({ uid: TEST_UID, record: [{ year: 2024, wins: 7, losses: 3 }] });
  FirebaseGroups.getSlate.mockResolvedValue(makeSlate(makeGames(10)));
});

test('clears the loading skeleton and renders the cards', async () => {
  await renderPage();

  expect(await screen.findByText('Leaderboard')).toBeInTheDocument();
  expect(screen.getByText('Week 5, 2024')).toBeInTheDocument();
  expect(screen.getByText('Win Percentage')).toBeInTheDocument();
  // The slate exists, so the picks card links through rather than sitting disabled.
  expect(screen.getByRole('button', { name: 'Go to slate' })).toBeInTheDocument();
});

test('a member sees View Games; the slate-picker sees Pick Slate', async () => {
  await renderPage(['member']);
  expect(await screen.findByText('View Games')).toBeInTheDocument();
});

test('the slate-picker gets the slate-editing affordance', async () => {
  await renderPage(['member', 'slate-picker']);
  expect(await screen.findByText('Pick Slate')).toBeInTheDocument();
});

test('still renders when the members fetch fails', async () => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  FirebaseGroups.getMembers.mockRejectedValue(new Error('permission denied'));

  await renderPage();

  // usersStatus lands on ERROR, so the gate opens instead of hanging on the skeleton.
  expect(await screen.findByText('Leaderboard')).toBeInTheDocument();
});
