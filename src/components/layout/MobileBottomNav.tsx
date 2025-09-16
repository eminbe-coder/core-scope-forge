import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  CheckSquare, 
  LayoutDashboard, 
  Users, 
  Building2, 
  MapPin 
} from 'lucide-react';

const navItems = [
  {
    title: 'Dashboard',
    url: '/',
    icon: LayoutDashboard,
  },
  {
    title: 'To-Dos',
    url: '/my-todos',
    icon: CheckSquare,
  },
  {
    title: 'Contacts',
    url: '/contacts',
    icon: Users,
  },
  {
    title: 'Companies',
    url: '/companies',
    icon: Building2,
  },
  {
    title: 'Sites',
    url: '/sites',
    icon: MapPin,
  },
];

export function MobileBottomNav() {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-t border-border">
      <div className="grid grid-cols-5 gap-1 px-2 py-2">
        {navItems.map((item) => (
          <NavLink
            key={item.url}
            to={item.url}
            className={cn(
              "flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-colors text-xs",
              isActive(item.url)
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
          >
            <item.icon className="h-5 w-5 mb-1" />
            <span className="truncate max-w-full">{item.title}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}