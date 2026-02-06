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
  FileSpreadsheet,
  Smartphone,
  Shield,
  Target,
  CheckSquare,
  DollarSign,
  Settings,
  BarChart3,
  Calendar,
  FileText,
  Bell,
  Trophy,
  Trash2,
  History
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

// Global Admin item for Platform super admins
const globalAdminItem: NavigationItem = {
  title: 'Global Admin',
  url: '/global-admin',
  icon: Shield,
  permission: 'super_admin.access',
};

// Navigation for Tenant Users
const tenantModules: NavigationModule[] = [
  {
    title: 'WORKSPACE',
    items: [
      {
        title: 'Dashboard',
        url: '/',
        icon: LayoutDashboard,
      },
      {
        title: 'Companies',
        url: '/companies',
        icon: Building2,
        permission: 'crm.customers.view',
      },
      {
        title: 'Customers',
        url: '/customers',
        icon: Users,
        permission: 'crm.customers.view',
      },
      {
        title: 'Contacts',
        url: '/contacts',
        icon: Contact,
        permission: 'crm.contacts.view',
      },
      {
        title: 'Leads',
        url: '/leads',
        icon: Target,
        permission: 'crm.contacts.view',
      },
      {
        title: 'Deals',
        url: '/deals',
        icon: Handshake,
        permission: 'crm.deals.view',
      },
      {
        title: 'Contracts',
        url: '/contracts',
        icon: FileText,
        permission: 'crm.deals.view',
      },
      {
        title: 'Quotes',
        url: '/quotes',
        icon: FileSpreadsheet,
        permission: 'crm.deals.view',
      },
      {
        title: 'Sites',
        url: '/sites',
        icon: MapPin,
        permission: 'crm.sites.view',
      },
      {
        title: 'Activities',
        url: '/activities',
        icon: Zap,
        permission: 'crm.activities.view',
      },
      {
        title: 'To-Dos',
        url: '/my-todos',
        icon: CheckSquare,
        permission: 'crm.activities.view',
      },
      {
        title: 'Design Creation',
        url: '/projects',
        icon: FolderOpen,
        permission: 'projects.view',
      },
      {
        title: 'Browse Devices',
        url: '/browse-devices',
        icon: Smartphone,
        permission: 'devices.view',
      },
      {
        title: 'Report Engine',
        url: '/reports',
        icon: BarChart3,
        permission: 'reports.view',
      },
    ]
  },
  {
    title: 'USER PREFERENCES',
    items: [
      {
        title: 'My Workspace',
        url: '/my-workspace',
        icon: Settings,
      },
      {
        title: 'Notifications',
        url: '/notification-center',
        icon: Bell,
        permission: 'crm.activities.view',
      },
      {
        title: 'Scheduled Reports',
        url: '/scheduled-reports',
        icon: Calendar,
        permission: 'reports.view',
      },
    ]
  },
  {
    title: 'ADMINISTRATION',
    items: [
      {
        title: 'Admin Hub',
        url: '/admin',
        icon: Settings,
        permission: 'admin.access',
      },
      {
        title: 'Users & Roles',
        url: '/users-roles',
        icon: Users,
        permission: 'admin.access',
      },
      {
        title: 'Activity Log',
        url: '/master-activity-log',
        icon: History,
        permission: 'admin.access',
      },
      {
        title: 'Devices',
        url: '/devices',
        icon: Smartphone,
        permission: 'devices.view',
      },
      {
        title: 'Device Templates',
        url: '/device-templates',
        icon: Settings,
        permission: 'device_templates.view',
      },
      {
        title: 'Recycle Bin',
        url: '/recycle-bin',
        icon: Trash2,
        permission: 'recycle_bin.view',
      },
      {
        title: 'Global Devices',
        url: '/global-devices',
        icon: Smartphone,
        permission: 'super_admin.access',
      },
      {
        title: 'Global Templates',
        url: '/global-device-templates',
        icon: Settings,
        permission: 'super_admin.access',
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
      // Always show dashboard
      if (item.url === '/') {
        return true;
      }
      
      if (item.permission === 'super_admin.access') {
        return hasGlobalAccess && currentTenant?.slug === 'platform';
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

  // Add Global Admin to Administration section for Platform super admins
  const navigationModules = tenantModules.map(module => {
    if (module.title === 'ADMINISTRATION' && hasGlobalAccess && currentTenant?.slug === 'platform') {
      return {
        ...module,
        items: [...module.items, globalAdminItem]
      };
    }
    return module;
  });

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