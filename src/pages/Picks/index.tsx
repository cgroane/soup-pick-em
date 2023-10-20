import React, { useEffect } from 'react'
import { getGames } from '../../api/getGames'
 
const Picks: React.FC = () => {

  useEffect(() => {
    getGames(8);
  }, [])
  return (
    <>Picks</>
  )
}
 
export default Picks
 
Picks.displayName = "Picks"