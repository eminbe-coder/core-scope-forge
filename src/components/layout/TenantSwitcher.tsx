import { ChevronsUpDown, Building2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useTenant } from '@/hooks/use-tenant';

export function TenantSwitcher() {
  const { currentTenant, userTenants, setCurrentTenant, isSuperAdmin } = useTenant();

  if (!currentTenant) {
    return (
      <div className="flex items-center gap-2 px-3 py-2">
        <Building2 className="h-5 w-5" />
        <span className="text-sm font-medium">Loading...</span>
      </div>
    );
  }

  // Group tenants by status for better organization
  const activeTenants = userTenants.filter(m => m.tenant.active);
  const inactiveTenants = userTenants.filter(m => !m.tenant.active);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-between px-3 py-2 h-auto min-w-[200px] bg-background/50 border border-border hover:bg-accent/50"
        >
          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-primary" />
            <div className="text-left">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{currentTenant.name}</span>
                {!currentTenant.active && (
                  <Badge variant="secondary" className="text-xs">Inactive</Badge>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                {currentTenant.slug}
                {isSuperAdmin && (
                  <span className="ml-1">• Super Admin</span>
                )}
              </div>
            </div>
          </div>
          <ChevronsUpDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 max-h-96 overflow-y-auto" align="start">
        {/* Active Tenants */}
        {activeTenants.length > 0 && (
          <>
            <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
              Active Tenants ({activeTenants.length})
            </div>
            {activeTenants.map((membership) => (
              <DropdownMenuItem
                key={membership.tenant_id}
                onClick={() => setCurrentTenant(membership.tenant)}
                className="cursor-pointer p-3"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-4 w-4 text-primary" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{membership.tenant.name}</span>
                        {currentTenant.id === membership.tenant_id && (
                          <Check className="h-3 w-3 text-primary" />
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {membership.role} • {membership.tenant.slug}
                      </div>
                      {membership.tenant.company_location && (
                        <div className="text-xs text-muted-foreground">
                          📍 {membership.tenant.company_location}
                        </div>
                      )}
                    </div>
                  </div>
                  <Badge 
                    variant={membership.role === 'super_admin' ? 'destructive' : 
                           membership.role === 'admin' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {membership.role.replace('_', ' ')}
                  </Badge>
                </div>
              </DropdownMenuItem>
            ))}
          </>
        )}

        {/* Inactive Tenants (Super Admin only) */}
        {isSuperAdmin && inactiveTenants.length > 0 && (
          <>
            {activeTenants.length > 0 && <DropdownMenuSeparator />}
            <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
              Inactive Tenants ({inactiveTenants.length})
            </div>
            {inactiveTenants.map((membership) => (
              <DropdownMenuItem
                key={membership.tenant_id}
                onClick={() => setCurrentTenant(membership.tenant)}
                className="cursor-pointer p-3 opacity-75"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{membership.tenant.name}</span>
                        <Badge variant="outline" className="text-xs">Inactive</Badge>
                        {currentTenant.id === membership.tenant_id && (
                          <Check className="h-3 w-3 text-primary" />
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {membership.role} • {membership.tenant.slug}
                      </div>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {membership.role.replace('_', ' ')}
                  </Badge>
                </div>
              </DropdownMenuItem>
            ))}
          </>
        )}

        {/* Empty state */}
        {userTenants.length === 0 && (
          <div className="p-3 text-center text-sm text-muted-foreground">
            No tenants available
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}