import { Button, Header, Menu } from 'grommet'
import { Home } from 'grommet-icons'
import React, { useCallback, useMemo } from 'react'
import styled from 'styled-components'
import { theme } from '../theme'
import { useNavigate } from 'react-router-dom'
import { useGlobalContext } from '../context/user'
import FirebaseUsersClassInstance from '../firebase/user/user'
import { UserRoles } from '../utils/constants'
 
const StyledHeader = styled(Header)`
  background-color: ${({theme}) => theme.colors.lightBlue};
`

const Navigation: React.FC = () => {
  const navigate = useNavigate();
  const signOut = useCallback(() => {
    FirebaseUsersClassInstance.logout().then(() => navigate('/'));
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
    ];
    const loggedOut = [
      {
        label: 'Login',
        onClick: () => navigate('/')
      }
    ];
    if (user?.roles?.includes(UserRoles.ADMIN)) {
      loggedInItems.push({
        label: 'Choose Slate Maker',
        onClick: () => navigate('/choose-picker')
      });
    }
    return !!user?.isAuthenticated ? loggedInItems : loggedOut;
  }, [user?.isAuthenticated, navigate, signOut])
  return (
    <StyledHeader gridArea='header' sticky='scrollup' >
      <Button icon={<Home color={theme.colors.darkBlue} />} hoverIndicator onClick={() => navigate('/profile')} />
      {<Menu color={theme.colors.darkBlue} items={menuItems} />}
    </StyledHeader>
  )
}
 
export default Navigation
 
Navigation.displayName = "Navigation"