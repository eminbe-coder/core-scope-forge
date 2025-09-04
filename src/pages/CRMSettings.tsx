import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { 
  Layers,
  Target,
  DollarSign,
  Building,
  Tag,
  CheckSquare,
  Network,
  TrendingUp,
  Star,
  Navigation
} from 'lucide-react';

// Import CRM components
import { CRMSettings as DealStagesComponent } from '@/components/settings/CRMSettings';
import { TargetsManager } from '@/components/settings/TargetsManager';
import { CommissionSettings } from '@/components/settings/CommissionSettings';
import { CompanyIndustriesManager } from '@/components/settings/CompanyIndustriesManager';
import { CompanyTypesManager } from '@/components/settings/CompanyTypesManager';
import { TaskTypesSettings } from '@/components/settings/TaskTypesSettings';
import { RelationshipRolesSettings } from '@/components/settings/RelationshipRolesSettings';
import { LeadStagesManager } from '@/components/settings/LeadStagesManager';
import { LeadQualityManager } from '@/components/settings/LeadQualityManager';
import { DealSourcesManager } from '@/components/settings/DealSourcesManager';

const CRMSettingsPage = () => {
  const [activeSection, setActiveSection] = useState<string>('deal-stages');

  const menuItems = [
    {
      id: 'deal-stages',
      label: 'Deal Stages',
      icon: Layers,
      component: DealStagesComponent
    },
    {
      id: 'lead-stages',
      label: 'Lead Stages',
      icon: TrendingUp,
      component: LeadStagesManager
    },
    {
      id: 'lead-quality',
      label: 'Lead Quality',
      icon: Star,
      component: LeadQualityManager
    },
    {
      id: 'deal-sources',
      label: 'Deal Sources',
      icon: Navigation,
      component: DealSourcesManager
    },
    {
      id: 'targets',
      label: 'Targets',
      icon: Target,
      component: TargetsManager
    },
    {
      id: 'commission',
      label: 'Commission',
      icon: DollarSign,
      component: CommissionSettings
    },
    {
      id: 'company-industries',
      label: 'Company Industries',
      icon: Building,
      component: CompanyIndustriesManager
    },
    {
      id: 'company-types',
      label: 'Company Types',
      icon: Tag,
      component: CompanyTypesManager
    },
    {
      id: 'task-types',
      label: 'Task Types',
      icon: CheckSquare,
      component: TaskTypesSettings
    },
    {
      id: 'relationship-roles',
      label: 'Relationship Roles',
      icon: Network,
      component: RelationshipRolesSettings
    }
  ];

  const activeMenuItem = menuItems.find(item => item.id === activeSection);
  const ActiveComponent = activeMenuItem?.component;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">CRM Settings</h1>
          <p className="text-muted-foreground">
            Configure your CRM system settings, deal stages, targets, and commission rules
          </p>
        </div>

        <div className="flex gap-6">
          {/* Vertical Navigation */}
          <div className="w-64 space-y-2">
            {menuItems.map((item) => (
              <Button
                key={item.id}
                variant={activeSection === item.id ? 'default' : 'ghost'}
                className="w-full justify-start"
                onClick={() => setActiveSection(item.id)}
              >
                <item.icon className="mr-2 h-4 w-4" />
                {item.label}
              </Button>
            ))}
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {ActiveComponent && <ActiveComponent />}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CRMSettingsPage;