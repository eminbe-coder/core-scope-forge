import { useTenant } from '@/hooks/use-tenant';
import { Navigate } from 'react-router-dom';

interface GlobalAdminRouteProps {
  children: React.ReactNode;
}

export function GlobalAdminRoute({ children }: GlobalAdminRouteProps) {
  const { hasGlobalAccess, currentTenant } = useTenant();

  // Only allow access if user has global access AND is in Platform tenant
  if (!hasGlobalAccess || currentTenant?.slug !== 'platform') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}