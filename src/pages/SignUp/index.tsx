import { Page } from 'grommet'
import React from 'react'
import styled from 'styled-components'
import LoginAndSignUp from '../../components/LoginAndSignUp'
 
interface SignUpProps {}
const SignUp: React.FC<SignUpProps> = ({}: SignUpProps) => {
  return (
    <Page>
      <LoginAndSignUp signUp />
    </Page>
  )
}
 
export default SignUp
 
SignUp.displayName = "SignUp"