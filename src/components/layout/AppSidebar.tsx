import { NavLink, useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { usePermissions } from '@/hooks/use-permissions';
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  Contact, 
  Handshake, 
  MapPin, 
  FolderOpen, 
  Zap,
  Smartphone,
  Shield
} from 'lucide-react';

interface NavigationItem {
  title: string;
  url: string;
  icon: any;
  permission?: string;
}

interface NavigationModule {
  title: string;
  items: NavigationItem[];
}

const navigationModules: NavigationModule[] = [
  {
    title: 'Dashboard',
    items: [
      {
        title: 'Dashboard',
        url: '/',
        icon: LayoutDashboard,
      },
    ]
  },
  {
    title: 'CRM Module',
    items: [
      {
        title: 'Customers',
        url: '/customers',
        icon: Building2,
        permission: 'customers.read',
      },
      {
        title: 'Contacts',
        url: '/contacts',
        icon: Contact,
        permission: 'contacts.read',
      },
      {
        title: 'Deals',
        url: '/deals',
        icon: Handshake,
        permission: 'deals.read',
      },
      {
        title: 'Sites',
        url: '/sites',
        icon: MapPin,
        permission: 'sites.read',
      },
      {
        title: 'Activities',
        url: '/activities',
        icon: Zap,
        permission: 'activities.read',
      },
    ]
  },
  {
    title: 'Project Creation Module',
    items: [
      {
        title: 'Projects',
        url: '/projects',
        icon: FolderOpen,
        permission: 'projects.read',
      },
      {
        title: 'Devices',
        url: '/devices',
        icon: Smartphone,
        permission: 'devices.read',
      },
    ]
  },
  {
    title: 'Admin Panel',
    items: [
      {
        title: 'Admin',
        url: '/admin',
        icon: Shield,
        permission: 'admin.access',
      },
    ]
  },
];

export function AppSidebar() {
  const location = useLocation();
  const { hasPermission, isAdmin } = usePermissions();
  const currentPath = location.pathname;

  const isActive = (path: string) => {
    if (path === '/') {
      return currentPath === '/';
    }
    return currentPath.startsWith(path);
  };

  const getNavClass = (path: string) => {
    const active = isActive(path);
    return active 
      ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium' 
      : 'hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground';
  };

  const filterModuleItems = (items: NavigationItem[]) => {
    return items.filter(item => {
      // Show all items for now, can add permission checks later
      return true;
    });
  };

  return (
    <Sidebar className="border-r border-sidebar-border bg-sidebar">
      <SidebarContent>
        {navigationModules.map((module) => {
          const filteredItems = filterModuleItems(module.items);
          if (filteredItems.length === 0) return null;
          
          return (
            <SidebarGroup key={module.title}>
              <SidebarGroupLabel>{module.title}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {filteredItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink 
                          to={item.url} 
                          className={getNavClass(item.url)}
                        >
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>
    </Sidebar>
  );
}