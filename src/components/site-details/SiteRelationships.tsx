import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EntityRelationships } from '@/components/entity-relationships/EntityRelationships';
import { RelationshipTimeline } from '@/components/entity-timeline/RelationshipTimeline';
import { Link2, History } from 'lucide-react';

interface SiteRelationshipsProps {
  siteId: string;
}

export function SiteRelationships({ siteId }: SiteRelationshipsProps) {
  return (
    <Tabs defaultValue="relationships" className="space-y-4">
      <TabsList>
        <TabsTrigger value="relationships" className="flex items-center gap-2">
          <Link2 className="h-4 w-4" />
          Relationships
        </TabsTrigger>
        <TabsTrigger value="timeline" className="flex items-center gap-2">
          <History className="h-4 w-4" />
          Timeline
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="relationships">
        <EntityRelationships 
          entityType="site" 
          entityId={siteId} 
          title="Linked Companies & Contacts"
        />
      </TabsContent>
      
      <TabsContent value="timeline">
        <RelationshipTimeline
          searchId={siteId}
          viewingEntityType="site"
          title="Relationship History"
        />
      </TabsContent>
    </Tabs>
  );
}