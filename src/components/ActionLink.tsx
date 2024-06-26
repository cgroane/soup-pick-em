import { Box, Text } from 'grommet';
import React from 'react'
import { Link } from 'react-router-dom';
import { theme } from '../theme';
import { LinkNext } from 'grommet-icons';
import styled from 'styled-components';
 
interface ActionLinkProps {
  path: string;
  text: string;
}

const ActionLinkWrapper = styled(Link)`
  text-decoration: none;
  
`;

const ActionLink: React.FC<ActionLinkProps> = ({
  path,
  text
}: ActionLinkProps) => {
  return (    
    <ActionLinkWrapper to={`${path}`}>
      <Box width={'80%'} height={'200px'} flex direction='row' align='center' >
        <Text size='3.5rem' color={theme.colors.royal}>{text}</Text>
        <LinkNext size='xlarge' color={theme.colors.royal} fill={theme.colors.white} />
      </Box>
    </ActionLinkWrapper>
  )
}
 
export default ActionLink
 
ActionLink.displayName = "ActionLink"