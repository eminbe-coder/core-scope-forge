import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Building2, Users, Briefcase, FileText, MapPin, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { useTenant } from '@/hooks/use-tenant';

interface SearchResult {
  id: string;
  name: string;
  type: 'lead' | 'deal' | 'contract' | 'site' | 'contact' | 'company';
  tenant_id: string;
  tenant_name?: string;
}

const typeConfig = {
  lead: { icon: Users, label: 'Lead', color: 'bg-blue-500/10 text-blue-500' },
  deal: { icon: Briefcase, label: 'Deal', color: 'bg-green-500/10 text-green-500' },
  contract: { icon: FileText, label: 'Contract', color: 'bg-purple-500/10 text-purple-500' },
  site: { icon: MapPin, label: 'Site', color: 'bg-orange-500/10 text-orange-500' },
  contact: { icon: Users, label: 'Contact', color: 'bg-cyan-500/10 text-cyan-500' },
  company: { icon: Building2, label: 'Company', color: 'bg-rose-500/10 text-rose-500' },
};

// Simple debounce hook
function useDebounceValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function UniversalSearchBar() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  
  const debouncedQuery = useDebounceValue(query, 300);

  // Keyboard shortcut to open search
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.length < 2 || !user) {
      setResults([]);
      return;
    }

    setLoading(true);

    try {
      // Get user's tenant memberships
      const { data: memberships } = await supabase
        .rpc('get_user_tenant_memberships', { _user_id: user.id });

      const tenantIds = memberships?.map((m: any) => m.tenant_id) || [];
      const tenantMap = new Map(
        memberships?.map((m: any) => [m.tenant_id, m.tenant?.name]) || []
      );

      if (tenantIds.length === 0) {
        setResults([]);
        setLoading(false);
        return;
      }

      const searchTerm = `%${searchQuery}%`;
      const allResults: SearchResult[] = [];

      // Search contacts (leads are contacts with is_lead = true)
      const { data: contacts } = await supabase
        .from('contacts')
        .select('id, first_name, last_name, tenant_id, is_lead')
        .in('tenant_id', tenantIds)
        .is('deleted_at', null)
        .or(`first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},email.ilike.${searchTerm}`)
        .limit(10);

      contacts?.forEach((c) => {
        allResults.push({
          id: c.id,
          name: [c.first_name, c.last_name].filter(Boolean).join(' ') || 'Unknown',
          type: c.is_lead ? 'lead' : 'contact',
          tenant_id: c.tenant_id,
          tenant_name: tenantMap.get(c.tenant_id) || 'Unknown',
        });
      });

      // Search deals
      const { data: deals } = await supabase
        .from('deals')
        .select('id, name, tenant_id')
        .in('tenant_id', tenantIds)
        .is('deleted_at', null)
        .ilike('name', searchTerm)
        .limit(10);

      deals?.forEach((d) => {
        allResults.push({
          id: d.id,
          name: d.name,
          type: 'deal',
          tenant_id: d.tenant_id,
          tenant_name: tenantMap.get(d.tenant_id) || 'Unknown',
        });
      });

      // Search contracts
      const { data: contracts } = await supabase
        .from('contracts')
        .select('id, name, tenant_id')
        .in('tenant_id', tenantIds)
        .is('deleted_at', null)
        .ilike('name', searchTerm)
        .limit(10);

      contracts?.forEach((c) => {
        allResults.push({
          id: c.id,
          name: c.name,
          type: 'contract',
          tenant_id: c.tenant_id,
          tenant_name: tenantMap.get(c.tenant_id) || 'Unknown',
        });
      });

      // Search sites
      const { data: sites } = await supabase
        .from('sites')
        .select('id, name, tenant_id')
        .in('tenant_id', tenantIds)
        .is('deleted_at', null)
        .ilike('name', searchTerm)
        .limit(10);

      sites?.forEach((s) => {
        allResults.push({
          id: s.id,
          name: s.name,
          type: 'site',
          tenant_id: s.tenant_id,
          tenant_name: tenantMap.get(s.tenant_id) || 'Unknown',
        });
      });

      // Search companies
      const { data: companies } = await supabase
        .from('companies')
        .select('id, name, tenant_id')
        .in('tenant_id', tenantIds)
        .is('deleted_at', null)
        .ilike('name', searchTerm)
        .limit(10);

      companies?.forEach((c) => {
        allResults.push({
          id: c.id,
          name: c.name,
          type: 'company',
          tenant_id: c.tenant_id,
          tenant_name: tenantMap.get(c.tenant_id) || 'Unknown',
        });
      });

      setResults(allResults.slice(0, 20));
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    performSearch(debouncedQuery);
  }, [debouncedQuery, performSearch]);

  const handleSelect = (result: SearchResult) => {
    // Store tenant for navigation if different from current
    if (result.tenant_id !== currentTenant?.id) {
      localStorage.setItem('currentTenantId', result.tenant_id);
    }

    const routes: Record<string, string> = {
      lead: `/leads/${result.id}`,
      contact: `/contacts/${result.id}`,
      deal: `/deals/${result.id}`,
      contract: `/contracts/${result.id}`,
      site: `/sites/${result.id}`,
      company: `/companies/${result.id}`,
    };

    navigate(routes[result.type] || '/');
    setOpen(false);
    setQuery('');
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="relative h-9 w-9 p-0 xl:h-10 xl:w-60 xl:justify-start xl:px-3 xl:py-2 bg-glass-bg border-glass-border"
      >
        <Search className="h-4 w-4 xl:mr-2" />
        <span className="hidden xl:inline-flex">Search...</span>
        <kbd className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 xl:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput 
          placeholder="Search leads, deals, contracts, sites, contacts..." 
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {loading && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
          
          {!loading && query.length >= 2 && results.length === 0 && (
            <CommandEmpty>No results found.</CommandEmpty>
          )}
          
          {!loading && results.length > 0 && (
            <CommandGroup heading="Results">
              {results.map((result) => {
                const config = typeConfig[result.type];
                const Icon = config.icon;
                
                return (
                  <CommandItem
                    key={`${result.type}-${result.id}`}
                    value={`${result.name}-${result.id}`}
                    onSelect={() => handleSelect(result)}
                    className="flex items-center justify-between gap-2 cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{result.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className={`text-xs ${config.color}`}>
                        {config.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                        {result.tenant_name}
                      </span>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          )}
          
          {!loading && query.length < 2 && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Type at least 2 characters to search
            </div>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
