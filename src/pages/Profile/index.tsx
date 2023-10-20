import React from 'react'
import { Link } from 'react-router-dom'
 
interface ProfileProps {}
const Profile: React.FC<ProfileProps> = () => {
  return (
    <>
      <Link to={'/choose-matchups'}>Matchups</Link>
    </>
  )
}
 
export default Profile
 
Profile.displayName = "Profile"