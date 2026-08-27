import React from 'react';
import { useEmailAndPassword } from '../hooks/useEmailAndPassword';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useAuthContext } from '../context/auth';
import { useAuthStateContext } from '../context/auth/auth-state';
// import { getAuth, signInWithCustomToken } from 'firebase/auth';

const LoginAndSignUp: React.FC = () => {
  const { handleChange, handleSubmit, newUser, setNewUser } = useEmailAndPassword();
  const { signInWithGoogle } = useAuthContext();
  const { pending, error } = useAuthStateContext();
  /**
   * 
   * @param userId 
  const impersonateAuth = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/impersonate?userId=${userId}`);
      const data = await response.json();
      if (data.customToken) {
        await signInWithCustomToken(getAuth(), data.customToken);
        navigate('/profile');
      }
    } catch (error) {
      console.error('Impersonation failed', error);
    }
  }
   */

  return (
    <div className="flex flex-col items-center px-6 py-12 gap-6">
      <div className="w-full max-w-sm">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {newUser && (
            <>
              <Input onChange={handleChange} name="fName" placeholder="First Name" />
              <Input onChange={handleChange} name="lName" placeholder="Last Name" />
            </>
          )}
          <Input onChange={handleChange} name="email" placeholder="Email" type="email" />
          <Input onChange={handleChange} name="password" placeholder="Password" type="password" />
          <div className="flex flex-col gap-2 mt-2">
            <Button type="submit" className="w-full" disabled={pending}>
              {newUser ? 'Register' : 'Login'}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={pending}
              onClick={() => signInWithGoogle()}
            >
              {newUser ? 'Register with Google' : 'Sign In with Google'}
            </Button>
          </div>
          {error && <p className="text-sm text-destructive text-center">{error}</p>}
        </form>
        <p
          className="mt-4 text-center text-sm text-muted-foreground cursor-pointer hover:text-foreground"
          onClick={() => setNewUser(!newUser)}
        >
          {newUser ? 'Already have an account? Sign In' : 'New User? Sign up'}
        </p>
      </div>
    </div>
  );
};

export default LoginAndSignUp;

LoginAndSignUp.displayName = 'LoginAndSignUp';
