import { Box, Card, Heading } from 'grommet'
import React from 'react'
import { Link } from 'react-router-dom'
import WinPercentage from '../../components/WinPercentage'

/**
 * show record
 * show last week results
 * show nth week results
 * 
 */
 
interface ProfileProps {}
const Profile: React.FC<ProfileProps> = () => {

  return (
    <>
      <Link to={'/choose-matchups'}>Matchups</Link>
      <Link to={'/picks'}>Picks</Link>
      <Card
        pad={'3rem'}
        margin={'1rem auto'}
        background="light-1"
        width={'90%'}
      >
        <Heading margin={{ top: '0' }} size='medium' >Win Percentage</Heading>
        <WinPercentage />
      </Card>
    </>
  )
}
 
export default Profile
 
Profile.displayName = "Profile"