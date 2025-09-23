import { supabase } from '@/integrations/supabase/client';

export interface TemplateImportResult {
  success: boolean;
  templates_imported: number;
  devices_imported: number;
  devices_skipped: number;
  conflicts: ImportConflict[];
  errors: string[];
  warnings: string[];
  log_id?: string;
}

export interface ImportConflict {
  device_id: string;
  device_name: string;
  conflict_reason: string;
  existing_device_name?: string;
}

export interface GlobalTemplate {
  id: string;
  name: string;
  label_ar?: string;
  category: string;
  description?: string;
  properties_schema?: any;
  sku_generation_type?: string;
  sku_formula?: string;
  description_generation_type?: string;
  description_formula?: string;
  short_description_generation_type?: string;
  short_description_formula?: string;
  description_ar_generation_type?: string;
  description_ar_formula?: string;
  short_description_ar_generation_type?: string;
  short_description_ar_formula?: string;
  device_type_id?: string;
  brand_id?: string;
  image_url?: string;
  supports_multilang?: boolean;
  template_version?: number;
  is_global: boolean;
  active: boolean;
  created_at: string;
}

export interface GlobalDevice {
  id: string;
  name: string;
  category: string;
  brand?: string;
  model?: string;
  unit_price?: number;
  cost_price?: number;
  msrp?: number;
  currency_id?: string;
  cost_currency_id?: string;
  msrp_currency_id?: string;
  template_id?: string;
  template_properties?: any;
  specifications?: any;
  image_url?: string;
  identity_hash?: string;
  is_global: boolean;
  active: boolean;
}

export interface TemplateProperty {
  id?: string;
  template_id: string;
  tenant_id: string;
  property_name: string;
  label_en: string;
  label_ar?: string;
  property_type: string;
  property_unit?: string;
  is_required: boolean;
  is_identifier: boolean;
  is_device_name: boolean;
  sort_order: number;
  property_options?: any;
  formula?: string;
  depends_on_properties?: any;
  active: boolean;
}

export class TemplateImportService {
  private currentTenant: any;
  private currentUserId: string;

  constructor(currentTenant: any, currentUserId: string) {
    this.currentTenant = currentTenant;
    this.currentUserId = currentUserId;
  }

