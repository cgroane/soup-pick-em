import { Button, CardBody, Heading } from 'grommet'
import React, { useMemo } from 'react'
import { Link } from 'react-router-dom'
import WinPercentage from '../../components/WinPercentage'
import { ProfileCard } from '../../components/Styled'
import { useUIContext } from '../../context/ui'
import { useGlobalContext } from '../../context/user'
import { usePickContext } from '../../context/pick'

/**
 * show record
 * show last week results
 * show nth week results
 * 
 */

interface ProfileProps {}
const Profile: React.FC<ProfileProps> = () => {

  const { seasonData } = useUIContext();
  const { user, users } = useGlobalContext();
  const { slate } = usePickContext();

  const hasPicksThisWeek = useMemo(() => {
    return user?.pickHistory?.find((h) => h.slateId === slate?.uniqueWeek)?.picks.length === 10;
  }, [user?.pickHistory, slate?.uniqueWeek]);
  const leaderBoard = useMemo(() => {

    return users.map((leader) => {
      const wins = leader?.record?.wins ?? 0;
      const losses = leader?.record?.losses ?? 0;
      const pctg = (wins + losses > 0) ? wins / (wins + losses) : 0
      return {
        ...leader,
        winsAndLosses: wins + losses,
        wins: wins,
        losses: losses,
        pctg: pctg
      }
    })
    .sort((a, b) => {
      return b.pctg - a.pctg
    })
  }, [users])

  return (
    <>
      <ProfileCard background='light-1' >
        <Heading margin={{ top: '0' }} size='medium'>
          Week {seasonData?.ApiWeek ?? 1}, {seasonData?.ApiSeason}
          </Heading>
          <CardBody>
          <Link style={{ textDecoration: 'none', width: '100%' }} to={'/choose-matchups'}>
            <Button primary label="See Games"/>  
          </Link>
          </CardBody>
        </ProfileCard>
      <ProfileCard border={ hasPicksThisWeek ? {} : { color: 'status-warning', size: 'medium' }} background={'light-1'} >
        <Heading>{hasPicksThisWeek ? 'Change ' : 'Make '}your picks</Heading>
        <CardBody>
          <Link to={'/pick'}>
            <Button primary label={'Go to slate'} />
          </Link>
        </CardBody>
      </ProfileCard>
      <ProfileCard background='light-1' >
        <Heading margin={{ top: '0' }} size='medium' >Win Percentage</Heading>
        <CardBody direction='row' pad={'small'}>
          <WinPercentage />
        </CardBody>
      </ProfileCard>
      <ProfileCard background={'light-1'} >
        <Heading margin={{ top: '0' }} size='medium' >
          Leaderboard
        </Heading>
        <CardBody>
          <ol>
            {/* find user whose id === cur user id, make bold / highlighted somehow */}
            {leaderBoard.map((leader, index) => <li key={index} >{leader.fName} {leader.lName} {leader?.record?.wins}-{leader?.record?.losses}</li>)}
          </ol>
        </CardBody>
      </ProfileCard>
    </>
  )
}
 
export default Profile
 
Profile.displayName = "Profile"