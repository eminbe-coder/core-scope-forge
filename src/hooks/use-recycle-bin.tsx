import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from './use-tenant';
import { toast } from 'sonner';

export interface DeletedItem {
  id: string;
  tenant_id: string;
  entity_type: string;
  entity_id: string;
  entity_data: any;
  deleted_at: string;
  deleted_by: string;
  original_table: string;
  created_at: string;
  deleted_by_profile?: {
    first_name: string;
    last_name: string;
    email: string;
  } | null;
}

// Extend the hook to support device templates
const SUPPORTED_TABLES = [
  'companies', 'contacts', 'sites', 'deals', 'todos', 
  'contracts', 'projects', 'activities', 'device_templates'
];

export const useRecycleBin = () => {
  const [deletedItems, setDeletedItems] = useState<DeletedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const { currentTenant } = useTenant();

  const fetchDeletedItems = async () => {
    if (!currentTenant?.id) return;

    setLoading(true);
    try {
      // Fetch items from deleted_items table (for entities with soft delete through deleted_items table)
      const { data: deletedItemsData, error: deletedItemsError } = await supabase
        .from('deleted_items')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .order('deleted_at', { ascending: false });

      if (deletedItemsError) throw deletedItemsError;

      // Fetch device templates with soft delete (deleted_at is not null)
      const { data: templatesData, error: templatesError } = await supabase
        .from('device_templates')
        .select(`
          id,
          tenant_id,
          name,
          description,
          category,
          deleted_at,
          deleted_by
        `)
        .not('deleted_at', 'is', null)
        .or(`tenant_id.eq.${currentTenant.id},is_global.eq.true`)
        .order('deleted_at', { ascending: false });

      if (templatesError) throw templatesError;

      // Convert device templates to DeletedItem format
      const templateDeletedItems: DeletedItem[] = (templatesData || []).map(template => ({
        id: template.id,
        tenant_id: template.tenant_id || currentTenant.id,
        entity_type: 'device_templates',
        entity_id: template.id,
        entity_data: {
          name: template.name,
          description: template.description,
          category: template.category
        },
        deleted_at: template.deleted_at!,
        deleted_by: template.deleted_by!,
        deleted_by_profile: null, // Will be loaded separately if needed
        original_table: 'device_templates',
        created_at: template.deleted_at! // Using deleted_at as created_at for deleted items
      }));

      // Combine all deleted items
      const allDeletedItems: DeletedItem[] = [
        ...(deletedItemsData?.map(item => ({
          ...item,
          deleted_by_profile: null // Will be loaded separately if needed
        })) || []),
        ...templateDeletedItems
      ];
      
      setDeletedItems(allDeletedItems);
    } catch (error: any) {
      console.error('Error fetching deleted items:', error);
      toast.error('Failed to fetch deleted items');
    } finally {
      setLoading(false);
    }
  };

  const restoreItem = async (deletedItemId: string) => {
    try {
      // Find the item to restore
      const itemToRestore = deletedItems.find(item => item.id === deletedItemId);
      
      if (!itemToRestore) {
        throw new Error('Item not found');
      }

      if (itemToRestore.entity_type === 'device_templates') {
        // Handle device template restoration directly
        const { error } = await supabase
          .from('device_templates')
          .update({ deleted_at: null, deleted_by: null })
          .eq('id', itemToRestore.entity_id);

        if (error) throw error;
      } else {
        // Use the RPC function for other entities
        const { error } = await supabase.rpc('restore_deleted_entity', {
          _deleted_item_id: deletedItemId
        });

        if (error) throw error;
      }
      
      toast.success('Item restored successfully');
      fetchDeletedItems(); // Refresh the list
    } catch (error: any) {
      console.error('Error restoring item:', error);
      toast.error('Failed to restore item');
    }
  };

  const permanentlyDelete = async (deletedItemId: string) => {
    try {
      // Find the item to delete
      const itemToDelete = deletedItems.find(item => item.id === deletedItemId);
      
      if (!itemToDelete) {
        throw new Error('Item not found');
      }

      if (itemToDelete.entity_type === 'device_templates') {
        // Handle device template permanent deletion directly
        const { error } = await supabase
          .from('device_templates')
          .delete()
          .eq('id', itemToDelete.entity_id);

        if (error) throw error;
      } else {
        // Use the RPC function for other entities
        const { error } = await supabase.rpc('permanently_delete_entity', {
          _deleted_item_id: deletedItemId
        });

        if (error) throw error;
      }
      
      toast.success('Item permanently deleted');
      fetchDeletedItems(); // Refresh the list
    } catch (error: any) {
      console.error('Error permanently deleting item:', error);
      toast.error('Failed to permanently delete item');
    }
  };

  useEffect(() => {
    fetchDeletedItems();
  }, [currentTenant?.id]);

  return {
    deletedItems,
    loading,
    fetchDeletedItems,
    restoreItem,
    permanentlyDelete
  };
};

export const useSoftDelete = () => {
  const { currentTenant } = useTenant();

  const softDelete = async (tableName: string, entityId: string) => {
    if (!currentTenant?.id) {
      throw new Error('No tenant selected');
    }

    try {
      if (tableName === 'device_templates') {
        // Handle device templates directly since they have their own soft delete columns
        const { error } = await supabase
          .from('device_templates')
          .update({ 
            deleted_at: new Date().toISOString(),
            deleted_by: (await supabase.auth.getUser()).data.user?.id
          })
          .eq('id', entityId);

        if (error) throw error;
      } else {
        // Use the RPC function for other entities
        const { error } = await supabase.rpc('soft_delete_entity', {
          _table_name: tableName,
          _entity_id: entityId,
          _tenant_id: currentTenant.id
        });

        if (error) throw error;
      }
      
      toast.success('Item moved to recycle bin');
    } catch (error: any) {
      console.error('Error soft deleting item:', error);
      toast.error('Failed to delete item');
      throw error;
    }
  };

  return { softDelete };
};