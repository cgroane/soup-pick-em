import { List, Text } from "grommet";
import React, { useMemo } from "react"
import { useGlobalContext } from "../context/user";

interface LeaderboardProps {
    items: { fName: string; lName: string; wins: number; losses: number; uid: string }[];
}
const Leaderboard = ({
  items
}: LeaderboardProps ) => {
    const { user } = useGlobalContext();
    const curUser = useMemo(() => items.findIndex((u) => u.uid === user?.id), [user?.id, items]);
  return (
    <>
      <List
        margin={{ bottom: '2rem' }}
        data={items}
        primaryKey={(item) => <Text>{item.fName} {item.lName}: {item.wins} - {item.losses}</Text>}
        itemKey={'uid'}
        itemProps={{
            [curUser]: {
                background: 'brand',
            }
        }}
      />
    </>
  )
};

export default Leaderboard;
