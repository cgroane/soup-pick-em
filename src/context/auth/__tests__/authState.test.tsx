/**
 * Auth state transitions. Guards two fixes: AUTH_PENDING never set `pending`,
 * and signing out spread `{ status: 'unauthenticated' }` onto prior state, so
 * the previous user's uid/email survived the sign-out.
 */
import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import AuthContextProvider, { useAuthContext } from '..';
import { useAuthStateContext } from '../auth-state';

jest.mock('firebase/auth');
jest.mock('../../../firebase/user/user');

const { __setAuthUser, __resetAuth } = require('firebase/auth');
const FirebaseUsers = require('../../../firebase/user/user').default;

const Probe: React.FC = () => {
  const { status, uid, email, pending, error, isAuthenticated } = useAuthStateContext();
  const { signIn, signInWithGoogle } = useAuthContext();
  const { pathname } = useLocation();
  return (
    <>
      <span data-testid="path">{pathname}</span>
      <span data-testid="status">{status}</span>
      <span data-testid="uid">{uid ?? 'none'}</span>
      <span data-testid="email">{email ?? 'none'}</span>
      <span data-testid="pending">{String(!!pending)}</span>
      <span data-testid="error">{error ?? 'none'}</span>
      <span data-testid="authed">{String(isAuthenticated)}</span>
      <button onClick={() => signIn('a@b.com', 'pw')}>sign in</button>
      <button onClick={() => signInWithGoogle()}>google</button>
    </>
  );
};

const renderProbe = () =>
  render(
    <MemoryRouter>
      <AuthContextProvider>
        <Probe />
      </AuthContextProvider>
    </MemoryRouter>
  );

beforeEach(() => {
  jest.clearAllMocks();
  __resetAuth();
});

test('signing in populates identity and clears pending', async () => {
  renderProbe();
  await act(async () => {
    __setAuthUser({ uid: 'user-1', email: 'test@example.com', displayName: 'Test User' });
  });

  expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
  expect(screen.getByTestId('uid')).toHaveTextContent('user-1');
  expect(screen.getByTestId('authed')).toHaveTextContent('true');
  expect(screen.getByTestId('pending')).toHaveTextContent('false');
});

test('signing out clears the previous identity, not just the status', async () => {
  renderProbe();
  await act(async () => {
    __setAuthUser({ uid: 'user-1', email: 'test@example.com', displayName: 'Test User' });
  });
  expect(screen.getByTestId('uid')).toHaveTextContent('user-1');

  await act(async () => {
    __setAuthUser(null);
  });

  expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated');
  expect(screen.getByTestId('uid')).toHaveTextContent('none');
  expect(screen.getByTestId('email')).toHaveTextContent('none');
  expect(screen.getByTestId('authed')).toHaveTextContent('false');
});

test('a failed sign-in records the error and stops pending', async () => {
  FirebaseUsers.logInWithEmailAndPassword.mockRejectedValue(new Error('bad password'));
  renderProbe();

  await act(async () => {
    screen.getByRole('button', { name: 'sign in' }).click();
  });

  await waitFor(() => expect(screen.getByTestId('error')).toHaveTextContent('bad password'));
  expect(screen.getByTestId('pending')).toHaveTextContent('false');
});

describe('a resolved-but-empty user doc is still a successful login', () => {
  // `loginWithGoogle` returns `addDocument(...)` for a first-time user, and
  // addDocument wraps setDoc, which resolves undefined. Reading that as a
  // failure bounced brand-new Google users back to the login screen.
  test('google sign-in with no returned doc navigates to the profile', async () => {
    FirebaseUsers.loginWithGoogle.mockResolvedValue(undefined);
    renderProbe();

    await act(async () => {
      screen.getByRole('button', { name: 'google' }).click();
    });

    await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent('/profile'));
    expect(screen.getByTestId('error')).toHaveTextContent('none');
  });

  test('email sign-in with no returned doc navigates to the profile', async () => {
    FirebaseUsers.logInWithEmailAndPassword.mockResolvedValue(undefined);
    renderProbe();

    await act(async () => {
      screen.getByRole('button', { name: 'sign in' }).click();
    });

    await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent('/profile'));
    expect(screen.getByTestId('error')).toHaveTextContent('none');
  });

  test('a rejected google sign-in reports the error and does not navigate', async () => {
    FirebaseUsers.loginWithGoogle.mockRejectedValue(new Error('popup closed'));
    renderProbe();

    await act(async () => {
      screen.getByRole('button', { name: 'google' }).click();
    });

    await waitFor(() => expect(screen.getByTestId('error')).toHaveTextContent('popup closed'));
    expect(screen.getByTestId('path')).toHaveTextContent('/');
    expect(screen.getByTestId('path')).not.toHaveTextContent('/profile');
  });
});
