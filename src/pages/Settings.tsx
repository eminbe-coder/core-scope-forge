import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings, Users, Building2, Key, DollarSign, Cloud } from 'lucide-react';
import { CurrencySettings } from '@/components/settings/CurrencySettings';
import { CRMSettings } from '@/components/settings/CRMSettings';
import { OneDriveSettings } from '@/components/settings/OneDriveSettings';
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
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account and tenant settings
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
              General Settings
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
              variant={activeSection === 'users' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveSection('users')}
            >
              <Users className="mr-2 h-4 w-4" />
              User Management
            </Button>
            <Button
              variant={activeSection === 'permissions' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveSection('permissions')}
            >
              <Key className="mr-2 h-4 w-4" />
              Roles & Permissions
            </Button>
            <Button
              variant={activeSection === 'crm' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveSection('crm')}
            >
              <Settings className="mr-2 h-4 w-4" />
              CRM Settings
            </Button>
            <Button
              variant={activeSection === 'cloud' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveSection('cloud')}
            >
              <Cloud className="mr-2 h-4 w-4" />
              Cloud Storage
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

            {activeSection === 'crm' && <CRMSettings />}

            {activeSection === 'cloud' && <OneDriveSettings />}

            {activeSection === 'users' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    User Management
                  </CardTitle>
                  <CardDescription>
                    Manage users in your tenant - redirecting to Administration section
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      User management is available in the Administration section.
                    </p>
                    <Button 
                      onClick={() => window.location.href = '/users-roles'}
                      className="w-full"
                    >
                      Go to Users & Roles
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeSection === 'permissions' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    Roles & Permissions
                  </CardTitle>
                  <CardDescription>
                    Manage roles and permissions - redirecting to Administration section
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Role and permission management is available in the Administration section.
                    </p>
                    <Button 
                      onClick={() => window.location.href = '/users-roles'}
                      className="w-full"
                    >
                      Go to Users & Roles
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SettingsPage;