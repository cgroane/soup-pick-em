import React from 'react'
import { theme } from '../../theme'
import { Box, Text } from 'grommet';
 
interface ColorsProps {}
const Colors: React.FC<ColorsProps> = () => {
  const colors = Object.entries(theme.colors);
  return (
    <>
      {
        colors.map((color) => <>
          <Text>{color[0]}</Text>
          <Box height={'40px'} width={'40px'} background={color[1]}></Box>
        </>)
      }
    </>
  )
}
 
export default Colors
 
Colors.displayName = "Colors"