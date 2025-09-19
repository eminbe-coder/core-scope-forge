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

export const useRecycleBin = () => {
  const [deletedItems, setDeletedItems] = useState<DeletedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const { currentTenant } = useTenant();

  const fetchDeletedItems = async () => {
    if (!currentTenant?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('deleted_items')
        .select(`
          *,
          deleted_by_profile:profiles!deleted_items_deleted_by_fkey(
            first_name,
            last_name,
            email
          )
        `)
        .eq('tenant_id', currentTenant.id)
        .order('deleted_at', { ascending: false });

      if (error) throw error;
      setDeletedItems((data as any[])?.map(item => ({
        ...item,
        deleted_by_profile: item.deleted_by_profile || null
      })) || []);
    } catch (error: any) {
      console.error('Error fetching deleted items:', error);
      toast.error('Failed to fetch deleted items');
    } finally {
      setLoading(false);
    }
  };

  const restoreItem = async (deletedItemId: string) => {
    try {
      const { error } = await supabase.rpc('restore_deleted_entity', {
        _deleted_item_id: deletedItemId
      });

      if (error) throw error;
      
      toast.success('Item restored successfully');
      fetchDeletedItems(); // Refresh the list
    } catch (error: any) {
      console.error('Error restoring item:', error);
      toast.error('Failed to restore item');
    }
  };

  const permanentlyDelete = async (deletedItemId: string) => {
    try {
      const { error } = await supabase.rpc('permanently_delete_entity', {
        _deleted_item_id: deletedItemId
      });

      if (error) throw error;
      
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
      const { error } = await supabase.rpc('soft_delete_entity', {
        _table_name: tableName,
        _entity_id: entityId,
        _tenant_id: currentTenant.id
      });

      if (error) throw error;
      
      toast.success('Item moved to recycle bin');
    } catch (error: any) {
      console.error('Error soft deleting item:', error);
      toast.error('Failed to delete item');
      throw error;
    }
  };

  return { softDelete };
};