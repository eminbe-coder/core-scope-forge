import { useEffect, useCallback, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface UseFormPersistOptions<T> {
  /** The form data to persist */
  data: T;
  /** Setter function to restore data */
  setData: (data: T) => void;
  /** Whether to show a restore prompt (default: true) */
  showRestorePrompt?: boolean;
  /** Callback when draft is restored */
  onRestore?: () => void;
  /** Callback when draft is discarded */
  onDiscard?: () => void;
  /** Debounce delay in ms (default: 500) */
  debounceMs?: number;
}

interface UseFormPersistReturn {
  /** Whether a draft was found on mount */
  hasDraft: boolean;
  /** Clear the saved draft */
  clearDraft: () => void;
  /** Manually save the current draft */
  saveDraft: () => void;
  /** Restore the saved draft */
  restoreDraft: () => void;
  /** Discard the saved draft without restoring */
  discardDraft: () => void;
}

/**
 * Hook to persist form data to localStorage across tab switches and page refreshes.
 * 
 * @param formKey - Unique key for this form (e.g., 'draft_deal_edit_123')
 * @param options - Configuration options
 * @returns Methods to manage the draft
 * 
 * @example
 * ```tsx
 * const { hasDraft, clearDraft } = useFormPersist('draft_deal_edit_123', {
 *   data: formData,
 *   setData: setFormData,
 * });
 * 
 * // On successful save:
 * clearDraft();
 * ```
 */
export function useFormPersist<T>(
  formKey: string,
  options: UseFormPersistOptions<T>
): UseFormPersistReturn {
  const { 
    data, 
    setData, 
    showRestorePrompt = true,
    onRestore,
    onDiscard,
    debounceMs = 500 
  } = options;
  
  const { toast } = useToast();
  const [hasDraft, setHasDraft] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Get the storage key
  const getStorageKey = useCallback(() => `form_draft_${formKey}`, [formKey]);

  // Save draft to localStorage
  const saveDraft = useCallback(() => {
    try {
      const storageKey = getStorageKey();
      const draftData = {
        data,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(storageKey, JSON.stringify(draftData));
    } catch (error) {
      console.error('Failed to save form draft:', error);
    }
  }, [data, getStorageKey]);

  // Clear the draft
  const clearDraft = useCallback(() => {
    try {
      const storageKey = getStorageKey();
      localStorage.removeItem(storageKey);
      setHasDraft(false);
    } catch (error) {
      console.error('Failed to clear form draft:', error);
    }
  }, [getStorageKey]);

  // Restore the draft
  const restoreDraft = useCallback(() => {
    try {
      const storageKey = getStorageKey();
      const savedData = localStorage.getItem(storageKey);
      
      if (savedData) {
        const parsed = JSON.parse(savedData);
        if (parsed.data) {
          setData(parsed.data);
          setHasDraft(false);
          onRestore?.();
          toast({
            title: 'Draft Restored',
            description: 'Your unsaved changes have been restored.',
          });
        }
      }
    } catch (error) {
      console.error('Failed to restore form draft:', error);
    }
  }, [getStorageKey, setData, onRestore, toast]);

  // Discard the draft
  const discardDraft = useCallback(() => {
    clearDraft();
    onDiscard?.();
  }, [clearDraft, onDiscard]);

  // Check for existing draft on mount
  useEffect(() => {
    try {
      const storageKey = getStorageKey();
      const savedData = localStorage.getItem(storageKey);
      
      if (savedData) {
        const parsed = JSON.parse(savedData);
        if (parsed.data) {
          setHasDraft(true);
          
          if (showRestorePrompt) {
            // Show toast with action to restore
            toast({
              title: 'Unsaved Draft Found',
              description: 'We found an unsaved draft. Would you like to restore it?',
              action: (
                <div className="flex gap-2">
                  <button
                    onClick={() => restoreDraft()}
                    className="px-3 py-1.5 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                  >
                    Restore
                  </button>
                  <button
                    onClick={() => discardDraft()}
                    className="px-3 py-1.5 text-sm font-medium bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90"
                  >
                    Discard
                  </button>
                </div>
              ),
              duration: 10000, // 10 seconds to decide
            });
          }
        }
      }
    } catch (error) {
      console.error('Failed to check for draft:', error);
    }
    
    setIsInitialized(true);
  }, [formKey]); // Only run on mount / key change

  // Auto-save on data changes (debounced)
  useEffect(() => {
    if (!isInitialized) return;
    
    const timeoutId = setTimeout(() => {
      saveDraft();
    }, debounceMs);

    return () => clearTimeout(timeoutId);
  }, [data, isInitialized, debounceMs, saveDraft]);

  return {
    hasDraft,
    clearDraft,
    saveDraft,
    restoreDraft,
    discardDraft,
  };
}
