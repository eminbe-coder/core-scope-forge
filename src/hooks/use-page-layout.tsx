import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { usePermissions } from '@/hooks/use-permissions';
import {
  FileText,
  DollarSign,
  Link2,
  Activity,
  History,
  FolderOpen,
  CheckSquare,
  type LucideIcon
} from 'lucide-react';

export type EntityType = 'deal' | 'contract' | 'site' | 'contact' | 'company' | 'lead_company' | 'lead_contact';

export interface TabConfig {
  id: string;
  label: string;
  icon: string;
  component: string;
  visible: boolean;
  locked?: boolean; // Superadmin can lock tabs so tenant admins can't disable them
  order: number;
}

export interface PageLayoutConfig {
  entityType: EntityType;
  tabs: TabConfig[];
  sidebarWidgets: string[];
  headerActions: string[];
}

// Icon mapping for dynamic rendering
export const ICON_MAP: Record<string, LucideIcon> = {
  FileText,
  DollarSign,
  Link2,
  Activity,
  History,
  FolderOpen,
  CheckSquare,
};

// Default configurations for each entity type
const DEFAULT_CONFIGS: Record<EntityType, PageLayoutConfig> = {
  deal: {
    entityType: 'deal',
    tabs: [
      { id: 'overview', label: 'Overview', icon: 'FileText', component: 'OverviewContent', visible: true, locked: true, order: 0 },
      { id: 'installments', label: 'Installments', icon: 'DollarSign', component: 'InstallmentsContent', visible: true, locked: false, order: 1 },
      { id: 'relationships', label: 'Relationships', icon: 'Link2', component: 'RelationshipsContent', visible: true, locked: false, order: 2 },
      { id: 'activities', label: 'Activities', icon: 'Activity', component: 'ActivitiesContent', visible: true, locked: false, order: 3 },
      { id: 'files', label: 'Files', icon: 'FolderOpen', component: 'FilesContent', visible: true, locked: false, order: 4 },
      { id: 'history', label: 'History', icon: 'History', component: 'HistoryContent', visible: true, locked: true, order: 5 },
    ],
    sidebarWidgets: ['todos', 'quickStats'],
    headerActions: ['edit', 'delete', 'addTodo', 'addActivity'],
  },
  contract: {
    entityType: 'contract',
    tabs: [
      { id: 'overview', label: 'Overview', icon: 'FileText', component: 'OverviewContent', visible: true, locked: true, order: 0 },
      { id: 'installments', label: 'Installments', icon: 'DollarSign', component: 'InstallmentsContent', visible: true, locked: true, order: 1 },
      { id: 'relationships', label: 'Relationships', icon: 'Link2', component: 'RelationshipsContent', visible: true, locked: false, order: 2 },
      { id: 'activities', label: 'Activities', icon: 'Activity', component: 'ActivitiesContent', visible: true, locked: false, order: 3 },
      { id: 'files', label: 'Files', icon: 'FolderOpen', component: 'FilesContent', visible: true, locked: false, order: 4 },
      { id: 'history', label: 'History', icon: 'History', component: 'HistoryContent', visible: true, locked: true, order: 5 },
    ],
    sidebarWidgets: ['todos', 'quickStats'],
    headerActions: ['edit', 'delete', 'addTodo', 'addActivity'],
  },
  site: {
    entityType: 'site',
    tabs: [
      { id: 'overview', label: 'Overview', icon: 'FileText', component: 'OverviewContent', visible: true, locked: true, order: 0 },
      { id: 'relationships', label: 'Relationships', icon: 'Link2', component: 'RelationshipsContent', visible: true, locked: false, order: 1 },
      { id: 'activities', label: 'Activities', icon: 'Activity', component: 'ActivitiesContent', visible: true, locked: false, order: 2 },
      { id: 'history', label: 'History', icon: 'History', component: 'HistoryContent', visible: true, locked: true, order: 3 },
    ],
    sidebarWidgets: ['todos', 'quickStats'],
    headerActions: ['edit', 'delete', 'addTodo'],
  },
  contact: {
    entityType: 'contact',
    tabs: [
      { id: 'overview', label: 'Overview', icon: 'FileText', component: 'OverviewContent', visible: true, locked: true, order: 0 },
      { id: 'relationships', label: 'Relationships', icon: 'Link2', component: 'RelationshipsContent', visible: true, locked: false, order: 1 },
      { id: 'activities', label: 'Activities', icon: 'Activity', component: 'ActivitiesContent', visible: true, locked: false, order: 2 },
      { id: 'history', label: 'History', icon: 'History', component: 'HistoryContent', visible: true, locked: true, order: 3 },
    ],
    sidebarWidgets: ['todos', 'quickStats'],
    headerActions: ['edit', 'delete', 'addTodo'],
  },
  company: {
    entityType: 'company',
    tabs: [
      { id: 'overview', label: 'Overview', icon: 'FileText', component: 'OverviewContent', visible: true, locked: true, order: 0 },
      { id: 'relationships', label: 'Relationships', icon: 'Link2', component: 'RelationshipsContent', visible: true, locked: false, order: 1 },
      { id: 'activities', label: 'Activities', icon: 'Activity', component: 'ActivitiesContent', visible: true, locked: false, order: 2 },
      { id: 'history', label: 'History', icon: 'History', component: 'HistoryContent', visible: true, locked: true, order: 3 },
    ],
    sidebarWidgets: ['todos', 'quickStats'],
    headerActions: ['edit', 'delete', 'addTodo'],
  },
  lead_company: {
    entityType: 'lead_company',
    tabs: [
      { id: 'overview', label: 'Overview', icon: 'FileText', component: 'OverviewContent', visible: true, locked: true, order: 0 },
      { id: 'relationships', label: 'Relationships', icon: 'Link2', component: 'RelationshipsContent', visible: true, locked: false, order: 1 },
      { id: 'activities', label: 'Activities', icon: 'Activity', component: 'ActivitiesContent', visible: true, locked: false, order: 2 },
      { id: 'history', label: 'History', icon: 'History', component: 'HistoryContent', visible: true, locked: true, order: 3 },
    ],
    sidebarWidgets: ['todos'],
    headerActions: ['edit', 'convert', 'addTodo'],
  },
  lead_contact: {
    entityType: 'lead_contact',
    tabs: [
      { id: 'overview', label: 'Overview', icon: 'FileText', component: 'OverviewContent', visible: true, locked: true, order: 0 },
      { id: 'relationships', label: 'Relationships', icon: 'Link2', component: 'RelationshipsContent', visible: true, locked: false, order: 1 },
      { id: 'activities', label: 'Activities', icon: 'Activity', component: 'ActivitiesContent', visible: true, locked: false, order: 2 },
      { id: 'history', label: 'History', icon: 'History', component: 'HistoryContent', visible: true, locked: true, order: 3 },
    ],
    sidebarWidgets: ['todos'],
    headerActions: ['edit', 'convert', 'addTodo'],
  },
};

