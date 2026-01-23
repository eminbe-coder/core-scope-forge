import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2 } from 'lucide-react';

interface Tenant {
  id: string;
  name: string;
  slug: string;
}

interface TenantSelectorProps {
  tenants: Array<{ tenant: Tenant; role: string }>;
  onSelect: (tenant: Tenant) => void;
}

export const TenantSelector = ({ tenants, onSelect }: TenantSelectorProps) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Select Organization</CardTitle>
          <CardDescription>
            You have access to multiple organizations. Please select one to continue.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {tenants.map((membership) => (
            <Button
              key={membership.tenant.id}
              variant="outline"
              className="w-full justify-start h-auto py-4"
              onClick={() => onSelect(membership.tenant)}
            >
              <Building2 className="h-5 w-5 mr-3 text-muted-foreground" />
              <div className="text-left">
                <div className="font-medium">{membership.tenant.name}</div>
                <div className="text-xs text-muted-foreground capitalize">
                  {membership.role}
                </div>
              </div>
            </Button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};
