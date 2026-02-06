import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RewardPointsModal } from '@/components/modals/RewardPointsModal';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import { useTenant } from '@/hooks/use-tenant';
import { usePermissions } from '@/hooks/use-permissions';
import { useRewardPoints } from '@/hooks/use-reward-points';
import { useProfile } from '@/hooks/use-profile';
import { TenantSwitcher } from './TenantSwitcher';
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown';
import { UniversalSearchBar } from '@/components/search/UniversalSearchBar';
import { LogOut, User, Palette, Home, Trophy, Shield, Hash } from 'lucide-react';

interface AppHeaderProps {
  title?: string;
  showHome?: boolean;
  customActions?: React.ReactNode;
}

export function AppHeader({ 
  title, 
  showHome = true, 
  customActions 
}: AppHeaderProps = {}) {
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const { currentTenant, isSuperAdmin } = useTenant();
  const { totalPoints, currentPoints, targetPoints, achieved } = useRewardPoints();
  const { profile } = useProfile();
  const navigate = useNavigate();
  const [rewardModalOpen, setRewardModalOpen] = useState(false);

  const displayName = profile 
    ? [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.email
    : user?.email || 'User';

  const getUserInitials = () => {
    if (!user?.email) return 'U';
    return user.email.charAt(0).toUpperCase();
  };

  const handleHomeClick = () => {
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-glass-border bg-glass-bg backdrop-blur-md supports-[backdrop-filter]:bg-glass-bg">
      <div className="flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          
          {/* Home Button */}
          {showHome && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleHomeClick}
              className="flex items-center gap-2 text-foreground hover:bg-accent/50"
            >
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">Home</span>
            </Button>
          )}
        </div>

        {/* Center Title/Breadcrumb or Tenant Switcher */}
        <div className="flex-1 flex justify-center">
          {title ? (
            <h1 className="text-lg font-semibold text-foreground">{title}</h1>
          ) : currentTenant ? (
            <TenantSwitcher />
          ) : null}
        </div>

        <div className="flex items-center gap-4">
          {/* Universal Search Bar */}
          <UniversalSearchBar />
          
          {/* Custom Actions */}
          {customActions && (
            <div className="flex items-center gap-2">
              {customActions}
            </div>
          )}
          
          {/* Notification Center */}
          <NotificationDropdown />
          
          {/* Reward Points Trophy */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setRewardModalOpen(true)}
            className="flex items-center space-x-1 px-3 py-1.5 bg-secondary/30 rounded-full border border-border/50 hover:bg-secondary/50 transition-colors"
          >
            {achieved ? (
              <div className="h-4 w-4 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 flex items-center justify-center">
                <span className="text-xs text-white font-bold">🏅</span>
              </div>
            ) : (
              <Trophy className="h-4 w-4 text-primary" />
            )}
            <span className="text-sm font-medium text-foreground hidden sm:inline">
              {currentPoints}/{targetPoints}
            </span>
            <span className="text-sm font-medium text-foreground sm:hidden">
              {currentPoints}/{targetPoints}
            </span>
          </Button>
          
          {/* Theme Switcher */}
          <Select value={theme} onValueChange={setTheme}>
            <SelectTrigger className="w-32 bg-glass-bg border-glass-border">
              <Palette className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover/95 backdrop-blur-md border-glass-border">
              <SelectItem value="grey">Grey</SelectItem>
              <SelectItem value="black">Black</SelectItem>
              <SelectItem value="white">White</SelectItem>
            </SelectContent>
          </Select>

          {/* User Avatar Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-10 w-10 rounded-full bg-glass-bg border border-glass-border hover:bg-accent/50"
              >
                <Avatar className="h-9 w-9">
                  <AvatarImage src="" alt="User avatar" />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              className="w-64 bg-popover/95 backdrop-blur-md border-glass-border" 
              align="end"
            >
              <div className="p-3">
                <p className="font-medium text-foreground">{displayName}</p>
                <p className="text-sm text-muted-foreground truncate">
                  {user?.email}
                </p>
                {profile?.account_id && (
                  <div className="flex items-center gap-1.5 mt-2">
                    <Hash className="h-3.5 w-3.5 text-primary" />
                    <span className="text-sm font-mono font-semibold text-primary">
                      {profile.account_id}
                    </span>
                    <span className="text-xs text-muted-foreground">SID</span>
                  </div>
                )}
              </div>
              <DropdownMenuSeparator className="bg-glass-border" />
              <DropdownMenuItem 
                onClick={() => navigate('/profile/personal')}
                className="text-foreground hover:bg-accent/50"
              >
                <User className="mr-2 h-4 w-4" />
                Personal Settings
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => navigate('/my-workspace')}
                className="text-foreground hover:bg-accent/50"
              >
                <Shield className="mr-2 h-4 w-4" />
                My Workspace
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-glass-border" />
              <DropdownMenuItem 
                onClick={signOut}
                className="text-destructive hover:bg-destructive/10"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      <RewardPointsModal 
        open={rewardModalOpen} 
        onOpenChange={setRewardModalOpen} 
      />
    </header>
  );
}