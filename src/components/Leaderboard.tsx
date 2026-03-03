import React, { useMemo } from 'react';
import { useGlobalContext } from '../context/user';
import { cn } from 'lib/utils';

interface LeaderboardProps {
  items: { fName: string; lName: string; wins: number; losses: number; uid: string }[];
}

const Leaderboard = ({ items }: LeaderboardProps) => {
  const { user } = useGlobalContext();
  const curUser = useMemo(() => items.findIndex((u) => u.uid === user?.id), [user?.id, items]);

  return (
    <ul className="mb-8 space-y-1">
      {items.map((item, index) => (
        <li
          key={item.uid}
          className={cn(
            'px-4 py-2 rounded-md text-sm',
            index === curUser
              ? 'bg-primary text-white font-semibold'
              : 'bg-surface-elevated text-foreground'
          )}
        >
          {item.fName} {item.lName}: {item.wins} - {item.losses}
        </li>
      ))}
    </ul>
  );
};

export default Leaderboard;
