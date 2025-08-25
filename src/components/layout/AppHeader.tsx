import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { LogOut, User, Palette, Home } from 'lucide-react';

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
  const { currentTenant } = useTenant();
  const navigate = useNavigate();

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

        {/* Center Title/Breadcrumb */}
        <div className="flex-1 flex justify-center">
          {title ? (
            <h1 className="text-lg font-semibold text-foreground">{title}</h1>
          ) : currentTenant ? (
            <h1 className="text-lg font-semibold text-foreground">
              {currentTenant.name}
            </h1>
          ) : null}
        </div>

        <div className="flex items-center gap-4">
          {/* Custom Actions */}
          {customActions && (
            <div className="flex items-center gap-2">
              {customActions}
            </div>
          )}
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
              className="w-56 bg-popover/95 backdrop-blur-md border-glass-border" 
              align="end"
            >
              <div className="flex items-center justify-start gap-2 p-2">
                <div className="flex flex-col space-y-1 leading-none">
                  <p className="font-medium text-foreground">{user?.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {currentTenant?.name}
                  </p>
                </div>
              </div>
              <DropdownMenuSeparator className="bg-glass-border" />
              <DropdownMenuItem className="text-foreground hover:bg-accent/50">
                <User className="mr-2 h-4 w-4" />
                Profile
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
    </header>
  );
}