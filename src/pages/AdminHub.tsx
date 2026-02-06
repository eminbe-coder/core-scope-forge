import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { usePermissions } from '@/hooks/use-permissions';
import { useTenant } from '@/hooks/use-tenant';
import {
  Settings,
  Layers,
  Target,
  DollarSign,
  Building,
  Tag,
  Network,
  TrendingUp,
  Star,
  Navigation,
  Flag,
  Trophy,
  Palette,
  Boxes,
  Users,
  Shield,
  GitBranch,
  Building2,
  Trash2,
  FileText,
  CloudIcon,
  Coins,
  CheckSquare
} from 'lucide-react';

// Import components for each section
import { CRMSettings as DealStagesComponent } from '@/components/settings/CRMSettings';
import { TargetsManager } from '@/components/settings/TargetsManager';
import { CommissionSettings } from '@/components/settings/CommissionSettings';
import { CompanyIndustriesManager } from '@/components/settings/CompanyIndustriesManager';
import { CompanyTypesManager } from '@/components/settings/CompanyTypesManager';
import { RelationshipRolesSettings } from '@/components/settings/RelationshipRolesSettings';
import { LeadStagesManager } from '@/components/settings/LeadStagesManager';
import { LeadQualityManager } from '@/components/settings/LeadQualityManager';
import { DealSourcesManager } from '@/components/settings/DealSourcesManager';
import { DealStatusesManager } from '@/components/settings/DealStatusesManager';
import { SolutionCategoriesManager } from '@/components/settings/SolutionCategoriesManager';
import { TenantBrandManager } from '@/components/settings/TenantBrandManager';
import { TenantDeviceTypeManager } from '@/components/settings/TenantDeviceTypeManager';
import { BranchesManager } from '@/components/settings/BranchesManager';
import { DepartmentsManager } from '@/components/settings/DepartmentsManager';
import { CurrencySettings } from '@/components/settings/CurrencySettings';
import { OneDriveSettings } from '@/components/settings/OneDriveSettings';
import { TenantForm } from '@/components/forms/TenantForm';
import { TodoTypesManager } from '@/components/settings/TodoTypesManager';
import { RewardSystemManager } from '@/components/settings/RewardSystemManager';

type Section = 
  // CRM
  | 'deal-stages' | 'lead-stages' | 'lead-quality' | 'deal-sources' | 'deal-statuses' | 'targets' | 'commission' | 'rewards'
  // Entities
  | 'company-industries' | 'company-types' | 'relationship-roles' | 'solution-categories' | 'brands' | 'device-types'
  // Management
  | 'users' | 'roles' | 'branches' | 'departments' | 'recycle-bin' | 'page-config' | 'todo-types'
  // System
  | 'org-info' | 'currency' | 'cloud-storage';

interface MenuItem {
  id: Section;
  label: string;
  icon: any;
  component?: React.ComponentType<any>;
}

interface MenuCategory {
  title: string;
  items: MenuItem[];
}

const menuCategories: MenuCategory[] = [
  {
    title: 'CRM Configuration',
    items: [
      { id: 'deal-stages', label: 'Deal Stages', icon: Layers, component: DealStagesComponent },
      { id: 'lead-stages', label: 'Lead Stages', icon: TrendingUp, component: LeadStagesManager },
      { id: 'lead-quality', label: 'Lead Quality', icon: Star, component: LeadQualityManager },
      { id: 'deal-sources', label: 'Deal Sources', icon: Navigation, component: DealSourcesManager },
      { id: 'deal-statuses', label: 'Deal Statuses', icon: Flag, component: DealStatusesManager },
      { id: 'targets', label: 'Targets', icon: Target, component: TargetsManager },
      { id: 'commission', label: 'Commission', icon: DollarSign, component: CommissionSettings },
      { id: 'rewards', label: 'Rewards', icon: Trophy, component: RewardSystemManager },
    ]
  },
  {
    title: 'Entity Settings',
    items: [
      { id: 'company-industries', label: 'Industries', icon: Building, component: CompanyIndustriesManager },
      { id: 'company-types', label: 'Company Types', icon: Tag, component: CompanyTypesManager },
      { id: 'relationship-roles', label: 'Relationship Roles', icon: Network, component: RelationshipRolesSettings },
      { id: 'solution-categories', label: 'Solution Categories', icon: CheckSquare, component: SolutionCategoriesManager },
      { id: 'brands', label: 'Brands', icon: Palette, component: TenantBrandManager },
      { id: 'device-types', label: 'Device Types', icon: Boxes, component: TenantDeviceTypeManager },
    ]
  },
  {
    title: 'Management',
    items: [
      { id: 'users', label: 'Users & Roles', icon: Users },
      { id: 'branches', label: 'Branches', icon: GitBranch, component: BranchesManager },
      { id: 'departments', label: 'Departments', icon: Building2, component: DepartmentsManager },
      { id: 'todo-types', label: 'To-Do Types', icon: CheckSquare, component: TodoTypesManager },
      { id: 'recycle-bin', label: 'Recycle Bin', icon: Trash2 },
      { id: 'page-config', label: 'Page Layouts', icon: FileText },
    ]
  },
  {
    title: 'System Settings',
    items: [
      { id: 'org-info', label: 'Organization Info', icon: Building2 },
      { id: 'currency', label: 'Currency & Rates', icon: Coins, component: CurrencySettings },
      { id: 'cloud-storage', label: 'Cloud Storage', icon: CloudIcon, component: OneDriveSettings },
    ]
  }
];

