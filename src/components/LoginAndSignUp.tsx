import { Box, Button, Form, FormField, TextInput } from 'grommet'
import React from 'react'
import { useEmailAndPassword } from '../hooks/useEmailAndPassword'
import { loginWithGoogle } from '../firebase/user/login';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
 

const LoginButton = styled(Button)`
  height: 1.5rem;
  margin: 4px;
  background: ${({theme}) => theme.colors.darkBlue};
  color: ${({theme}) => theme.colors.white};
  border-color: ${({theme}) => theme.colors.white};
  
`
interface LoginAndSignUpProps {
  signUp: boolean;
}
const LoginAndSignUp: React.FC<LoginAndSignUpProps> = ({
  signUp
}: LoginAndSignUpProps) => {
  const { 
    // loginInfo,
    handleChange,
    handleSubmit
  } = useEmailAndPassword(signUp);
  const navigate = useNavigate()

  const googleAuth = async () => {
    loginWithGoogle().then(() => navigate('/profile'));
  }
  
  return (
    <>
      <Box align='center' pad={'xlarge'} gap='medium'>
      <Box
        align="center"
        pad='medium' 
        width="medium"
        height="medium"
      >
      <Form onSubmit={handleSubmit}>
        <FormField>
          <TextInput onChange={handleChange} name='email' placeholder='Email' />
        </FormField>
        <FormField>
          <TextInput onChange={handleChange} name='password' placeholder='Password' />
        </FormField>
        <Box margin={{ top: "medium" }} >
          <LoginButton
            pad={'medium'}
            type='submit'
            label='Login'
            justify='center'
            style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}
            />
          <LoginButton
            pad={'medium'}
            label={signUp ? 'Register with Google' : 'Sign In with Google'}
            onClick={() => googleAuth()}
            justify='center'
            style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}
          />
        </Box>
        </Form>
        </Box>
      </Box>
    </>
  )
}
 
export default LoginAndSignUp
 
LoginAndSignUp.displayName = "LoginAndSignUp"
