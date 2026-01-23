import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useTenant } from '@/hooks/use-tenant';
import { TenantSelector } from '@/components/auth/TenantSelector';
import Dashboard from './Dashboard';

const Index = () => {
  const { user, loading: authLoading } = useAuth();
  const { currentTenant, userTenants, loading: tenantLoading, setCurrentTenant } = useTenant();
  const [showTenantSelector, setShowTenantSelector] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      window.location.href = '/auth';
    }
  }, [user, authLoading]);

  // Multi-tenant logic: show selector if user has multiple tenants and none selected
  useEffect(() => {
    if (!tenantLoading && user && userTenants.length > 1 && !currentTenant) {
      setShowTenantSelector(true);
    } else if (currentTenant) {
      setShowTenantSelector(false);
    }
  }, [tenantLoading, user, userTenants, currentTenant]);

  const handleTenantSelect = (tenant: any) => {
    setCurrentTenant(tenant);
    setShowTenantSelector(false);
  };

  if (authLoading || tenantLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Loading...</h1>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Show tenant selector for multi-tenant users
  if (showTenantSelector && userTenants.length > 1) {
    return <TenantSelector tenants={userTenants} onSelect={handleTenantSelect} />;
  }

  return <Dashboard />;
};

export default Index;
