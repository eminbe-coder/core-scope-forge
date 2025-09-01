import { EntityRelationships } from '@/components/entity-relationships/EntityRelationships';

interface SiteRelationshipsProps {
  siteId: string;
}

export function SiteRelationships({ siteId }: SiteRelationshipsProps) {
  return (
    <EntityRelationships 
      entityType="site" 
      entityId={siteId} 
      title="Linked Companies & Contacts"
    />
  );
}