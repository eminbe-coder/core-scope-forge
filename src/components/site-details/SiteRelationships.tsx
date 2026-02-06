import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EntityRelationships } from '@/components/entity-relationships/EntityRelationships';
import { RelationshipTimeline } from '@/components/entity-timeline/RelationshipTimeline';
import { EntityTimeline } from '@/components/entity-timeline/EntityTimeline';
import { Link2, History, Activity } from 'lucide-react';

interface SiteRelationshipsProps {
  siteId: string;
}

/**
 * SiteRelationships - Unified relationships and history view for Sites
 * 
 * Uses the standardized entity_relationships table as the source of truth.
 * Displays both active relationships and full historical timeline.
 */
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
          Relationship History
        </TabsTrigger>
        <TabsTrigger value="activity" className="flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Activity Log
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
          maxHeight="500px"
        />
      </TabsContent>

      <TabsContent value="activity">
        <EntityTimeline
          entityType="site"
          entityId={siteId}
          title="Activity Timeline"
          maxHeight="500px"
        />
      </TabsContent>
    </Tabs>
  );
}