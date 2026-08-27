/**
 * CreateSlate happy path — the slate-picker flow end to end through the real
 * provider tree: matchups load, selections toggle, the filter narrows the list,
 * and submitting reports success or failure on local page state.
 */
import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CreateSlate from '../CreateSlate';
import { AllProviders, TEST_GID, TEST_UID, membership, userDoc, makeGames, makeSlate, seasonData } from '../../test-utils/harness';

jest.mock('firebase/auth');
jest.mock('../../firebase/user/user');
jest.mock('../../firebase/group/group');
jest.mock('../../firebase/slate/slate');
jest.mock('../../api/getGames');

const { __setAuthUser, __resetAuth } = require('firebase/auth');
const FirebaseUsers = require('../../firebase/user/user').default;
const FirebaseGroups = require('../../firebase/group/group').default;
const FBSlate = require('../../firebase/slate/slate').default;
const getGamesApi = require('../../api/getGames');

const signIn = async () => {
  await act(async () => {
    __setAuthUser({ uid: TEST_UID, email: 'test@example.com', displayName: 'Test User' });
  });
};

/** Mounts the page as a signed-in slate-picker and waits for the game list. */
const renderPage = async () => {
  render(<CreateSlate />, { wrapper: AllProviders });
  await signIn();
  expect(await screen.findByAltText('Home 1')).toBeInTheDocument();
};

beforeEach(() => {
  jest.clearAllMocks();
  __resetAuth();
  localStorage.clear();
  getGamesApi.getCurrentWeek.mockResolvedValue(seasonData);
  getGamesApi.getGames.mockResolvedValue(makeGames(12));
  FirebaseUsers.getDocumentInCollection.mockResolvedValue(userDoc());
  FirebaseGroups.getUserMemberships.mockResolvedValue([membership(['member', 'slate-picker'])]);
  FirebaseGroups.getGroup.mockResolvedValue({ id: TEST_GID, name: 'Test Group' });
  FirebaseGroups.getMembers.mockResolvedValue([{ uid: TEST_UID, fName: 'Test', lName: 'User', record: [] }]);
  FirebaseGroups.getAllPicks.mockResolvedValue([]);
  FirebaseGroups.getMemberPicks.mockResolvedValue([]);
  FirebaseGroups.getMember.mockResolvedValue({ uid: TEST_UID, record: [] });
  FirebaseGroups.getSlate.mockResolvedValue(undefined);
  FBSlate.addSlate.mockResolvedValue(undefined);
});

test('renders the fetched matchups with an add control for the slate-picker', async () => {
  await renderPage();

  expect(getGamesApi.getGames).toHaveBeenCalled();
  expect(screen.getAllByText('Add to slate')).toHaveLength(12);
  expect(screen.getByText('Soup picks: 0/10')).toBeInTheDocument();
});

test('toggling a game adds then removes it from the slate', async () => {
  await renderPage();

  userEvent.click(screen.getAllByLabelText('Add to slate')[0]);
  expect(await screen.findByText('Soup picks: 1/10')).toBeInTheDocument();
  expect(screen.getAllByText('Added to slate')).toHaveLength(1);

  userEvent.click(screen.getByLabelText('Added to slate'));
  expect(await screen.findByText('Soup picks: 0/10')).toBeInTheDocument();
});

test('the search box filters the rendered games', async () => {
  await renderPage();

  userEvent.type(screen.getByPlaceholderText('Search games...'), 'Home 7');
  await waitFor(() => expect(screen.queryByAltText('Home 1')).not.toBeInTheDocument());
  expect(screen.getByAltText('Home 7')).toBeInTheDocument();
});

test('an existing slate prepopulates the selections', async () => {
  FirebaseGroups.getSlate.mockResolvedValue(makeSlate(makeGames(10)));
  await renderPage();

  expect(await screen.findByText('Soup picks: 10/10')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Submit Slate' })).toBeEnabled();
});

test('submitting a full slate saves it and offers the picks link', async () => {
  FirebaseGroups.getSlate.mockResolvedValue(makeSlate(makeGames(10)));
  await renderPage();
  expect(await screen.findByText('Soup picks: 10/10')).toBeInTheDocument();

  userEvent.click(screen.getByRole('button', { name: 'Submit Slate' }));

  expect(await screen.findByText('Make your picks')).toBeInTheDocument();
  expect(FBSlate.addSlate).toHaveBeenCalledTimes(1);
  const [gid, slateArg] = FBSlate.addSlate.mock.calls[0];
  expect(gid).toBe(TEST_GID);
  expect(slateArg.games).toHaveLength(10);
  expect(slateArg.uniqueWeek).toBe('w5-2024');
});

test('a failed submit surfaces an error and no navigation action', async () => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  FirebaseGroups.getSlate.mockResolvedValue(makeSlate(makeGames(10)));
  FBSlate.addSlate.mockRejectedValue(new Error('write failed'));
  await renderPage();
  expect(await screen.findByText('Soup picks: 10/10')).toBeInTheDocument();

  userEvent.click(screen.getByRole('button', { name: 'Submit Slate' }));

  expect(await screen.findByText('Could not save the slate. Please try again.')).toBeInTheDocument();
  expect(screen.queryByText('Make your picks')).not.toBeInTheDocument();
});
