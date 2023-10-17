import React, { useEffect } from 'react'
import { getGames } from '../../api/getGames'
 
interface PicksProps {}
const Picks: React.FC<PicksProps> = ({}: PicksProps) => {

  useEffect(() => {
    getGames(8);
  }, [])
  return (
    <>Picks</>
  )
}
 
export default Picks
 
Picks.displayName = "Picks"