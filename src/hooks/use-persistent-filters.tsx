import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';

/**
 * A custom hook that behaves like useState but syncs with localStorage.
 * The storage key is unique to the current user and module to prevent
 * filter conflicts between different users on shared computers.
 * 
 * Key format: sid_filters_[module_name]_[user_id]
 * 
 * @param moduleName - The name of the module (e.g., 'leads', 'deals', 'contracts')
 * @param defaultFilters - The default filter state to use when no saved state exists
 * @returns A tuple of [filters, setFilters, clearFilters]
 */
export function usePersistentFilters<T>(
  moduleName: string,
  defaultFilters: T
): [T, (filters: T | ((prev: T) => T)) => void, () => void] {
  const { user } = useAuth();
  
  // Generate unique storage key based on module and user
  const getStorageKey = useCallback(() => {
    if (!user?.id) return null;
    return `sid_filters_${moduleName}_${user.id}`;
  }, [moduleName, user?.id]);

  // Initialize state with saved filters or defaults
  const [filters, setFiltersInternal] = useState<T>(() => {
    const storageKey = getStorageKey();
    if (!storageKey) return defaultFilters;
    
    try {
      const savedFilters = localStorage.getItem(storageKey);
      if (savedFilters) {
        const parsed = JSON.parse(savedFilters);
        // Merge with defaults to handle any new filter properties
        return { ...defaultFilters, ...parsed };
      }
    } catch (error) {
      console.warn(`Failed to parse saved filters for ${moduleName}:`, error);
    }
    return defaultFilters;
  });

  // Re-sync when user changes
  useEffect(() => {
    const storageKey = getStorageKey();
    if (!storageKey) {
      setFiltersInternal(defaultFilters);
      return;
    }

    try {
      const savedFilters = localStorage.getItem(storageKey);
      if (savedFilters) {
        const parsed = JSON.parse(savedFilters);
        setFiltersInternal({ ...defaultFilters, ...parsed });
      }
    } catch (error) {
      console.warn(`Failed to load filters for ${moduleName}:`, error);
    }
  }, [user?.id, moduleName]);

  // Wrapped setFilters that also persists to localStorage
  const setFilters = useCallback((newFilters: T | ((prev: T) => T)) => {
    setFiltersInternal(prev => {
      const resolvedFilters = typeof newFilters === 'function' 
        ? (newFilters as (prev: T) => T)(prev) 
        : newFilters;
      
      const storageKey = getStorageKey();
      if (storageKey) {
        try {
          localStorage.setItem(storageKey, JSON.stringify(resolvedFilters));
        } catch (error) {
          console.warn(`Failed to save filters for ${moduleName}:`, error);
        }
      }
      
      return resolvedFilters;
    });
  }, [getStorageKey, moduleName]);

  // Clear filters and remove from localStorage
  const clearFilters = useCallback(() => {
    const storageKey = getStorageKey();
    if (storageKey) {
      try {
        localStorage.removeItem(storageKey);
      } catch (error) {
        console.warn(`Failed to clear filters for ${moduleName}:`, error);
      }
    }
    setFiltersInternal(defaultFilters);
  }, [getStorageKey, moduleName, defaultFilters]);

  return [filters, setFilters, clearFilters];
}
