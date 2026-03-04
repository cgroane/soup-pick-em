import React, { useCallback } from 'react';
import { useEmailAndPassword } from '../hooks/useEmailAndPassword';
import { useNavigate } from 'react-router-dom';
import { useGlobalContext } from '../context/user';
import { UserCollectionData } from '../model';
import FirebaseUsersClassInstance from '../firebase/user/user';
import { Button } from './ui/button';
import { Input } from './ui/input';

const LoginAndSignUp: React.FC = () => {
  const { handleChange, handleSubmit, newUser, setNewUser } = useEmailAndPassword();
  const { setUser } = useGlobalContext();
  const navigate = useNavigate();

  const googleAuth = useCallback(async () => {
    FirebaseUsersClassInstance.loginWithGoogle()
      .then((res) => {
        navigate('/profile');
        if (res) setUser(res as UserCollectionData);
      })
      .catch((err) => alert(err.message));
  }, [setUser, navigate]);

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
            <Button type="submit" className="w-full">
              {newUser ? 'Register' : 'Login'}
            </Button>
            <Button type="button" variant="outline" className="w-full" onClick={() => googleAuth()}>
              {newUser ? 'Register with Google' : 'Sign In with Google'}
            </Button>
          </div>
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
