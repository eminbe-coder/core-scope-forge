import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Plus, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { WidgetConfig } from '../DashboardGrid';
import { useNavigate } from 'react-router-dom';

interface ContactsWidgetProps {
  config: WidgetConfig;
  onUpdateConfig: (updates: Partial<WidgetConfig>) => void;
  customizeMode: boolean;
}

export function ContactsWidget({ config, onUpdateConfig, customizeMode }: ContactsWidgetProps) {
  const { currentTenant } = useTenant();
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const filterType = config.filters?.type || 'all';

  useEffect(() => {
    if (currentTenant) {
      loadContacts();
    }
  }, [currentTenant, filterType]);

  const loadContacts = async () => {
    try {
      let query = supabase
        .from('contacts')
        .select('*, customers(name)')
        .eq('tenant_id', currentTenant?.id)
        .eq('active', true);

      if (filterType === 'leads') {
        query = query.eq('is_lead', true);
      } else if (filterType === 'customers') {
        query = query.eq('is_lead', false);
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error('Error loading contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateFilter = (newFilterType: string) => {
    onUpdateConfig({
      filters: { ...config.filters, type: newFilterType }
    });
  };

  const getTitle = () => {
    switch (filterType) {
      case 'leads': return 'Contact Leads';
      case 'customers': return 'Customer Contacts';
      default: return 'Contacts';
    }
  };

  const getCount = () => {
    return contacts.length;
  };

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Users className="h-4 w-4" />
          {getTitle()}
        </CardTitle>
        
        <div className="flex items-center gap-1">
          {(customizeMode || showFilters) && (
            <Select value={filterType} onValueChange={updateFilter}>
              <SelectTrigger className="w-24 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="leads">Leads</SelectItem>
                <SelectItem value="customers">Customers</SelectItem>
              </SelectContent>
            </Select>
          )}
          
          {!customizeMode && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => navigate('/contacts/add')}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="text-2xl font-bold mb-2">{getCount()}</div>
        
        {!customizeMode && (
          <div className="space-y-2">
            {loading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-4 bg-muted rounded animate-pulse" />
                ))}
              </div>
            ) : contacts.length > 0 ? (
              <div className="space-y-1">
                {contacts.slice(0, 3).map((contact) => (
                  <div
                    key={contact.id}
                    className="text-xs text-muted-foreground cursor-pointer hover:text-foreground truncate"
                    onClick={() => navigate('/contacts')}
                  >
                    {contact.first_name} {contact.last_name}
                  </div>
                ))}
                {contacts.length > 3 && (
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs"
                    onClick={() => navigate('/contacts')}
                  >
                    View all {contacts.length} contacts
                  </Button>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                No contacts found
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}