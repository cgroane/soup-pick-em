import React, { useCallback, useMemo } from 'react';
import { Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useGlobalContext } from '../context/user';
import FirebaseUsersClassInstance from '../firebase/user/user';
import { UserRoles } from '../utils/constants';
import { useUIContext } from '../context/ui';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from './ui/dropdown-menu';
import { Button } from './ui/button';
import { Menu } from 'lucide-react';

const Navigation: React.FC = () => {
  const navigate = useNavigate();
  const signOut = useCallback(() => {
    FirebaseUsersClassInstance.logout().then(() => navigate('/'));
  }, [navigate]);
  const { user } = useGlobalContext();
  const { usePostSeason } = useUIContext();

  const menuItems = useMemo(() => {
    const loggedInItems: { label: string; onClick: () => void }[] = [
      { label: 'Profile', onClick: () => navigate('/profile') },
      { label: 'Logout', onClick: () => signOut() },
    ];
    const loggedOut = [{ label: 'Login', onClick: () => navigate('/') }];
    if (usePostSeason) {
      loggedInItems.push({ label: 'CFP Bracket', onClick: () => navigate('/cfp-bracket') });
    }
    if (user?.roles?.includes(UserRoles.ADMIN)) {
      loggedInItems.push({ label: 'Choose Slate Maker', onClick: () => navigate('/choose-picker') });
      if (usePostSeason) {
        loggedInItems.push({ label: 'CFP Management', onClick: () => navigate('/admin-cfp') });
      }
    }
    return !!user?.isAuthenticated ? loggedInItems : loggedOut;
  }, [user?.isAuthenticated, navigate, signOut, user?.roles, usePostSeason]);

  return (
    <header className="flex items-center justify-between px-4 h-14 bg-surface border-b border-border flex-shrink-0">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => navigate('/profile')}
        aria-label="Home"
      >
        <Home className="h-5 w-5 text-foreground" />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Menu">
            <Menu className="h-5 w-5 text-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {menuItems.map((item) => (
            <React.Fragment key={item.label}>
              {item.label === 'Logout' && <DropdownMenuSeparator />}
              <DropdownMenuItem onClick={item.onClick}>
                {item.label}
              </DropdownMenuItem>
            </React.Fragment>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
};

export default Navigation;

Navigation.displayName = 'Navigation';
