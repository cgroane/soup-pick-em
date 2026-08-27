/**
 * Provider tree for the context/page integration tests, plus a re-export of the
 * shared fixtures.
 *
 * Test files must register the manual mocks themselves (jest.mock calls are
 * hoisted, so they can't live here):
 *
 *   jest.mock('firebase/auth');
 *   jest.mock('../../firebase/user/user');
 *   jest.mock('../../firebase/group/group');
 *   jest.mock('../../firebase/slate/slate');
 *   jest.mock('../../api/getGames');
 */
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import AuthContextProvider from '../context/auth';
import UIProvider from '../context/ui';
import GroupContextProvider from '../context/group';
import UserProvider from '../context/user';
import PickProvider from '../context/pick';
import CreateSlateContext from '../context/slate';

export * from './fixtures';

/** The real provider tree from src/index.tsx, minus CFP (nothing under test uses it). */
export const AllProviders: React.FC<React.PropsWithChildren> = ({ children }) => (
  <MemoryRouter>
    <AuthContextProvider>
      <UIProvider>
        <GroupContextProvider>
          <UserProvider>
            <PickProvider>
              <CreateSlateContext>{children}</CreateSlateContext>
            </PickProvider>
          </UserProvider>
        </GroupContextProvider>
      </UIProvider>
    </AuthContextProvider>
  </MemoryRouter>
);
