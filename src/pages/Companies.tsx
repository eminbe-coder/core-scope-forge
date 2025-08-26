import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Building, Globe, MapPin, Phone, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTenant } from '@/hooks/use-tenant';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Company {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  website?: string;
  industry?: string;
  size?: string;
  headquarters?: string;
  phone?: string;
  email?: string;
  logo_url?: string;
  notes?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export default function Companies() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { currentTenant } = useTenant();

  const fetchCompanies = async () => {
    if (!currentTenant) return;

    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .order('name', { ascending: true });

      if (error) throw error;
      setCompanies(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, [currentTenant]);

  const toggleCompanyStatus = async (companyId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('companies')
        .update({ active: !currentStatus })
        .eq('id', companyId);

      if (error) throw error;

      await fetchCompanies();
      toast({
        title: 'Success',
        description: `Company ${!currentStatus ? 'activated' : 'deactivated'} successfully`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p>Loading companies...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Companies</h1>
            <p className="text-muted-foreground">
              Manage your company relationships and partnerships
            </p>
          </div>
          <Button onClick={() => window.location.href = '/companies/add'}>
            <Plus className="h-4 w-4 mr-2" />
            Add Company
          </Button>
        </div>

        {companies.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                No Companies Found
              </CardTitle>
              <CardDescription>
                You haven't added any companies yet. Companies help you track your business relationships and partnerships.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => window.location.href = '/companies/add'}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Company
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Companies ({companies.length})
              </CardTitle>
              <CardDescription>
                Manage your company relationships and track business partnerships
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Industry</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companies.map((company) => (
                    <TableRow key={company.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{company.name}</div>
                          {company.description && (
                            <div className="text-sm text-muted-foreground">
                              {company.description}
                            </div>
                          )}
                          {company.website && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Globe className="h-3 w-3" />
                              <a href={company.website} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                {company.website}
                              </a>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{company.industry || '-'}</TableCell>
                      <TableCell>{company.size || '-'}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {company.headquarters && (
                            <div className="flex items-center gap-1 text-sm">
                              <MapPin className="h-3 w-3" />
                              {company.headquarters}
                            </div>
                          )}
                          {company.phone && (
                            <div className="flex items-center gap-1 text-sm">
                              <Phone className="h-3 w-3" />
                              {company.phone}
                            </div>
                          )}
                          {company.email && (
                            <div className="flex items-center gap-1 text-sm">
                              <Mail className="h-3 w-3" />
                              {company.email}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={company.active ? 'default' : 'secondary'}>
                          {company.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleCompanyStatus(company.id, company.active)}
                        >
                          {company.active ? 'Deactivate' : 'Activate'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}