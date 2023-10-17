import { Button, Header, Menu } from 'grommet'
import { Home } from 'grommet-icons'
import React from 'react'
import styled from 'styled-components'
import { theme } from '../theme'
 
const StyledHeader = styled(Header)`
  background-color: ${({theme}) => theme.colors.lightBlue};
`

interface NavigationProps {

}
const Navigation: React.FC<NavigationProps> = ({}: NavigationProps) => {
  return (
    <StyledHeader>
      <Button icon={<Home color={theme.colors.darkBlue} />} hoverIndicator />
      <Menu color={theme.colors.darkBlue} label="account" items={[{ label: 'logout' }]} />
    </StyledHeader>
  )
}
 
export default Navigation
 
Navigation.displayName = "Navigation"