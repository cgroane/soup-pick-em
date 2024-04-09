import { Button, CardBody, Carousel, Heading } from 'grommet'
import React, { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import WinPercentage from '../../components/WinPercentage'
import { ProfileCard } from '../../components/Styled'
import { LoadingState, useUIContext } from '../../context/ui'
import { useGlobalContext } from '../../context/user'
import { usePickContext } from '../../context/pick'
import Loading from '../../components/Loading'
import { useSlateContext } from '../../context/slate'
import { LeaderBoardData } from '../../model'
import Leaderboard from '../../components/Leaderboard'

/**
 * show record
 * show last week results
 * show nth week results
 * 
 */

interface ProfileProps {}
const Profile: React.FC<ProfileProps> = () => {

  const { seasonData, setStatus, status, usePostSeason } = useUIContext();
  const { user, users, fetchUsers, userOverallRecord} = useGlobalContext();
  const { slate, fetchSlate } = usePickContext();
  const { canEdit } = useSlateContext();

  useEffect(() => {
    Promise.all([
      fetchUsers().then(() => null),
      fetchSlate({ week: seasonData?.ApiWeek, year: !usePostSeason ? seasonData?.Season.toString() : `${seasonData?.Season}POST` }).then(() => null)
    ]).then(() => setStatus(LoadingState.IDLE));
  }, [fetchSlate, fetchUsers, setStatus, seasonData?.ApiWeek, seasonData?.Season, usePostSeason])

  const hasPicksThisWeek = useMemo(() => {
    const allValid = user?.pickHistory?.find((h) => h.slateId === slate?.uniqueWeek)?.picks.filter((pick) => !!pick.selection);
    
    return allValid?.length === 10 && slate?.games?.length;
  }, [user?.pickHistory, slate?.uniqueWeek, slate?.games?.length]);

  const leaderBoard = useMemo(() => {

    return users?.reduce<LeaderBoardData[]>((acc, leader) => {
      const thisSeasonsRecord = leader?.record?.find((r) => r.year === seasonData?.Season);
      const wins = thisSeasonsRecord?.wins ?? 0;
      const losses = thisSeasonsRecord?.losses ?? 0;
      const pctg = (wins + losses > 0) ? wins / (wins + losses) : 0;
      acc = [
        ...acc,
        {
          fName: leader.fName,
          lName: leader.lName,
          uid: leader?.id,
          winsAndLosses: wins + losses,
          wins,
          losses,
          pctg,
        }
      ]
      return acc;
    }, [])
    ?.sort((a, b) => {
      return b.pctg - a.pctg
    })
  }, [users, seasonData?.Season]);
  const carouselFirstChild = useMemo(() => user?.record?.findIndex((r) => r.year === seasonData?.Season), [user?.record, seasonData?.Season])

  if (status === LoadingState.LOADING) {
    return <Loading iterations={4} type='profileCard'/>
  }
  return (
    <>
      <ProfileCard background='light-1' >
        <Heading margin={{ top: '0' }} size='medium'>
          {
            usePostSeason ? 'Bowl Season' : `Week ${seasonData?.ApiWeek ?? 1}, ${seasonData?.Season}`
          }
          </Heading>
          <CardBody>
          <Link style={{ textDecoration: 'none', width: '100%' }} to={'/choose-matchups'}>
            <Button primary label={canEdit ? `Pick Slate` : `View Games`}/>  
          </Link>
          </CardBody>
        </ProfileCard>
      <ProfileCard border={ hasPicksThisWeek ? {} : { color: 'status-warning', size: 'medium' }} background={'light-1'} >
        <Heading>{hasPicksThisWeek ? 'Change ' : 'Make '}your picks</Heading>
        <CardBody>
          { slate?.games?.length ? <Link to={'/pick'}><Button primary label={'Go to slate'} /></Link> : <Button primary disabled label={`Slate hasn't been chosen yet`}/>}
        </CardBody>
      </ProfileCard>
      <ProfileCard background='light-1' >
        <Heading margin={{ top: '0', bottom: '0' }} size='medium' >Win Percentage</Heading>
        <CardBody direction='row' pad={'small'} wrap>
          <Carousel
            wrap
            fill
            initialChild={carouselFirstChild as number >= 0 ? carouselFirstChild : 0}
          >
            {
              user?.record.map((r, ind) => <>
                <WinPercentage key={`r-${r.year}-${ind}`} wins={r.wins} losses={r.losses} label={r.year.toString()} />
              </>)
            }
            {
              <WinPercentage key={'overall'} wins={userOverallRecord.wins} losses={userOverallRecord?.losses} label='Overall' />
            }
          </Carousel>
        </CardBody>
      </ProfileCard>
      <ProfileCard background={'light-1'} >
        <Heading margin={{ top: '0' }} size='medium' >
          Leaderboard
        </Heading>
        <CardBody>
          <Leaderboard items={leaderBoard} />
          <Link to={'/picks'} >
            <Button label="see more" primary/>
          </Link>
        </CardBody>
      </ProfileCard>
    </>
  )
}
 
export default Profile
 
Profile.displayName = "Profile"