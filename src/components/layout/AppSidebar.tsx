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
import { useTenant } from '@/hooks/use-tenant';
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
  Shield,
  Target,
  CheckSquare,
  DollarSign,
  Settings,
  BarChart3,
  Calendar,
  FileText,
  Bell
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
        title: 'Companies',
        url: '/companies',
        icon: Building2,
        permission: 'companies.read',
      },
      {
        title: 'Customers',
        url: '/customers',
        icon: Users,
        permission: 'customers.read',
      },
      {
        title: 'Contacts',
        url: '/contacts',
        icon: Contact,
        permission: 'contacts.read',
      },
      {
        title: 'Leads',
        url: '/leads',
        icon: Target,
        permission: 'leads.read',
      },
      {
        title: 'Deals',
        url: '/deals',
        icon: Handshake,
        permission: 'deals.read',
      },
      {
        title: 'Contracts',
        url: '/contracts',
        icon: FileText,
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
      {
        title: 'My To-Dos',
        url: '/todos',
        icon: CheckSquare,
        permission: 'activities.read',
      },
      {
        title: 'Notification Center',
        url: '/notification-center',
        icon: Bell,
        permission: 'activities.read',
      },
      {
        title: 'Report Engine',
        url: '/reports',
        icon: BarChart3,
        permission: 'reports.read',
      },
      {
        title: 'Scheduled Reports',
        url: '/scheduled-reports',
        icon: Calendar,
        permission: 'reports.read',
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
    title: 'Administration',
    items: [
      {
        title: 'Users & Roles',
        url: '/users-roles',
        icon: Users,
        permission: 'admin.access',
      },
      {
        title: 'CRM Settings',
        url: '/settings?tab=crm',
        icon: Settings,
        permission: 'admin.access',
      },
      {
        title: 'Global Admin',
        url: '/global-admin',
        icon: Shield,
        permission: 'super_admin.access',
      },
    ]
  },
];

export function AppSidebar() {
  const location = useLocation();
  const { hasPermission, isAdmin } = usePermissions();
  const { isSuperAdmin, userRole } = useTenant();
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
      if (item.permission === 'super_admin.access') {
        // Show Global Admin only for super admins
        return isSuperAdmin;
      }
      if (item.permission === 'admin.access') {
        return isAdmin;
      }
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