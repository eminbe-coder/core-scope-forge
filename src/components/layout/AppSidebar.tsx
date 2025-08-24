import { Building2, Home, Users, MapPin, Handshake, FolderKanban, Activity, Settings, LogOut, Cpu, Shield, UserCheck } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { useTenant } from '@/hooks/use-tenant';
import { TenantSwitcher } from './TenantSwitcher';

const navigation = [
  {
    title: 'Dashboard',
    icon: Home,
    href: '/',
  },
  {
    title: 'CRM',
    icon: Building2,
    items: [
      { title: 'Customers', href: '/customers', icon: Users },
      { title: 'Contacts', href: '/contacts', icon: UserCheck },
      { title: 'Deals', href: '/deals', icon: Handshake },
      { title: 'Activities', href: '/activities', icon: Activity },
    ],
  },
  {
    title: 'Projects',
    icon: FolderKanban,
    items: [
      { title: 'Projects', href: '/projects', icon: FolderKanban },
      { title: 'Sites', href: '/sites', icon: MapPin },
      { title: 'Devices', href: '/devices', icon: Cpu },
    ],
  },
  {
    title: 'Administration',
    icon: Shield,
    items: [
      { title: 'User Management', href: '/admin', icon: Shield },
    ],
  },
];

export function AppSidebar() {
  const location = useLocation();
  const { signOut } = useAuth();
  const { currentTenant } = useTenant();

  if (!currentTenant) {
    return null;
  }

  return (
    <Sidebar>
      <SidebarHeader>
        <TenantSwitcher />
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => (
                <SidebarMenuItem key={item.title}>
                  {item.items ? (
                    <>
                      <SidebarMenuButton className="font-medium">
                        <item.icon className="h-4 w-4" />
                        {item.title}
                      </SidebarMenuButton>
                      <SidebarMenuSub>
                        {item.items.map((subItem) => (
                          <SidebarMenuSubItem key={subItem.title}>
                            <SidebarMenuSubButton 
                              asChild
                              isActive={location.pathname === subItem.href}
                            >
                              <Link to={subItem.href}>
                                <subItem.icon className="h-4 w-4" />
                                {subItem.title}
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </>
                  ) : (
                    <SidebarMenuButton 
                      asChild
                      isActive={location.pathname === item.href}
                    >
                      <Link to={item.href}>
                        <item.icon className="h-4 w-4" />
                        {item.title}
                      </Link>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link to="/settings">
                <Settings className="h-4 w-4" />
                Settings
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={signOut}>
              <LogOut className="h-4 w-4" />
              Sign Out
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}