  /**
   * Import multiple global templates with their devices
   */
  async importTemplatesWithDevices(templateIds: string[]): Promise<TemplateImportResult> {
    const result: TemplateImportResult = {
      success: false,
      templates_imported: 0,
      devices_imported: 0,
      devices_skipped: 0,
      conflicts: [],
      errors: [],
      warnings: []
    };

    try {
      // Validate input
      if (!templateIds || templateIds.length === 0) {
        result.errors.push('No templates selected for import');
        return result;
      }

      if (!this.currentTenant) {
        result.errors.push('No tenant context available');
        return result;
      }

      // Load global templates
      const templates = await this.loadGlobalTemplates(templateIds);
      if (templates.length === 0) {
        result.errors.push('No valid global templates found');
        return result;
      }

      // Import each template
      for (const template of templates) {
        try {
          const templateResult = await this.importSingleTemplate(template);
          
          if (templateResult.success && templateResult.importedTemplate) {
            result.templates_imported++;
            
            // Import devices for this template
            const deviceResult = await this.importTemplateDevices(template.id, templateResult.importedTemplate.id);
            result.devices_imported += deviceResult.devices_imported;
            result.devices_skipped += deviceResult.devices_skipped;
            result.conflicts.push(...deviceResult.conflicts);
            result.warnings.push(...deviceResult.warnings);
          } else {
            result.warnings.push(`Skipped template "${template.name}": ${templateResult.reason || 'Unknown error'}`);
          }
        } catch (error) {
          console.error(`Error importing template ${template.name}:`, error);
          result.errors.push(`Failed to import template "${template.name}": ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Log the import operation
      const logId = await this.logImportOperation(result, templates[0].id);
      result.log_id = logId;

      result.success = result.errors.length === 0;
      return result;

    } catch (error) {
      console.error('Import operation failed:', error);
      result.errors.push(`Import operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return result;
    }
  }

  /**
   * Load global templates by IDs
   */
  private async loadGlobalTemplates(templateIds: string[]): Promise<GlobalTemplate[]> {
    const { data, error } = await supabase
      .from('device_templates')
      .select('*')
      .in('id', templateIds)
      .eq('is_global', true)
      .eq('active', true)
      .is('deleted_at', null);

    if (error) {
      console.error('Error loading global templates:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Import a single template with full validation and property handling
   */
  private async importSingleTemplate(globalTemplate: GlobalTemplate): Promise<{
    success: boolean;
    importedTemplate?: any;
    reason?: string;
  }> {
    try {
      // Check if template already imported
      const existingTemplate = await this.findExistingImportedTemplate(globalTemplate.id);
      if (existingTemplate) {
        return {
          success: true,
          importedTemplate: existingTemplate,
          reason: 'Template already imported'
        };
      }

      // Validate template data
      const validationResult = this.validateTemplateForImport(globalTemplate);
      if (!validationResult.isValid) {
        return {
          success: false,
          reason: `Validation failed: ${validationResult.errors.join(', ')}`
        };
      }

      // Load template properties from database
      const templateProperties = await this.loadTemplateProperties(globalTemplate.id);

      // Handle naming conflicts
      const templateName = await this.resolveTemplateName(globalTemplate.name);

      // Create the imported template
      const importedTemplate = await this.createImportedTemplate(globalTemplate, templateName);
      if (!importedTemplate) {
        return {
          success: false,
          reason: 'Failed to create imported template'
        };
      }

      // Import all properties (fixed + custom)
      await this.importTemplateProperties(importedTemplate.id, templateProperties);

      return {
        success: true,
        importedTemplate
      };

    } catch (error) {
      console.error('Error in importSingleTemplate:', error);
      return {
        success: false,
        reason: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Load all template properties from the database
   */
  private async loadTemplateProperties(templateId: string): Promise<TemplateProperty[]> {
    try {
      // Simple query to avoid TypeScript issues
      const response = await fetch(`/api/template-properties/${templateId}`);
      if (!response.ok) {
        // Fallback to direct supabase query
        const result = await this.loadPropertiesDirectly(templateId);
        return result;
      }
      const data = await response.json();
      return data || [];
    } catch (error) {
      console.error('Error in loadTemplateProperties:', error);
      return this.loadPropertiesDirectly(templateId);
    }
  }

  /**
   * Direct database query fallback
   */
  private async loadPropertiesDirectly(templateId: string): Promise<TemplateProperty[]> {
    try {
      console.log('Loading properties for template:', templateId);
      
      // Try a simple select without 'active' column since it doesn't exist
      const propertiesResponse = await supabase
        .from('device_template_properties')
        .select('id, template_id, property_name, label_en, label_ar, property_type, property_unit, is_required, is_identifier, is_device_name, sort_order, formula, depends_on_properties')
        .eq('template_id', templateId);

      if (propertiesResponse.error) {
        console.error('Properties query failed:', propertiesResponse.error);
        return [];
      }

      const properties = propertiesResponse.data || [];
      console.log(`Found ${properties.length} properties for template ${templateId}`);
      
      // Load options separately without 'active' column
      const optionsResponse = await supabase
        .from('device_template_options')
        .select('id, template_id, code, label_en, label_ar, unit, data_type, cost_modifier, cost_modifier_type, sort_order')
        .eq('template_id', templateId);

      if (optionsResponse.error) {
        console.error('Options query failed:', optionsResponse.error);
      }

      const options = optionsResponse.data || [];
      console.log(`Found ${options.length} options for template ${templateId}`);

      return properties.map(prop => ({
        id: prop.id,
        template_id: templateId,
        tenant_id: '',
        property_name: prop.property_name,
        label_en: prop.label_en,
        label_ar: prop.label_ar || '',
        property_type: prop.property_type,
        property_unit: prop.property_unit || '',
        is_required: prop.is_required,
        is_identifier: prop.is_identifier,
        is_device_name: prop.is_device_name,
        sort_order: prop.sort_order,
        property_options: options, // All options for now
        formula: prop.formula || '',
        depends_on_properties: prop.depends_on_properties || [],
        active: true
      }));

    } catch (error) {
      console.error('Error in loadPropertiesDirectly:', error);
      return [];
    }
  }

  /**
   * Create standard fixed properties that all templates should have
   */
  private createFixedProperties(templateId: string): TemplateProperty[] {
    return [
      {
        template_id: templateId,
        tenant_id: this.currentTenant.id,
        property_name: 'item_code',
        label_en: 'Item Code',
        label_ar: 'رمز الصنف',
        property_type: 'text',
        property_unit: '',
        is_required: true,
        is_identifier: true,
        is_device_name: false,
        sort_order: -4,
        property_options: [],
        formula: '',
        depends_on_properties: [],
        active: true
      },
      {
        template_id: templateId,
        tenant_id: this.currentTenant.id,
        property_name: 'cost_price',
        label_en: 'Cost Price',
        label_ar: 'سعر التكلفة',
        property_type: 'number',
        property_unit: '',
        is_required: false,
        is_identifier: false,
        is_device_name: false,
        sort_order: -3,
        property_options: [],
        formula: '',
        depends_on_properties: [],
        active: true
      },
      {
        template_id: templateId,
        tenant_id: this.currentTenant.id,
        property_name: 'cost_price_currency_id',
        label_en: 'Cost Price Currency',
        label_ar: 'عملة سعر التكلفة',
        property_type: 'select',
        property_unit: '',
        is_required: false,
        is_identifier: false,
        is_device_name: false,
        sort_order: -2,
        property_options: [],
        formula: '',
        depends_on_properties: [],
        active: true
      },
      {
        template_id: templateId,
        tenant_id: this.currentTenant.id,
        property_name: 'device_image',
        label_en: 'Device Image',
        label_ar: 'صورة الجهاز',
        property_type: 'image',
        property_unit: '',
        is_required: false,
        is_identifier: false,
        is_device_name: false,
        sort_order: -1,
        property_options: [],
        formula: '',
        depends_on_properties: [],
        active: true
      }
    ];
  }

  /**
   * Import all template properties (fixed + custom)
   */
  private async importTemplateProperties(templateId: string, sourceProperties: TemplateProperty[]): Promise<void> {
    const allProperties: TemplateProperty[] = [];

    // Add fixed properties first
    const fixedProperties = this.createFixedProperties(templateId);
    allProperties.push(...fixedProperties);

    // Add custom properties from source template
    const customProperties: TemplateProperty[] = [];
    for (const prop of sourceProperties) {
      customProperties.push({
        template_id: templateId,
        tenant_id: this.currentTenant.id,
        property_name: prop.property_name,
        label_en: prop.label_en,
        label_ar: prop.label_ar || '',
        property_type: prop.property_type,
        property_unit: prop.property_unit || '',
        is_required: prop.is_required,
        is_identifier: prop.is_identifier,
        is_device_name: prop.is_device_name,
        sort_order: prop.sort_order,
        property_options: prop.property_options || [],
        formula: prop.formula || '',
        depends_on_properties: prop.depends_on_properties || [],
        active: true
      });
    }

    allProperties.push(...customProperties);

    // Insert all properties in batches to handle large numbers
    if (allProperties.length > 0) {
      // First insert the properties
      const propertyInsertData = allProperties.map(prop => ({
        template_id: prop.template_id,
        tenant_id: prop.tenant_id,
        property_name: prop.property_name,
        label_en: prop.label_en,
        label_ar: prop.label_ar || '',
        property_type: prop.property_type,
        property_unit: prop.property_unit || '',
        is_required: prop.is_required,
        is_identifier: prop.is_identifier,
        is_device_name: prop.is_device_name,
        sort_order: prop.sort_order,
        formula: prop.formula || '',
        depends_on_properties: prop.depends_on_properties || [],
        active: prop.active
      }));

      const { data: insertedProperties, error: propertiesError } = await supabase
        .from('device_template_properties')
        .insert(propertyInsertData)
        .select();

      if (propertiesError) {
        console.error('Error importing template properties:', propertiesError);
        throw new Error(`Failed to import template properties: ${propertiesError.message}`);
      }

      // Now insert property options for properties that have them
      const optionsToInsert: any[] = [];
      
      for (let i = 0; i < allProperties.length; i++) {
        const prop = allProperties[i];
        const insertedProp = insertedProperties?.[i];
        
        if (insertedProp && prop.property_options && Array.isArray(prop.property_options) && prop.property_options.length > 0) {
          for (const option of prop.property_options) {
            optionsToInsert.push({
              template_id: templateId,
              tenant_id: this.currentTenant.id,
              code: option.code || '',
              label_en: option.label_en || '',
              label_ar: option.label_ar || '',
              unit: option.unit || '',
              data_type: option.data_type || 'text',
              cost_modifier: option.cost_modifier || 0,
              cost_modifier_type: option.cost_modifier_type || 'fixed',
              sort_order: option.sort_order || 0,
              active: option.active !== false
            });
          }
        }
      }

      // Insert all options if any exist
      if (optionsToInsert.length > 0) {
        const { error: optionsError } = await supabase
          .from('device_template_options')
          .insert(optionsToInsert);

        if (optionsError) {
          console.error('Error importing template options:', optionsError);
          throw new Error(`Failed to import template options: ${optionsError.message}`);
        }
      }
    }
  }

  /**
   * Find existing imported template by source ID
   */
  private async findExistingImportedTemplate(sourceTemplateId: string): Promise<any> {
    const { data } = await supabase
      .from('device_templates')
      .select('*')
      .eq('tenant_id', this.currentTenant.id)
      .eq('source_template_id', sourceTemplateId)
      .eq('active', true)
      .single();

    return data;
  }

  /**
   * Resolve template naming conflicts
   */
  private async resolveTemplateName(originalName: string): Promise<string> {
    const { data: nameConflict } = await supabase
      .from('device_templates')
      .select('id')
      .eq('tenant_id', this.currentTenant.id)
      .eq('name', originalName)
      .eq('active', true)
      .single();

    return nameConflict ? `${originalName} (Imported)` : originalName;
  }

  /**
   * Create imported template with all fields
   */
  private async createImportedTemplate(globalTemplate: GlobalTemplate, templateName: string): Promise<any> {
    const { data, error } = await supabase
      .from('device_templates')
      .insert({
        name: templateName,
        label_ar: globalTemplate.label_ar || '',
        category: globalTemplate.category,
        description: globalTemplate.description || '',
        properties_schema: globalTemplate.properties_schema || [],
        sku_generation_type: globalTemplate.sku_generation_type || 'fixed',
        sku_formula: globalTemplate.sku_formula || '',
        description_generation_type: globalTemplate.description_generation_type || 'fixed',
        description_formula: globalTemplate.description_formula || '',
        short_description_generation_type: globalTemplate.short_description_generation_type || 'fixed',
        short_description_formula: globalTemplate.short_description_formula || '',
        description_ar_generation_type: globalTemplate.description_ar_generation_type || 'fixed',
        description_ar_formula: globalTemplate.description_ar_formula || '',
        short_description_ar_generation_type: globalTemplate.short_description_ar_generation_type || 'fixed',
        short_description_ar_formula: globalTemplate.short_description_ar_formula || '',
        device_type_id: globalTemplate.device_type_id,
        brand_id: globalTemplate.brand_id,
        image_url: globalTemplate.image_url || '',
        supports_multilang: globalTemplate.supports_multilang || false,
        is_global: false,
        tenant_id: this.currentTenant.id,
        source_template_id: globalTemplate.id,
        import_status: 'imported',
        imported_at: new Date().toISOString(),
        sync_version: globalTemplate.template_version || 1,
        active: true
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating imported template:', error);
      throw new Error(`Failed to create imported template: ${error.message}`);
    }

    return data;
  }

  /**
   * Import devices for a template
   */
  private async importTemplateDevices(sourceTemplateId: string, tenantTemplateId: string): Promise<{
    devices_imported: number;
    devices_skipped: number;
    conflicts: ImportConflict[];
    warnings: string[];
  }> {
    const result = {
      devices_imported: 0,
      devices_skipped: 0,
      conflicts: [] as ImportConflict[],
      warnings: [] as string[]
    };

    try {
      // Load global devices for this template
      const { data: globalDevices, error } = await supabase
        .from('devices')
        .select('*')
        .eq('template_id', sourceTemplateId)
        .eq('active', true)
        .is('tenant_id', null);

      if (error) {
        console.error('Error loading global devices:', error);
        result.warnings.push(`Failed to load devices for template: ${error.message}`);
        return result;
      }

      if (!globalDevices || globalDevices.length === 0) {
        result.warnings.push('No devices found for template');
        return result;
      }

      // Import each device
      for (const device of globalDevices) {
        const importResult = await this.importSingleDevice(device, tenantTemplateId);
        
        if (importResult.success) {
          result.devices_imported++;
        } else {
          result.devices_skipped++;
          result.conflicts.push({
            device_id: device.id,
            device_name: device.name,
            conflict_reason: importResult.reason || 'Unknown conflict',
            existing_device_name: importResult.existing_device_name
          });
        }
      }

      return result;

    } catch (error) {
      console.error('Error importing template devices:', error);
      result.warnings.push(`Error importing devices: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return result;
    }
  }

  /**
   * Import a single device with conflict detection
   */
  private async importSingleDevice(globalDevice: GlobalDevice, tenantTemplateId: string): Promise<{
    success: boolean;
    reason?: string;
    existing_device_name?: string;
  }> {
    try {
      // Check for identity conflicts
      if (globalDevice.identity_hash) {
        const { data: existingDevice } = await supabase
          .from('devices')
          .select('name')
          .eq('tenant_id', this.currentTenant.id)
          .eq('identity_hash', globalDevice.identity_hash)
          .eq('active', true)
          .single();

        if (existingDevice) {
          return {
            success: false,
            reason: 'Device with same identity (name, brand, model) already exists',
            existing_device_name: existingDevice.name
          };
        }
      }

      // Import the device
      const { error } = await supabase
        .from('devices')
        .insert({
          name: globalDevice.name,
          category: globalDevice.category,
          brand: globalDevice.brand,
          model: globalDevice.model,
          unit_price: globalDevice.unit_price,
          cost_price: globalDevice.cost_price,
          msrp: globalDevice.msrp,
          currency_id: globalDevice.currency_id,
          cost_currency_id: globalDevice.cost_currency_id,
          msrp_currency_id: globalDevice.msrp_currency_id,
          template_id: tenantTemplateId,
          template_properties: globalDevice.template_properties || {},
          specifications: globalDevice.specifications,
          image_url: globalDevice.image_url,
          tenant_id: this.currentTenant.id,
          source_device_id: globalDevice.id,
          import_status: 'imported',
          imported_at: new Date().toISOString(),
          sync_version: 1,
          is_global: false,
          active: true
        });

      if (error) {
        console.error('Error importing device:', error);
        return {
          success: false,
          reason: `Database error: ${error.message}`
        };
      }

      return { success: true };

    } catch (error) {
      console.error('Error in importSingleDevice:', error);
      return {
        success: false,
        reason: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Validate template for import
   */
  private validateTemplateForImport(template: GlobalTemplate): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!template.name?.trim()) {
      errors.push('Template name is required');
    }

    if (!template.category?.trim()) {
      errors.push('Template category is required');
    }

    if (!template.is_global) {
      errors.push('Only global templates can be imported');
    }

    if (!template.active) {
      errors.push('Template is not active');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Log the import operation
   */
  private async logImportOperation(result: TemplateImportResult, templateId: string): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('template_sync_logs')
        .insert({
          tenant_id: this.currentTenant.id,
          template_id: templateId,
          source_template_id: templateId,
          action_type: 'import',
          status: result.success ? 'success' : 'failed',
          templates_updated: result.templates_imported,
          devices_added: result.devices_imported,
          devices_updated: 0,
          devices_skipped: result.devices_skipped,
          conflict_report: result.conflicts as any, // Cast to satisfy Json type
          created_by: this.currentUserId,
          notes: `Import operation: ${result.templates_imported} templates, ${result.devices_imported} devices imported, ${result.devices_skipped} devices skipped`
        })
        .select()
        .single();

      if (error) {
        console.error('Error logging import operation:', error);
        return '';
      }

      return data?.id || '';

    } catch (error) {
      console.error('Error in logImportOperation:', error);
      return '';
    }
  }
}