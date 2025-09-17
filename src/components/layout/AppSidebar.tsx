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

// Navigation for Super Admins (Core Platform)
const corePlatformModules: NavigationModule[] = [
  {
    title: 'Core Platform',
    items: [
      {
        title: 'Core Platform',
        url: '/global-admin',
        icon: Shield,
        permission: 'super_admin.access',
      },
    ]
  },
];

// Navigation for Tenant Users
const tenantModules: NavigationModule[] = [
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
        url: '/my-todos',
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
        title: 'System Tests',
        url: '/contract-tests',
        icon: Settings,
        permission: 'admin.access',
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
    title: 'Design Module',
    items: [
      {
        title: 'Design Creation',
        url: '/projects',
        icon: FolderOpen,
        permission: 'projects.read',
      },
    ]
  },
  {
    title: 'Device Management',
    items: [
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
        title: 'General Settings',
        url: '/settings',
        icon: Settings,
        permission: 'admin.access',
      },
      {
        title: 'CRM Settings',
        url: '/crm-settings',
        icon: Settings,
        permission: 'admin.access',
      },
      {
        title: 'To-Do Engine Settings',
        url: '/todo-engine-settings',
        icon: CheckSquare,
        permission: 'admin.access',
      },
    ]
  },
];

export function AppSidebar() {
  const location = useLocation();
  const { hasPermission, isAdmin } = usePermissions();
  const { hasGlobalAccess, currentTenant } = useTenant();
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
        return hasGlobalAccess;
      }
      if (item.permission === 'admin.access') {
        return isAdmin;
      }
      if (item.permission) {
        return hasPermission(item.permission);
      }
      return true;
    });
  };

  // Determine which navigation to show based on context
  // Show Core Platform navigation only when on /global-admin route AND user has global access
  const showCorePlatform = location.pathname === '/global-admin' && hasGlobalAccess;
  
  // Show tenant modules when in tenant context (not on global-admin route)
  const navigationModules = showCorePlatform ? corePlatformModules : tenantModules;

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