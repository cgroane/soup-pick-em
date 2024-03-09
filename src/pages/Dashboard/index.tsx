import { Box, Card } from 'grommet'
import React from 'react'
import ActionLink from '../../components/ActionLink'
 
interface DashboardProps {}
const Dashboard: React.FC<DashboardProps> = () => {
  return (
    <Box pad={'1rem'} flex direction='row' width={'100%'} height={'100%'}>
      <Card pad={'20px'} margin={'4px'} height="small" width="large" background="light-1" >
      <ActionLink path='/pick' text='MAKE YOUR PICKS' />

      </Card>
    </Box>
  )
}
 
export default Dashboard
 
Dashboard.displayName = "Dashboard"