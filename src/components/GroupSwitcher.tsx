import React from 'react';
import { ChevronDown, Check, Users } from 'lucide-react';
import { useGroupContext } from '../context/group';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Button } from './ui/button';

/**
 * Lets a user switch which group's results they're viewing. The active group
 * is persisted in localStorage by the GroupContext and scopes every read
 * (leaderboard, slate, picks) to that group's members.
 */
const GroupSwitcher: React.FC = () => {
  const { memberships, activeGroupId, activeGroup, setActiveGroup } = useGroupContext();

  if (!memberships.length) return null;

  const activeName =
    activeGroup?.name ?? memberships.find((m) => m.gid === activeGroupId)?.name ?? 'Group';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5" aria-label="Switch group">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="max-w-[10rem] truncate text-sm text-foreground">{activeName}</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {memberships.map((m) => (
          <DropdownMenuItem key={m.gid} onClick={() => setActiveGroup(m.gid)}>
            <span className="flex-1 truncate">{m.name}</span>
            {m.gid === activeGroupId && <Check className="ml-2 h-4 w-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default GroupSwitcher;

GroupSwitcher.displayName = 'GroupSwitcher';
