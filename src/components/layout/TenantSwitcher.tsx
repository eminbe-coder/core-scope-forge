import { ChevronsUpDown, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTenant } from '@/hooks/use-tenant';

export function TenantSwitcher() {
  const { currentTenant, userTenants, setCurrentTenant } = useTenant();

  if (!currentTenant) {
    return (
      <div className="flex items-center gap-2 px-3 py-2">
        <Building2 className="h-5 w-5" />
        <span className="text-sm font-medium">Loading...</span>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-between px-3 py-2 h-auto"
        >
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            <div className="text-left">
              <div className="text-sm font-medium">{currentTenant.name}</div>
              <div className="text-xs text-muted-foreground">
                {currentTenant.slug}
              </div>
            </div>
          </div>
          <ChevronsUpDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="start">
        {userTenants.map((membership) => (
          <DropdownMenuItem
            key={membership.tenant_id}
            onClick={() => setCurrentTenant(membership.tenant)}
            className="cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <div>
                <div className="text-sm font-medium">{membership.tenant.name}</div>
                <div className="text-xs text-muted-foreground">
                  {membership.role} • {membership.tenant.slug}
                </div>
              </div>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}