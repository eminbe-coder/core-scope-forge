import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { useTenant } from '@/hooks/use-tenant';
import { toast } from 'sonner';

interface Brand {
  id: string;
  name: string;
  description?: string;
  logo_url?: string;
  active: boolean;
  is_global?: boolean;
  source_brand_id?: string;
}

export function TenantBrandManager() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { currentTenant } = useTenant();

  useEffect(() => {
    if (currentTenant) {
      loadBrands();
    }
  }, [currentTenant]);

  const loadBrands = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get all brands (global ones from imports and tenant-specific ones)
      const { data, error: fetchError } = await supabase
        .from('brands')
        .select('*')
        .eq('active', true)
        .order('name');

      if (fetchError) throw fetchError;

      // Show all global brands as they would be available through imports
      setBrands((data || []).map(brand => ({ ...brand, is_global: true })));
    } catch (error) {
      console.error('Error loading brands:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(`Failed to load brands: ${errorMessage}`);
      toast.error(`Failed to load brands: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Brand Management</CardTitle>
          <CardDescription>Loading brands...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Brand Management</CardTitle>
          <CardDescription className="text-destructive">{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={loadBrands} variant="outline">
            Retry Loading
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Brand Management</CardTitle>
        <CardDescription>
          Manage brands available to your organization. Global brands are imported from device templates.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {brands.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No brands available. Import device templates to get brand information.
            </div>
          ) : (
            <div className="grid gap-4">
              {brands.map((brand) => (
                <div key={brand.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {brand.logo_url && (
                      <img 
                        src={brand.logo_url} 
                        alt={brand.name}
                        className="w-8 h-8 object-contain"
                      />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{brand.name}</h3>
                        {brand.is_global && (
                          <Badge variant="secondary">Global</Badge>
                        )}
                      </div>
                      {brand.description && (
                        <p className="text-sm text-muted-foreground">{brand.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {brand.is_global ? (
                      <Badge variant="outline">Read-only</Badge>
                    ) : (
                      <>
                        <Button size="sm" variant="ghost">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <div className="pt-4 border-t">
            <Button disabled className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Custom Brand (Coming Soon)
            </Button>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Custom brand creation will be available in a future update
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}