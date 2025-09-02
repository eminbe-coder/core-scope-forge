import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings, Users, Building2, Key, DollarSign, Cloud, CheckSquare } from 'lucide-react';
import { CurrencySettings } from '@/components/settings/CurrencySettings';
import { CRMSettings } from '@/components/settings/CRMSettings';
import { OneDriveSettings } from '@/components/settings/OneDriveSettings';
import { TaskTypesSettings } from '@/components/settings/TaskTypesSettings';
import { BranchesManager } from '@/components/settings/BranchesManager';
import { DepartmentsManager } from '@/components/settings/DepartmentsManager';
import { useState, useEffect } from 'react';

const SettingsPage = () => {
  const [activeSection, setActiveSection] = useState<string>('general');

  // Check URL params for tab
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    if (tab) {
      setActiveSection(tab);
    }
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">General Settings</h1>
          <p className="text-muted-foreground">
            Manage your organization settings, currency, branches, and departments
          </p>
        </div>

        <div className="flex gap-6">
          {/* Sidebar */}
          <div className="w-64 space-y-2">
            <Button
              variant={activeSection === 'general' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveSection('general')}
            >
              <Settings className="mr-2 h-4 w-4" />
              Tenant & Account
            </Button>
            <Button
              variant={activeSection === 'currency' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveSection('currency')}
            >
              <DollarSign className="mr-2 h-4 w-4" />
              Currency Settings
            </Button>
            <Button
              variant={activeSection === 'branches' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveSection('branches')}
            >
              <Building2 className="mr-2 h-4 w-4" />
              Branches
            </Button>
            <Button
              variant={activeSection === 'departments' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveSection('departments')}
            >
              <Users className="mr-2 h-4 w-4" />
              Departments
            </Button>
            <Button
              variant={activeSection === 'cloud' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveSection('cloud')}
            >
              <Cloud className="mr-2 h-4 w-4" />
              Cloud Storage
            </Button>
            <Button
              variant={activeSection === 'task-types' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveSection('task-types')}
            >
              <CheckSquare className="mr-2 h-4 w-4" />
              Task Types
            </Button>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {activeSection === 'general' && (
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      Tenant Settings
                    </CardTitle>
                    <CardDescription>
                      Manage your organization settings and preferences
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      General tenant settings and company profile management will be available here.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Account Information</CardTitle>
                    <CardDescription>
                      Your personal account details and preferences
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Account settings and profile management will be available here.
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeSection === 'currency' && <CurrencySettings />}

            {activeSection === 'branches' && <BranchesManager />}

            {activeSection === 'departments' && <DepartmentsManager />}

            {activeSection === 'crm' && <CRMSettings />}

            {activeSection === 'cloud' && <OneDriveSettings />}

            {activeSection === 'task-types' && <TaskTypesSettings />}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SettingsPage;