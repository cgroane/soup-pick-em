import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Navigation from '../../components/Navigation';
import Router from '../../routes';
import { providersAt, TEST_GID, TEST_UID, membership, userDoc, makeGames, makeSlate, seasonData } from '../../test-utils/harness';

jest.mock('firebase/auth');
jest.mock('../../firebase/user/user');
jest.mock('../../firebase/group/group');
jest.mock('../../firebase/slate/slate');
jest.mock('../../firebase/cfp/cfp', () => ({ FirebaseCFPInstance: {} }));
jest.mock('../../api/getGames');

const { __setAuthUser, __resetAuth } = require('firebase/auth');
const FirebaseUsers = require('../../firebase/user/user').default;
const FirebaseGroups = require('../../firebase/group/group').default;
const getGamesApi = require('../../api/getGames');

const renderAt = async ({ userRoles, groupRoles }: { userRoles: string[]; groupRoles: string[] }) => {
  FirebaseUsers.getDocumentInCollection.mockResolvedValue(
    userDoc({ roles: userRoles, isAuthenticated: true } as never)
  );
  FirebaseGroups.getUserMemberships.mockResolvedValue([membership(groupRoles)]);
  __setAuthUser({ uid: TEST_UID, email: 'test@example.com', displayName: 'Test User' });
  render(
    <>
      <Navigation />
      <Router />
    </>,
    { wrapper: providersAt('/impersonate') }
  );
};

const openMenu = async () => {
  fireEvent.keyDown(screen.getByRole('button', { name: 'Menu' }), { key: 'Enter' });
  await screen.findByRole('menuitem', { name: 'Profile' });
};

beforeEach(() => {
  jest.clearAllMocks();
  __resetAuth();
  localStorage.clear();
  getGamesApi.getCurrentWeek.mockResolvedValue(seasonData);
  getGamesApi.getGames.mockResolvedValue(makeGames(10));
  FirebaseGroups.getGroup.mockResolvedValue({ id: TEST_GID, name: 'Test Group', ownerUid: TEST_UID });
  FirebaseGroups.getMembers.mockResolvedValue([
    { uid: TEST_UID, fName: 'Test', lName: 'User', roles: [] },
    { uid: 'user-2', fName: 'David', lName: 'Member', roles: ['member'] },
  ]);
  FirebaseGroups.getAllPicks.mockResolvedValue([]);
  FirebaseGroups.getMemberPicks.mockResolvedValue([]);
  FirebaseGroups.getSlate.mockResolvedValue(makeSlate(makeGames(10)));
});

test('a global admin sees the Impersonate menu item and page', async () => {
  await renderAt({ userRoles: ['basic', 'admin'], groupRoles: ['member'] });

  expect(await screen.findByRole('heading', { name: 'Impersonate' })).toBeInTheDocument();
  expect(await screen.findByText('David Member')).toBeInTheDocument();
  await openMenu();
  expect(screen.getByRole('menuitem', { name: 'Impersonate' })).toBeInTheDocument();
});

test('a group owner who is not a global admin sees neither', async () => {
  await renderAt({ userRoles: ['basic'], groupRoles: ['member', 'owner', 'slate-picker'] });

  expect(await screen.findByText('You do not have permission to view this page')).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Impersonate' })).not.toBeInTheDocument();
  await openMenu();
  expect(screen.queryByRole('menuitem', { name: 'Impersonate' })).not.toBeInTheDocument();
});

test('a basic member sees neither', async () => {
  await renderAt({ userRoles: ['basic'], groupRoles: ['member'] });

  expect(await screen.findByText('You do not have permission to view this page')).toBeInTheDocument();
  await openMenu();
  expect(screen.queryByRole('menuitem', { name: 'Impersonate' })).not.toBeInTheDocument();
});
