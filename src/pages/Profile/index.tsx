import React from 'react'
import { Link } from 'react-router-dom'

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
    </>
  )
}
 
export default Profile
 
Profile.displayName = "Profile"