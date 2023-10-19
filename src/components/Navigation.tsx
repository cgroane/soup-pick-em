import { Button, Header, Menu } from 'grommet'
import { Home } from 'grommet-icons'
import React from 'react'
import styled from 'styled-components'
import { theme } from '../theme'
import { logout } from '../firebase/user/login'
import { useNavigate } from 'react-router-dom'
 
const StyledHeader = styled(Header)`
  background-color: ${({theme}) => theme.colors.lightBlue};
`

const Navigation: React.FC = () => {
  const navigate = useNavigate();
  const signOut = () => {
    logout().then(() => navigate('/login'));
  }
  return (
    <StyledHeader gridArea='header' sticky='scrollup' >
      <Button icon={<Home color={theme.colors.darkBlue} />} hoverIndicator />
      <Menu color={theme.colors.darkBlue} label="account" items={[{ label: 'logout', onClick: () => signOut() }]} />
    </StyledHeader>
  )
}
 
export default Navigation
 
Navigation.displayName = "Navigation"