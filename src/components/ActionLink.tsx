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
    <Box
      background={'#EDF2F4'}
      pad={'8px'}
      height={'100%'}
      width={'100%'}
      
    >
      <ActionLinkWrapper to={`${path}`}>
        <Box width={'80%'} height={'200px'} flex direction='row' align='center' >
          <Text size='4rem' color={theme.colors.royal}>{text}</Text>
          <LinkNext size='xlarge' color={theme.colors.royal} fill={theme.colors.white} />
        </Box>
      </ActionLinkWrapper>
    </Box>
  )
}
 
export default ActionLink
 
ActionLink.displayName = "ActionLink"