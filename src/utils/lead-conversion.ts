import { supabase } from '@/integrations/supabase/client';

interface ConvertLeadToDealParams {
  leadType: 'company' | 'contact' | 'site';
  leadId: string;
  dealData: {
    name: string;
    description?: string;
    value?: number;
    currency_id?: string;
    stage_id: string;
    priority: 'low' | 'medium' | 'high';
    expected_close_date?: string;
    assigned_to?: string;
    notes?: string;
  };
  tenantId: string;
  userId: string;
}

export const convertLeadToDeal = async ({
  leadType,
  leadId,
  dealData,
  tenantId,
  userId
}: ConvertLeadToDealParams) => {
  try {
    let leadData: any;
    let customerId = null;

    if (leadType === 'company') {
      // Fetch company lead data
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', leadId)
        .single();

      if (error) throw error;
      leadData = data;

      // Create customer from company
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .insert({
          name: leadData.name,
          type: 'company',
          email: leadData.email,
          phone: leadData.phone,
          tenant_id: tenantId,
        })
        .select()
        .single();

      if (customerError) throw customerError;
      customerId = customer.id;
    } else if (leadType === 'contact') {
      // Fetch contact lead data
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', leadId)
        .single();

      if (error) throw error;
      leadData = data;

      // Create customer from contact
      const customerName = `${leadData.first_name} ${leadData.last_name || ''}`.trim();
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .insert({
          name: customerName,
          type: 'individual',
          email: leadData.email,
          phone: leadData.phone,
          tenant_id: tenantId,
        })
        .select()
        .single();

      if (customerError) throw customerError;
      customerId = customer.id;
    } else if (leadType === 'site') {
      // Fetch site lead data
      const { data, error } = await supabase
        .from('sites')
        .select('*')
        .eq('id', leadId)
        .single();

      if (error) throw error;
      leadData = data;
      
      // For sites, we might need to create a customer or use existing one
      if (leadData.customer_id) {
        customerId = leadData.customer_id;
      }
    }

    // Create deal with source information carried over
    const { data: deal, error: dealError } = await supabase
      .from('deals')
      .insert({
        ...dealData,
        customer_id: customerId,
        source_id: leadData?.source_id || null,
        source_company_id: leadData?.source_company_id || null,
        source_contact_id: leadData?.source_contact_id || null,
        source_user_id: leadData?.source_user_id || null,
        solution_category_ids: leadData?.solution_category_ids || [],
        tenant_id: tenantId,
      })
      .select()
      .single();

    if (dealError) throw dealError;

    // Update lead to mark as converted (archived)
    const updateTable = leadType === 'contact' ? 'contacts' : leadType === 'company' ? 'companies' : 'sites';
    await supabase
      .from(updateTable)
      .update({ is_lead: false })
      .eq('id', leadId);

    // Migrate files if any exist
    const { data: leadFiles } = await supabase
      .from('lead_files')
      .select('*')
      .eq('entity_id', leadId)
      .eq('entity_type', leadType)
      .eq('tenant_id', tenantId);

    if (leadFiles && leadFiles.length > 0) {
      const dealFilesData = leadFiles.map(file => ({
        deal_id: deal.id,
        name: file.name,
        file_path: file.file_path.replace('lead-files/', 'deal-files/'),
        mime_type: file.mime_type,
        file_size: file.file_size,
        notes: file.notes,
        created_by: file.created_by,
        tenant_id: tenantId,
      }));

      // Copy files in storage
      for (const file of leadFiles) {
        try {
          const { data: fileData } = await supabase.storage
            .from('lead-files')
            .download(file.file_path);
          
          if (fileData) {
            const newPath = file.file_path.replace('lead-files/', 'deal-files/');
            await supabase.storage
              .from('deal-files')
              .upload(newPath, fileData);
          }
        } catch (fileError) {
          console.error('Error copying file:', fileError);
        }
      }

      await supabase.from('deal_files').insert(dealFilesData);
      await supabase.from('lead_files').delete().eq('entity_id', leadId).eq('entity_type', leadType);
      await supabase.storage.from('lead-files').remove(leadFiles.map(f => f.file_path));
    }

    // Log activity
    await supabase
      .from('activity_logs')
      .insert({
        entity_id: deal.id,
        entity_type: 'deal',
        activity_type: 'lead_converted',
        title: 'Lead Converted to Deal',
        description: `${leadType} lead was converted to deal "${deal.name}"`,
        created_by: userId,
        tenant_id: tenantId,
      });

    return deal;
  } catch (error) {
    console.error('Error converting lead to deal:', error);
    throw error;
  }
};