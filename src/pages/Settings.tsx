import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings, Users, Building2, Key, DollarSign, Cloud } from 'lucide-react';
import { CurrencySettings } from '@/components/settings/CurrencySettings';
import { OneDriveSettings } from '@/components/settings/OneDriveSettings';
import { BranchesManager } from '@/components/settings/BranchesManager';
import { DepartmentsManager } from '@/components/settings/DepartmentsManager';
import { TenantForm } from '@/components/forms/TenantForm';
import { useTenant } from '@/hooks/use-tenant';
import { usePermissions } from '@/hooks/use-permissions';
import { useState, useEffect } from 'react';

const SettingsPage = () => {
  const [activeSection, setActiveSection] = useState<string>('general');
  const [isEditingTenant, setIsEditingTenant] = useState(false);
  const { currentTenant, refreshTenants, refreshCurrentTenant } = useTenant();
  const { hasPermission } = usePermissions();

  // Check URL params for tab
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    if (tab) {
      setActiveSection(tab);
    }
  }, []);

  const handleTenantUpdateSuccess = async () => {
    setIsEditingTenant(false);
    await refreshCurrentTenant(); // Refresh current tenant data
    await refreshTenants(); // Refresh all tenant data
  };

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
            {hasPermission('settings_read') && (
              <Button
                variant={activeSection === 'general' ? 'default' : 'ghost'}
                className="w-full justify-start"
                onClick={() => setActiveSection('general')}
              >
                <Settings className="mr-2 h-4 w-4" />
                Tenant & Account
              </Button>
            )}
            {hasPermission('settings_read') && (
              <Button
                variant={activeSection === 'currency' ? 'default' : 'ghost'}
                className="w-full justify-start"
                onClick={() => setActiveSection('currency')}
              >
                <DollarSign className="mr-2 h-4 w-4" />
                Currency Settings
              </Button>
            )}
            {hasPermission('settings_read') && (
              <Button
                variant={activeSection === 'branches' ? 'default' : 'ghost'}
                className="w-full justify-start"
                onClick={() => setActiveSection('branches')}
              >
                <Building2 className="mr-2 h-4 w-4" />
                Branches
              </Button>
            )}
            {hasPermission('settings_read') && (
              <Button
                variant={activeSection === 'departments' ? 'default' : 'ghost'}
                className="w-full justify-start"
                onClick={() => setActiveSection('departments')}
              >
                <Users className="mr-2 h-4 w-4" />
                Departments
              </Button>
            )}
            {hasPermission('settings_read') && (
              <Button
                variant={activeSection === 'cloud' ? 'default' : 'ghost'}
                className="w-full justify-start"
                onClick={() => setActiveSection('cloud')}
              >
                <Cloud className="mr-2 h-4 w-4" />
                Cloud Storage
              </Button>
            )}
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {activeSection === 'general' && hasPermission('settings_read') && (
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      Tenant Settings
                    </CardTitle>
                    <CardDescription>
                      Manage your organization settings and company profile
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
                                <span className="font-medium">Default Currency:</span>
                                <p className="text-muted-foreground">
                                  {currentTenant.default_currency_id ? 'Set' : 'Not set'}
                                </p>
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
                              <div>
                                <span className="font-medium">Contact Phone:</span>
                                <p className="text-muted-foreground">
                                  {currentTenant.contact_phone_country_code && currentTenant.contact_phone_number 
                                    ? `${currentTenant.contact_phone_country_code}${currentTenant.contact_phone_number}`
                                    : 'Not set'
                                  }
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                        <Button onClick={() => setIsEditingTenant(true)}>
                          Edit Company Information
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

            {activeSection === 'currency' && hasPermission('settings_read') && <CurrencySettings />}

            {activeSection === 'branches' && hasPermission('settings_read') && <BranchesManager />}

            {activeSection === 'departments' && hasPermission('settings_read') && <DepartmentsManager />}

            {activeSection === 'cloud' && hasPermission('settings_read') && <OneDriveSettings />}

            {!hasPermission('settings_read') && (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
                  <p className="text-muted-foreground">
                    You don't have permission to access settings.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SettingsPage;