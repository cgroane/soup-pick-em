import { Box } from 'grommet'
import React from 'react'
import ActionLink from '../../components/ActionLink'
 
interface DashboardProps {}
const Dashboard: React.FC<DashboardProps> = () => {
  return (
    <Box pad={'1rem'} flex direction='row' width={'100%'} height={'100%'}>
      <ActionLink path='/pick' text='MAKE YOUR PICKS' />
    </Box>
  )
}
 
export default Dashboard
 
Dashboard.displayName = "Dashboard"