const AdminHub = () => {
  const navigate = useNavigate();
  const { isAdmin } = usePermissions();
  const { currentTenant, refreshTenants, refreshCurrentTenant } = useTenant();
  const [activeSection, setActiveSection] = useState<Section>('deal-stages');
  const [isEditingTenant, setIsEditingTenant] = useState(false);

  const handleTenantUpdateSuccess = async () => {
    setIsEditingTenant(false);
    await refreshCurrentTenant();
    await refreshTenants();
  };

  // Find the active menu item
  const allItems = menuCategories.flatMap(cat => cat.items);
  const activeItem = allItems.find(item => item.id === activeSection);

  // Handle navigation items
  const handleSectionClick = (sectionId: Section) => {
    if (sectionId === 'users') {
      navigate('/users-roles');
    } else if (sectionId === 'recycle-bin') {
      navigate('/recycle-bin');
    } else if (sectionId === 'page-config') {
      navigate('/admin/page-editor');
    } else {
      setActiveSection(sectionId);
    }
  };

  // Render content based on active section
  const renderContent = () => {
    if (activeSection === 'org-info') {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Organization Information
            </CardTitle>
            <CardDescription>
              Manage your organization's profile and settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!isEditingTenant ? (
              <div className="space-y-4">
                {currentTenant && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Company Name:</span>
                        <p className="text-muted-foreground">{currentTenant.name}</p>
                      </div>
                      <div>
                        <span className="font-medium">Country:</span>
                        <p className="text-muted-foreground">{currentTenant.country || 'Not set'}</p>
                      </div>
                      <div>
                        <span className="font-medium">Location:</span>
                        <p className="text-muted-foreground">{currentTenant.company_location || 'Not set'}</p>
                      </div>
                      <div>
                        <span className="font-medium">CR Number:</span>
                        <p className="text-muted-foreground">{currentTenant.cr_number || 'Not set'}</p>
                      </div>
                      <div>
                        <span className="font-medium">Tax Number:</span>
                        <p className="text-muted-foreground">{currentTenant.tax_number || 'Not set'}</p>
                      </div>
                      <div>
                        <span className="font-medium">Contact Email:</span>
                        <p className="text-muted-foreground">{currentTenant.contact_email || 'Not set'}</p>
                      </div>
                    </div>
                  </div>
                )}
                <Button onClick={() => setIsEditingTenant(true)}>
                  Edit Organization Info
                </Button>
              </div>
            ) : (
              <TenantForm
                tenant={currentTenant}
                onSuccess={handleTenantUpdateSuccess}
                onCancel={() => setIsEditingTenant(false)}
              />
            )}
          </CardContent>
        </Card>
      );
    }

    // Use component if available
    if (activeItem?.component) {
      const Component = activeItem.component;
      return <Component />;
    }

    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Select a setting from the menu</p>
        </CardContent>
      </Card>
    );
  };

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-center">Access Denied</CardTitle>
              <CardDescription className="text-center">
                You need admin privileges to access this page.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings className="h-8 w-8" />
            Admin Hub
          </h1>
          <p className="text-muted-foreground">
            Configure organization settings for {currentTenant?.name}
          </p>
        </div>

        <div className="flex gap-6">
          {/* Sidebar Navigation */}
          <div className="w-64 shrink-0 space-y-6">
            {menuCategories.map((category) => (
              <div key={category.title} className="space-y-1">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2">
                  {category.title}
                </h3>
                {category.items.map((item) => (
                  <Button
                    key={item.id}
                    variant={activeSection === item.id ? 'secondary' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => handleSectionClick(item.id)}
                  >
                    <item.icon className="mr-2 h-4 w-4" />
                    {item.label}
                  </Button>
                ))}
              </div>
            ))}
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {renderContent()}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminHub;
