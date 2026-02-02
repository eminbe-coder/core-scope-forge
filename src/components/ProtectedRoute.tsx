import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { useTenant } from '@/hooks/use-tenant';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireTenant?: boolean; // Whether this route requires an active tenant
}

export function ProtectedRoute({ children, requireTenant = true }: ProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { currentTenant, loading: tenantLoading } = useTenant();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      window.location.href = '/auth';
    }
  }, [user, authLoading]);

  // Redirect to profile if no tenant access (instead of showing error)
  useEffect(() => {
    if (!authLoading && !tenantLoading && user && !currentTenant && requireTenant) {
      // Get current path to avoid redirect loop
      const currentPath = window.location.pathname;
      if (currentPath !== '/profile' && currentPath !== '/security-settings') {
        navigate('/profile', { replace: true });
      }
    }
  }, [user, authLoading, currentTenant, tenantLoading, requireTenant, navigate]);

  // Only show full-screen loader on initial load when user is null
  // Once user exists, never show loader again to prevent form data loss during background refreshes
  if (authLoading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // If tenant is required but not available, show loading while redirecting
  if (requireTenant && !currentTenant && !tenantLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Redirecting to your profile...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}