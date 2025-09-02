import { supabase } from '@/integrations/supabase/client';
import { CompanyRelationship } from '@/components/forms/CompanyRelationshipSelector';

export async function saveEntityRelationships(
  entityType: 'deal' | 'site' | 'company' | 'lead_company' | 'lead_contact' | 'lead_site',
  entityId: string,
  relationships: CompanyRelationship[],
  tenantId: string
): Promise<void> {
  if (relationships.length === 0) return;

  const relationshipData = relationships.map(rel => ({
    entity_type: entityType,
    entity_id: entityId,
    company_id: rel.company_id,
    contact_id: null,
    relationship_role_id: rel.relationship_role_id,
    notes: rel.notes || null,
    tenant_id: tenantId,
  }));

  const { error } = await supabase
    .from('entity_relationships')
    .insert(relationshipData);

  if (error) {
    console.error('Error saving entity relationships:', error);
    throw new Error('Failed to save company relationships');
  }
}

export async function loadEntityRelationships(
  entityType: string,
  entityId: string,
  tenantId: string
): Promise<CompanyRelationship[]> {
  const { data, error } = await supabase
    .from('entity_relationships')
    .select(`
      company_id,
      relationship_role_id,
      notes,
      companies!inner(id, name),
      relationship_roles!inner(id, name, category)
    `)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .eq('tenant_id', tenantId)
    .not('company_id', 'is', null);

  if (error) {
    console.error('Error loading entity relationships:', error);
    return [];
  }

  return (data || []).map(rel => ({
    company_id: rel.company_id!,
    company_name: (rel.companies as any).name,
    relationship_role_id: rel.relationship_role_id,
    relationship_role_name: (rel.relationship_roles as any).name,
    relationship_category: (rel.relationship_roles as any).category,
    notes: rel.notes || undefined,
  }));
}