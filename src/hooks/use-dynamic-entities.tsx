import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';

interface Company {
  id: string;
  name: string;
  active?: boolean;
}

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  active?: boolean;
}

interface Site {
  id: string;
  name: string;
  address?: string;
  active?: boolean;
}

interface Customer {
  id: string;
  name: string;
  active?: boolean;
}

interface Deal {
  id: string;
  name: string;
  value?: number;
  status?: string;
}

interface Contract {
  id: string;
  name: string;
  status?: string;
}

interface Installment {
  id: string;
  name: string;
  due_date?: string;
}

interface EntityHookOptions {
  enabled?: boolean;
  searchTerm?: string;
  limit?: number;
}

export function useDynamicCompanies(options: EntityHookOptions = {}) {
  const { currentTenant } = useTenant();
  const { enabled = true, searchTerm = '', limit = 50 } = options;
  
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCompanies = useCallback(async () => {
    if (!currentTenant?.id || !enabled) return;

    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('companies')
        .select('id, name, active')
        .eq('tenant_id', currentTenant.id)
        .eq('active', true)
        .order('name');

      if (searchTerm.trim()) {
        query = query.ilike('name', `%${searchTerm.trim()}%`);
      }

      if (limit && limit > 0) {
        query = query.limit(limit);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setCompanies(data || []);
    } catch (err) {
      console.error('Error fetching companies:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch companies');
    } finally {
      setLoading(false);
    }
  }, [currentTenant?.id, enabled, searchTerm, limit]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  // Set up real-time subscription
  useEffect(() => {
    if (!currentTenant?.id || !enabled) return;

    const channel = supabase
      .channel('companies-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'companies',
          filter: `tenant_id=eq.${currentTenant.id}`
        },
        () => {
          fetchCompanies();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentTenant?.id, enabled, fetchCompanies]);

  return {
    companies,
    loading,
    error,
    refresh: fetchCompanies
  };
}

export function useDynamicContacts(options: EntityHookOptions = {}) {
  const { currentTenant } = useTenant();
  const { enabled = true, searchTerm = '', limit = 50 } = options;
  
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchContacts = useCallback(async () => {
    if (!currentTenant?.id || !enabled) return;

    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('contacts')
        .select('id, first_name, last_name, email, active')
        .eq('tenant_id', currentTenant.id)
        .eq('active', true)
        .order('first_name');

      if (searchTerm.trim()) {
        query = query.or(`first_name.ilike.%${searchTerm.trim()}%,last_name.ilike.%${searchTerm.trim()}%,email.ilike.%${searchTerm.trim()}%`);
      }

      if (limit && limit > 0) {
        query = query.limit(limit);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setContacts(data || []);
    } catch (err) {
      console.error('Error fetching contacts:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch contacts');
    } finally {
      setLoading(false);
    }
  }, [currentTenant?.id, enabled, searchTerm, limit]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  // Set up real-time subscription
  useEffect(() => {
    if (!currentTenant?.id || !enabled) return;

    const channel = supabase
      .channel('contacts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contacts',
          filter: `tenant_id=eq.${currentTenant.id}`
        },
        () => {
          fetchContacts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentTenant?.id, enabled, fetchContacts]);

  return {
    contacts,
    loading,
    error,
    refresh: fetchContacts
  };
}

export function useDynamicSites(options: EntityHookOptions = {}) {
  const { currentTenant } = useTenant();
  const { enabled = true, searchTerm = '', limit = 50 } = options;
  
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSites = useCallback(async () => {
    if (!currentTenant?.id || !enabled) return;

    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('sites')
        .select('id, name, address, active')
        .eq('tenant_id', currentTenant.id)
        .eq('active', true)
        .order('name');

      if (searchTerm.trim()) {
        query = query.or(`name.ilike.%${searchTerm.trim()}%,address.ilike.%${searchTerm.trim()}%`);
      }

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setSites(data || []);
    } catch (err) {
      console.error('Error fetching sites:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch sites');
    } finally {
      setLoading(false);
    }
  }, [currentTenant?.id, enabled, searchTerm, limit]);

  useEffect(() => {
    fetchSites();
  }, [fetchSites]);

  // Set up real-time subscription
  useEffect(() => {
    if (!currentTenant?.id || !enabled) return;

    const channel = supabase
      .channel('sites-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sites',
          filter: `tenant_id=eq.${currentTenant.id}`
        },
        () => {
          fetchSites();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentTenant?.id, enabled, fetchSites]);

  return {
    sites,
    loading,
    error,
    refresh: fetchSites
  };
}

export function useDynamicCustomers(options: EntityHookOptions = {}) {
  const { currentTenant } = useTenant();
  const { enabled = true, searchTerm = '', limit = 50 } = options;
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomers = useCallback(async () => {
    if (!currentTenant?.id || !enabled) return;

    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('customers')
        .select('id, name, active')
        .eq('tenant_id', currentTenant.id)
        .eq('active', true)
        .order('name');

      if (searchTerm.trim()) {
        query = query.ilike('name', `%${searchTerm.trim()}%`);
      }

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setCustomers(data || []);
    } catch (err) {
      console.error('Error fetching customers:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch customers');
    } finally {
      setLoading(false);
    }
  }, [currentTenant?.id, enabled, searchTerm, limit]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Set up real-time subscription
  useEffect(() => {
    if (!currentTenant?.id || !enabled) return;

    const channel = supabase
      .channel('customers-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'customers',
          filter: `tenant_id=eq.${currentTenant.id}`
        },
        () => {
          fetchCustomers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentTenant?.id, enabled, fetchCustomers]);

  return {
    customers,
    loading,
    error,
    refresh: fetchCustomers
  };
}

export function useDynamicDeals(options: EntityHookOptions = {}) {
  const { currentTenant } = useTenant();
  const { enabled = true, searchTerm = '', limit = 50 } = options;
  
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDeals = useCallback(async () => {
    if (!currentTenant?.id || !enabled) return;

    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('deals')
        .select('id, name, value, status')
        .eq('tenant_id', currentTenant.id)
        .order('name');

      if (searchTerm.trim()) {
        query = query.ilike('name', `%${searchTerm.trim()}%`);
      }

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setDeals(data || []);
    } catch (err) {
      console.error('Error fetching deals:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch deals');
    } finally {
      setLoading(false);
    }
  }, [currentTenant?.id, enabled, searchTerm, limit]);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  // Set up real-time subscription
  useEffect(() => {
    if (!currentTenant?.id || !enabled) return;

    const channel = supabase
      .channel('deals-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'deals',
          filter: `tenant_id=eq.${currentTenant.id}`
        },
        () => {
          fetchDeals();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentTenant?.id, enabled, fetchDeals]);

  return {
    deals,
    loading,
    error,
    refresh: fetchDeals
  };
}

export function useDynamicContracts(options: EntityHookOptions = {}) {
  const { currentTenant } = useTenant();
  const { enabled = true, searchTerm = '', limit = 50 } = options;
  
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchContracts = useCallback(async () => {
    if (!currentTenant?.id || !enabled) return;

    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('contracts')
        .select('id, name, status')
        .eq('tenant_id', currentTenant.id)
        .order('name');

      if (searchTerm.trim()) {
        query = query.ilike('name', `%${searchTerm.trim()}%`);
      }

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setContracts(data || []);
    } catch (err) {
      console.error('Error fetching contracts:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch contracts');
    } finally {
      setLoading(false);
    }
  }, [currentTenant?.id, enabled, searchTerm, limit]);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  // Set up real-time subscription
  useEffect(() => {
    if (!currentTenant?.id || !enabled) return;

    const channel = supabase
      .channel('contracts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contracts',
          filter: `tenant_id=eq.${currentTenant.id}`
        },
        () => {
          fetchContracts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentTenant?.id, enabled, fetchContracts]);

  return {
    contracts,
    loading,
    error,
    refresh: fetchContracts
  };
}

export function useDynamicInstallments(options: EntityHookOptions = {}) {
  const { currentTenant } = useTenant();
  const { enabled = true, searchTerm = '', limit = 50 } = options;
  
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInstallments = useCallback(async () => {
    if (!currentTenant?.id || !enabled) return;

    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('contract_payment_terms')
        .select('id, name, due_date')
        .eq('tenant_id', currentTenant.id)
        .order('name');

      if (searchTerm.trim()) {
        query = query.ilike('name', `%${searchTerm.trim()}%`);
      }

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setInstallments(data || []);
    } catch (err) {
      console.error('Error fetching installments:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch installments');
    } finally {
      setLoading(false);
    }
  }, [currentTenant?.id, enabled, searchTerm, limit]);

  useEffect(() => {
    fetchInstallments();
  }, [fetchInstallments]);

  // Set up real-time subscription
  useEffect(() => {
    if (!currentTenant?.id || !enabled) return;

    const channel = supabase
      .channel('installments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contract_payment_terms',
          filter: `tenant_id=eq.${currentTenant.id}`
        },
        () => {
          fetchInstallments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentTenant?.id, enabled, fetchInstallments]);

  return {
    installments,
    loading,
    error,
    refresh: fetchInstallments
  };
}