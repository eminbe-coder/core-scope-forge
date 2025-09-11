import React, { createContext, useContext, useState, ReactNode } from 'react';

interface EntityRefreshContextType {
  refreshEntities: (entityType: string) => void;
  refreshTriggers: { [key: string]: number };
}

const EntityRefreshContext = createContext<EntityRefreshContextType | undefined>(undefined);

export function EntityRefreshProvider({ children }: { children: ReactNode }) {
  const [refreshTriggers, setRefreshTriggers] = useState<{ [key: string]: number }>({});

  const refreshEntities = (entityType: string) => {
    setRefreshTriggers(prev => ({
      ...prev,
      [entityType]: (prev[entityType] || 0) + 1
    }));
  };

  return (
    <EntityRefreshContext.Provider value={{ refreshEntities, refreshTriggers }}>
      {children}
    </EntityRefreshContext.Provider>
  );
}

export function useEntityRefresh() {
  const context = useContext(EntityRefreshContext);
  if (context === undefined) {
    throw new Error('useEntityRefresh must be used within an EntityRefreshProvider');
  }
  return context;
}

// Convenience functions for specific entity types
export function useRefreshCompanies() {
  const { refreshEntities } = useEntityRefresh();
  return () => refreshEntities('companies');
}

export function useRefreshContacts() {
  const { refreshEntities } = useEntityRefresh();
  return () => refreshEntities('contacts');
}

export function useRefreshSites() {
  const { refreshEntities } = useEntityRefresh();
  return () => refreshEntities('sites');
}

export function useRefreshCustomers() {
  const { refreshEntities } = useEntityRefresh();
  return () => refreshEntities('customers');
}