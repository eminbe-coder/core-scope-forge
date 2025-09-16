import { supabase } from '@/integrations/supabase/client';
import { CompanyRelationship } from '@/components/forms/CompanyRelationshipSelector';

export interface EntityRelationshipData {
  entity_type: 'company' | 'contact';
  entity_id: string;
  entity_name: string;
  relationship_role_id: string;
  relationship_role_name: string;
  relationship_category: string;
  notes?: string;
}

export async function saveEntityRelationships(
  entityType: 'deal' | 'site' | 'company' | 'lead_company' | 'lead_contact' | 'lead_site',
  entityId: string,
  relationships: EntityRelationshipData[],
  tenantId: string
): Promise<void> {
  if (relationships.length === 0) return;

  const relationshipData = relationships.map(rel => ({
    entity_type: entityType,
    entity_id: entityId,
    company_id: rel.entity_type === 'company' ? rel.entity_id : null,
    contact_id: rel.entity_type === 'contact' ? rel.entity_id : null,
    relationship_role_id: rel.relationship_role_id,
    notes: rel.notes || null,
    tenant_id: tenantId,
  }));

  const { error } = await supabase
    .from('entity_relationships')
    .insert(relationshipData);

  if (error) {
    console.error('Error saving entity relationships:', error);
    throw new Error('Failed to save entity relationships');
  }
}

export async function loadEntityRelationships(
  entityType: string,
  entityId: string,
  tenantId: string
): Promise<EntityRelationshipData[]> {
  const { data, error } = await supabase
    .from('entity_relationships')
    .select(`
      company_id,
      contact_id,
      relationship_role_id,
      notes,
      companies(id, name),
      contacts(id, first_name, last_name),
      relationship_roles!inner(id, name, category)
    `)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .eq('tenant_id', tenantId);

  if (error) {
    console.error('Error loading entity relationships:', error);
    return [];
  }

  return (data || []).map(rel => {
    if (rel.company_id && rel.companies) {
      return {
        entity_type: 'company' as const,
        entity_id: rel.company_id,
        entity_name: (rel.companies as any).name,
        relationship_role_id: rel.relationship_role_id,
        relationship_role_name: (rel.relationship_roles as any).name,
        relationship_category: (rel.relationship_roles as any).category,
        notes: rel.notes || undefined,
      };
    } else if (rel.contact_id && rel.contacts) {
      return {
        entity_type: 'contact' as const,
        entity_id: rel.contact_id,
        entity_name: `${(rel.contacts as any).first_name} ${(rel.contacts as any).last_name}`,
        relationship_role_id: rel.relationship_role_id,
        relationship_role_name: (rel.relationship_roles as any).name,
        relationship_category: (rel.relationship_roles as any).category,
        notes: rel.notes || undefined,
      };
    }
    return null;
  }).filter(Boolean) as EntityRelationshipData[];
}