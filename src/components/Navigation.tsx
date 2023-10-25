import { Button, Header, Menu } from 'grommet'
import { Home } from 'grommet-icons'
import React, { useCallback, useMemo } from 'react'
import styled from 'styled-components'
import { theme } from '../theme'
import { logout } from '../firebase/user/login'
import { useNavigate } from 'react-router-dom'
import { useGlobalContext } from '../context/user'
 
const StyledHeader = styled(Header)`
  background-color: ${({theme}) => theme.colors.lightBlue};
`

const Navigation: React.FC = () => {
  const navigate = useNavigate();
  const signOut = useCallback(() => {
    logout().then(() => navigate('/login'));
  }, [navigate])
  const {
    user
  } = useGlobalContext();

  const menuItems = useMemo(() => {
    const loggedInItems = [
      {
        label: 'Profile',
        onClick: () => navigate('/profile')
      },
      {
        label: 'Logout',
        onClick: () => signOut()
      },
      {
        label: 'Choose Slate Maker',
        onClick: () => navigate('/choose-picker')
      }
    ];
    const loggedOut = [
      {
        label: 'Login',
        onClick: () => navigate('/login')
      }
    ]
    return !!user?.isAuthenticated ? loggedInItems : loggedOut;
  }, [user?.isAuthenticated, navigate, signOut])
  return (
    <StyledHeader gridArea='header' sticky='scrollup' >
      <Button icon={<Home color={theme.colors.darkBlue} />} hoverIndicator onClick={() => navigate('/dashboard')} />
      {<Menu color={theme.colors.darkBlue} label="Account" items={menuItems} />}
    </StyledHeader>
  )
}
 
export default Navigation
 
Navigation.displayName = "Navigation"