interface UsePageLayoutOptions {
  entityType: EntityType;
}

interface UsePageLayoutReturn {
  config: PageLayoutConfig;
  loading: boolean;
  error: string | null;
  visibleTabs: TabConfig[];
  refetch: () => Promise<void>;
}

export function usePageLayout({ entityType }: UsePageLayoutOptions): UsePageLayoutReturn {
  const { currentTenant } = useTenant();
  const { hasPermission } = usePermissions();
  const [config, setConfig] = useState<PageLayoutConfig>(DEFAULT_CONFIGS[entityType]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = async () => {
    if (!entityType) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Try tenant-specific config first
      if (currentTenant?.id) {
        const { data: tenantConfig, error: tenantError } = await supabase
          .from('tenant_page_configs')
          .select('layout_data')
          .eq('tenant_id', currentTenant.id)
          .eq('entity_type', entityType)
          .maybeSingle();

        if (tenantError) {
          console.error('Error fetching tenant page config:', tenantError);
        }

        if (tenantConfig?.layout_data) {
          const layoutData = tenantConfig.layout_data as unknown as PageLayoutConfig;
          setConfig(layoutData);
          setLoading(false);
          return;
        }
      }

      // Fallback to global config
      const { data: globalConfig, error: globalError } = await supabase
        .from('global_page_configs')
        .select('layout_data')
        .eq('entity_type', entityType)
        .maybeSingle();

      if (globalError) {
        console.error('Error fetching global page config:', globalError);
      }

      if (globalConfig?.layout_data) {
        const layoutData = globalConfig.layout_data as unknown as PageLayoutConfig;
        setConfig(layoutData);
        setLoading(false);
        return;
      }

      // Use default if neither exists
      setConfig(DEFAULT_CONFIGS[entityType]);
    } catch (err) {
      console.error('Error in usePageLayout:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setConfig(DEFAULT_CONFIGS[entityType]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, [entityType, currentTenant?.id]);

  // Filter and sort visible tabs
  const visibleTabs = useMemo(() => {
    if (!config?.tabs) return [];
    
    return config.tabs
      .filter(tab => tab.visible)
      .sort((a, b) => a.order - b.order);
  }, [config]);

  return {
    config,
    loading,
    error,
    visibleTabs,
    refetch: fetchConfig,
  };
}

// Export default configs for the PageEditor
export { DEFAULT_CONFIGS };
