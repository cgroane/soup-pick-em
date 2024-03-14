import { Page } from 'grommet'
import React from 'react'
import LoginAndSignUp from '../../components/LoginAndSignUp';
 
const Login: React.FC = () => {

  return (
    <Page>
      <LoginAndSignUp />
    </Page>
  )
}
 
export default Login
 
Login.displayName = "Login"