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
  is_active?: boolean;
}

export interface RelationshipRecord {
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
  companies?: { id: string; name: string };
  contacts?: { id: string; first_name: string; last_name: string };
  relationship_roles?: { id: string; name: string; category: string };
}

/**
 * Save entity relationships using the Pure Connector model.
 * This is the single source of truth for all entity links.
 */
export async function saveEntityRelationships(
  entityType: 'deal' | 'site' | 'company' | 'lead_company' | 'lead_contact' | 'lead_site' | 'contract',
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
    is_active: true,
    start_date: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('entity_relationships')
    .insert(relationshipData);

  if (error) {
    console.error('Error saving entity relationships:', error);
    throw new Error('Failed to save entity relationships');
  }
}

/**
 * Load active entity relationships for a given entity.
 */
export async function loadEntityRelationships(
  entityType: string,
  entityId: string,
  tenantId: string,
  includeInactive: boolean = false
): Promise<EntityRelationshipData[]> {
  let query = supabase
    .from('entity_relationships')
    .select(`
      company_id,
      contact_id,
      relationship_role_id,
      notes,
      is_active,
      companies(id, name),
      contacts(id, first_name, last_name),
      relationship_roles!inner(id, name, category)
    `)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .eq('tenant_id', tenantId);

  if (!includeInactive) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;

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
        is_active: rel.is_active,
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
        is_active: rel.is_active,
      };
    }
    return null;
  }).filter(Boolean) as EntityRelationshipData[];
}

/**
 * Deactivate a relationship (Employee Shift workflow).
 * Sets is_active = false and end_date instead of deleting.
 */
export async function deactivateRelationship(
  relationshipId: string
): Promise<void> {
  const { error } = await supabase
    .from('entity_relationships')
    .update({ is_active: false })
    .eq('id', relationshipId);

  if (error) {
    console.error('Error deactivating relationship:', error);
    throw new Error('Failed to deactivate relationship');
  }
}

/**
 * Reactivate a previously deactivated relationship.
 */
export async function reactivateRelationship(
  relationshipId: string
): Promise<void> {
  const { error } = await supabase
    .from('entity_relationships')
    .update({ 
      is_active: true,
      end_date: null,
      start_date: new Date().toISOString()
    })
    .eq('id', relationshipId);

  if (error) {
    console.error('Error reactivating relationship:', error);
    throw new Error('Failed to reactivate relationship');
  }
}

/**
 * Get all relationships for a company or contact (360° view).
 * Queries where the entity appears as company_id or contact_id.
 */
export async function get360Relationships(
  entityType: 'company' | 'contact',
  entityId: string,
  tenantId: string,
  includeInactive: boolean = false
): Promise<RelationshipRecord[]> {
  const column = entityType === 'company' ? 'company_id' : 'contact_id';
  
  let query = supabase
    .from('entity_relationships')
    .select(`
      *,
      relationship_roles (id, name, category),
      companies (id, name),
      contacts (id, first_name, last_name)
    `)
    .eq('tenant_id', tenantId)
    .eq(column, entityId)
    .order('start_date', { ascending: false });

  if (!includeInactive) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching 360 relationships:', error);
    return [];
  }

  return data || [];
}

/**
 * Transfer a contact between companies (Employee Shift workflow).
 * Deactivates the old relationship and creates a new one.
 */
export async function transferContactToCompany(
  contactId: string,
  oldCompanyId: string | null,
  newCompanyId: string,
  roleId: string,
  entityType: string,
  entityId: string,
  tenantId: string,
  notes?: string
): Promise<void> {
  // If there's an existing relationship, deactivate it
  if (oldCompanyId) {
    const { data: existing } = await supabase
      .from('entity_relationships')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .eq('contact_id', contactId)
      .eq('company_id', oldCompanyId)
      .eq('is_active', true)
      .single();

    if (existing) {
      await deactivateRelationship(existing.id);
    }
  }

  // Create the new relationship
  const { error } = await supabase
    .from('entity_relationships')
    .insert({
      entity_type: entityType,
      entity_id: entityId,
      contact_id: contactId,
      company_id: newCompanyId,
      relationship_role_id: roleId,
      tenant_id: tenantId,
      notes: notes || null,
      is_active: true,
      start_date: new Date().toISOString(),
    });

  if (error) {
    console.error('Error creating new relationship:', error);
    throw new Error('Failed to transfer contact');
  }
}

/**
 * Get contacts by relationship role (for filtered selectors).
 * E.g., search for all "Technicians" linked to a company.
 */
export async function getContactsByRole(
  roleName: string,
  tenantId: string,
  companyId?: string
): Promise<Array<{ id: string; first_name: string; last_name: string; email?: string }>> {
  let query = supabase
    .from('entity_relationships')
    .select(`
      contact_id,
      contacts (id, first_name, last_name, email),
      relationship_roles!inner (name)
    `)
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .ilike('relationship_roles.name', roleName);

  if (companyId) {
    query = query.eq('company_id', companyId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching contacts by role:', error);
    return [];
  }

  // Deduplicate and extract contacts
  const contactMap = new Map();
  (data || []).forEach(rel => {
    if (rel.contacts && !contactMap.has(rel.contact_id)) {
      contactMap.set(rel.contact_id, rel.contacts);
    }
  });

  return Array.from(contactMap.values());
}

/**
 * Get companies by relationship role.
 */
export async function getCompaniesByRole(
  roleName: string,
  tenantId: string
): Promise<Array<{ id: string; name: string }>> {
  const { data, error } = await supabase
    .from('entity_relationships')
    .select(`
      company_id,
      companies (id, name),
      relationship_roles!inner (name)
    `)
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .ilike('relationship_roles.name', roleName);

  if (error) {
    console.error('Error fetching companies by role:', error);
    return [];
  }

  // Deduplicate and extract companies
  const companyMap = new Map();
  (data || []).forEach(rel => {
    if (rel.companies && !companyMap.has(rel.company_id)) {
      companyMap.set(rel.company_id, rel.companies);
    }
  });

  return Array.from(companyMap.values());
}
