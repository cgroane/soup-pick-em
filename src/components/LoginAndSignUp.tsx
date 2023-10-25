import { Box, Button, Form, FormField, Paragraph, TextInput } from 'grommet'
import React from 'react'
import { useEmailAndPassword } from '../hooks/useEmailAndPassword'
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { loginWithGoogle } from '../firebase/user/create';
 

const LoginButton = styled(Button)`
  height: 1.5rem;
  margin: 4px;
  background: ${({theme}) => theme.colors.darkBlue};
  color: ${({theme}) => theme.colors.white};
  border-color: ${({theme}) => theme.colors.white};
  
`;

const LoginAndSignUp: React.FC = () => {
  const { 
    handleChange,
    handleSubmit,
    newUser,
    setNewUser
  } = useEmailAndPassword();
  const navigate = useNavigate()

  const googleAuth = async () => {
    /**
     * if signIN -- auth and then getUser
     * if register -- auth then addUserDoc
     */
    loginWithGoogle().then(() => navigate('/dashboard'));
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
        {newUser && (
          <>
            <FormField>
              <TextInput onChange={handleChange} name='fName' placeholder='First Name' />
            </FormField>
            <FormField>
              <TextInput onChange={handleChange} name='lName' placeholder='Last Name' />
            </FormField>
          </>
        )}
        <FormField>
          <TextInput onChange={handleChange} name='email' placeholder='Email' />
        </FormField>
        <FormField>
          <TextInput onChange={handleChange} name='password' placeholder='Password' type='password' />
        </FormField>
        <Box margin={{ top: "medium" }} >
          <LoginButton
            pad={'medium'}
            type='submit'
            label={newUser ? 'Register' : 'Login'}
            justify='center'
            style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}
          />
          <LoginButton
            pad={'medium'}
            label={newUser ? 'Register with Google' : 'Sign In with Google'}
            onClick={() => googleAuth()}
            justify='center'
            style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}
          />
        </Box>
        </Form>
        <Box style={{ cursor: 'pointer' }} onClick={() => setNewUser(!newUser)}>
          <Paragraph>{newUser ? 'Already have an account? Sign In' : 'New User? Sign up'}</Paragraph>
        </Box>
        </Box>
      </Box>
    </>
  )
}
 
export default LoginAndSignUp
 
LoginAndSignUp.displayName = "LoginAndSignUp"
