import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Building2, 
  User, 
  Clock, 
  Link2, 
  ArrowRight,
  Calendar,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface RelationshipEntry {
  id: string;
  entity_type: string;
  entity_id: string;
  company_id: string | null;
  contact_id: string | null;
  relationship_role_id: string;
  is_active: boolean;
  start_date: string;
  end_date: string | null;
  notes: string | null;
  created_at: string;
  relationship_roles?: {
    id: string;
    name: string;
    category: string;
  };
  companies?: {
    id: string;
    name: string;
  };
  contacts?: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

interface RelationshipTimelineProps {
  /** The ID to search for - can be company, contact, or entity ID */
  searchId: string;
  /** The type of entity we're viewing (company, contact, deal, site, etc.) */
  viewingEntityType: 'company' | 'contact' | 'deal' | 'site' | 'lead_company' | 'lead_contact';
  /** Optional title override */
  title?: string;
  /** Max height for scroll area */
  maxHeight?: string;
  /** Show compact view */
  compact?: boolean;
}

export const RelationshipTimeline = ({ 
  searchId, 
  viewingEntityType,
  title = "Relationship History",
  maxHeight = "400px",
  compact = false
}: RelationshipTimelineProps) => {
  const { currentTenant } = useTenant();
  const [relationships, setRelationships] = useState<RelationshipEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRelationships = async () => {
    if (!currentTenant || !searchId) return;

    try {
      setLoading(true);
      
      // Build query based on viewing entity type
      let query = supabase
        .from('entity_relationships')
        .select(`
          *,
          relationship_roles (id, name, category),
          companies (id, name),
          contacts (id, first_name, last_name)
        `)
        .eq('tenant_id', currentTenant.id);

      // Search by appropriate column based on entity type
      if (viewingEntityType === 'company') {
        query = query.eq('company_id', searchId);
      } else if (viewingEntityType === 'contact') {
        query = query.eq('contact_id', searchId);
      } else {
        // For deals, sites, leads - search by entity_id
        query = query.eq('entity_id', searchId);
      }

      const { data, error } = await query.order('start_date', { ascending: false });

      if (error) throw error;
      setRelationships(data || []);
    } catch (error) {
      console.error('Error fetching relationship timeline:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRelationships();
  }, [currentTenant, searchId, viewingEntityType]);

  const getEntityName = (entry: RelationshipEntry) => {
    if (viewingEntityType === 'company' || viewingEntityType === 'contact') {
      // When viewing from company/contact perspective, show what they're linked to
      return entry.entity_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    
    // When viewing from deal/site perspective, show the company/contact
    if (entry.companies) {
      return entry.companies.name;
    } else if (entry.contacts) {
      return `${entry.contacts.first_name} ${entry.contacts.last_name}`.trim();
    }
    return 'Unknown';
  };

  const getEntityIcon = (entry: RelationshipEntry) => {
    if (entry.company_id) {
      return <Building2 className="h-4 w-4" />;
    } else if (entry.contact_id) {
      return <User className="h-4 w-4" />;
    }
    return <Link2 className="h-4 w-4" />;
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      general: 'bg-slate-500',
      contractor: 'bg-blue-500',
      consultant: 'bg-purple-500',
      design: 'bg-pink-500',
      client: 'bg-green-500',
      supplier: 'bg-orange-500',
      partner: 'bg-cyan-500',
    };
    return colors[category?.toLowerCase()] || 'bg-muted-foreground';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className={compact ? "pb-2" : undefined}>
          <CardTitle className={compact ? "text-base" : undefined}>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-4">Loading timeline...</div>
        </CardContent>
      </Card>
    );
  }

  if (relationships.length === 0) {
    return (
      <Card>
        <CardHeader className={compact ? "pb-2" : undefined}>
          <CardTitle className={compact ? "text-base" : undefined}>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Link2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No relationship history</p>
            <p className="text-xs text-muted-foreground mt-2">
              Relationships will appear here when connections are made
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className={compact ? "pb-2" : undefined}>
        <CardTitle className={compact ? "text-base" : undefined}>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea style={{ maxHeight }} className="pr-4">
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
            
            <div className="space-y-4">
              {relationships.map((entry) => (
                <div key={entry.id} className="relative flex gap-4 pl-1">
                  {/* Timeline dot */}
                  <div className={cn(
                    "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white",
                    entry.is_active ? getCategoryColor(entry.relationship_roles?.category || '') : 'bg-muted-foreground'
                  )}>
                    {getEntityIcon(entry)}
                  </div>
                  
                  {/* Content */}
                  <div className={cn(
                    "flex-1 rounded-lg border bg-card p-3",
                    !entry.is_active && "opacity-60",
                    compact ? "py-2" : undefined
                  )}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cn(
                            "font-medium",
                            compact ? "text-sm" : undefined
                          )}>
                            {getEntityName(entry)}
                          </span>
                          {entry.relationship_roles && (
                            <Badge 
                              variant="secondary" 
                              className="text-xs shrink-0"
                            >
                              {entry.relationship_roles.name}
                            </Badge>
                          )}
                          {!entry.is_active && (
                            <Badge variant="outline" className="text-xs shrink-0 text-muted-foreground">
                              <XCircle className="h-3 w-3 mr-1" />
                              Inactive
                            </Badge>
                          )}
                          {entry.is_active && (
                            <Badge variant="outline" className="text-xs shrink-0 text-green-600 border-green-200">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Active
                            </Badge>
                          )}
                        </div>
                        
                        {entry.notes && (
                          <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                            {entry.notes}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>Started: {format(new Date(entry.start_date), 'MMM d, yyyy')}</span>
                      </div>
                      
                      {entry.end_date && (
                        <div className="flex items-center gap-1">
                          <ArrowRight className="h-3 w-3" />
                          <span>Ended: {format(new Date(entry.end_date), 'MMM d, yyyy')}</span>
                        </div>
                      )}
                      
                      {entry.relationship_roles?.category && (
                        <Badge 
                          variant="outline" 
                          className="text-xs"
                        >
                          {entry.relationship_roles.category}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
