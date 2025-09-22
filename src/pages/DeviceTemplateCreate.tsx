import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Trash2, Plus, ArrowLeft, Save, Eye, GripVertical, RefreshCw, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTenant } from "@/hooks/use-tenant";
import { useBrands } from "@/hooks/use-brands";
import { useDeviceTypes } from "@/hooks/use-device-types";
import { useAuth } from "@/hooks/use-auth";
import { ImageUpload } from "@/components/ui/image-upload";
import { FormulaBuilder } from "@/components/ui/formula-builder";
import { HierarchicalDeviceTypeSelect } from "@/components/ui/hierarchical-device-type-select";
import { FormulaEngine, PropertyValue } from "@/lib/formula-engine";

interface DeviceTemplatePropertyOption {
  code: string;
  label_en: string;
  label_ar: string;
  cost_modifier?: number;
  cost_modifier_type?: 'fixed' | 'percentage';
  has_cost_impact?: boolean;
}

interface DeviceTemplateProperty {
  id: string;
  name: string;
  label_en: string;
  label_ar: string;
  type: 'text' | 'number' | 'select' | 'multiselect' | 'boolean' | 'date' | 'calculated';
  data_type: string; // Add this for compatibility with FormulaBuilder
  required: boolean;
  is_identifier: boolean;
  is_device_name: boolean;
  unit?: string;
  sort_order: number;
  property_options: DeviceTemplatePropertyOption[];
  options?: Array<{ code: string; label_en: string; label_ar?: string; }>; // Add this alias for FormulaBuilder
  formula?: string;
  depends_on_properties?: string[];
}

interface DeviceTemplate {
  name: string;
  label_ar?: string;
  device_type_id: string;
  brand_id?: string;
  description?: string;
  supports_multilang: boolean;
  sku_generation_type: 'fixed' | 'dynamic';
  sku_formula?: string;
  description_generation_type: 'fixed' | 'dynamic';
  description_formula?: string;
  short_description_generation_type: 'fixed' | 'dynamic';
  short_description_formula?: string;
  description_ar_generation_type?: 'fixed' | 'dynamic';
  description_ar_formula?: string;
  short_description_ar_generation_type?: 'fixed' | 'dynamic';
  short_description_ar_formula?: string;
  image_url?: string;
  is_global: boolean;
  properties: DeviceTemplateProperty[];
  template_version?: number;
  last_modified_by?: string;
  created_by?: string;
}


const PROPERTY_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'select', label: 'Single Select' },
  { value: 'multiselect', label: 'Multi Select' },
  { value: 'dynamic_multiselect', label: 'Dynamic Multi-Select' },
  { value: 'boolean', label: 'Yes/No' },
  { value: 'date', label: 'Date' },
  { value: 'calculated', label: 'Calculated' }
];

export default function DeviceTemplateCreate() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const { brands, loading: brandsLoading } = useBrands();
  const { deviceTypes, loading: deviceTypesLoading } = useDeviceTypes();
  
  const [activeTab, setActiveTab] = useState("global");
  const [loading, setLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [template, setTemplate] = useState<DeviceTemplate>({
    name: '',
    label_ar: '',
    device_type_id: '',
    brand_id: '',
    description: '',
    supports_multilang: false,
    sku_generation_type: 'fixed',
    sku_formula: '',
    description_generation_type: 'fixed',
    description_formula: '',
    short_description_generation_type: 'dynamic',
    short_description_formula: '',
    description_ar_generation_type: 'dynamic',
    description_ar_formula: '',
    short_description_ar_generation_type: 'dynamic',
    short_description_ar_formula: '',
    image_url: '',
    is_global: true,
    properties: []
  });
  const [isSaving, setIsSaving] = useState(false);
  const [autoSaveId, setAutoSaveId] = useState<string | null>(null);

  const isEditMode = !!id;

  // Fixed properties that are always available in formulas
  const getFixedProperties = (): DeviceTemplateProperty[] => {
    return [
      {
        id: 'item_code',
        name: 'item_code',
        label_en: 'Item Code', 
        label_ar: 'رمز العنصر',
        type: 'text' as const,
        data_type: 'text',
        required: true,
        is_identifier: true,
        is_device_name: false,
        sort_order: 0,
        property_options: [],
        options: [],
        formula: '',
        depends_on_properties: []
      },
      {
        id: 'cost_price',
        name: 'cost_price',
        label_en: 'Cost Price',
        label_ar: 'سعر التكلفة', 
        type: 'number' as const,
        data_type: 'number',
        required: true,
        is_identifier: false,
        is_device_name: false,
        sort_order: 1,
        property_options: [],
        options: [],
        formula: '',
        depends_on_properties: []
      },
      {
        id: 'cost_price_currency_id',
        name: 'cost_price_currency_id',
        label_en: 'Cost Price Currency',
        label_ar: 'عملة سعر التكلفة',
        type: 'select' as const,
        data_type: 'select',
        required: true,
        is_identifier: false,
        is_device_name: false,
        sort_order: 1.5,
        property_options: [],
        options: [],
        formula: '',
        depends_on_properties: []
      },
      {
        id: 'device_image',
        name: 'device_image',
        label_en: 'Device Image',
        label_ar: 'صورة الجهاز',
        type: 'text' as const,
        data_type: 'image',
        required: false,
        is_identifier: false,
        is_device_name: false,
        sort_order: 2.5,
        property_options: [],
        options: [],
        formula: '',
        depends_on_properties: []
      }
    ];
  };

  // Get all available properties (fixed + template properties)
  const getAllAvailableProperties = (properties?: DeviceTemplateProperty[]): DeviceTemplateProperty[] => {
    const templateProps = properties || template.properties;
    return [...getFixedProperties(), ...templateProps];
  };

  const generateSKU = (properties: DeviceTemplateProperty[]) => {
    if (!template.sku_formula || properties.length === 0) return 'Enter SKU formula to see preview';

    const allProperties = getAllAvailableProperties(properties);
    const propertyValues: PropertyValue[] = allProperties.map(prop => {
      let sampleValue: string | number = '';
      let options: Array<{ code: string; label_en: string; label_ar?: string; }> | undefined;
      
      switch (prop.data_type) {
        case 'number':
          sampleValue = 100;
          break;
        case 'select':
          options = prop.options;
          sampleValue = prop.options?.[0]?.code || 'OPT1';
          break;
        case 'multiselect':
          options = prop.options;
          sampleValue = prop.options?.[0]?.code || 'OPT1';
          break;
        case 'dynamic_multiselect':
          sampleValue = 'VAL1,VAL2,VAL3';
          break;
        case 'text':
          sampleValue = prop.name === 'item_code' ? 'ITM001' : 'Sample Text';
          break;
        case 'boolean':
          sampleValue = 'Yes';
          break;
        default:
          sampleValue = prop.name === 'item_code' ? 'ITM001' : 'Sample';
      }

      return { name: prop.name, value: sampleValue, options };
    });

    return FormulaEngine.evaluateText(template.sku_formula, propertyValues, 'sku');
  };

  const generateDescription = (properties: DeviceTemplateProperty[]) => {
    if (!template.description_formula || properties.length === 0) return 'Enter description formula to see preview';

    const allProperties = getAllAvailableProperties(properties);
    const propertyValues: PropertyValue[] = allProperties.map(prop => {
      let sampleValue: string | number = '';
      let options: Array<{ code: string; label_en: string; label_ar?: string; }> | undefined;
      
      switch (prop.data_type) {
        case 'number':
          sampleValue = 100;
          break;
        case 'select':
          options = prop.options;
          sampleValue = prop.options?.[0]?.label_en || 'Option 1';
          break;
        case 'multiselect':
          options = prop.options;
          sampleValue = prop.options?.[0]?.label_en || 'Option 1';
          break;
        case 'dynamic_multiselect':
          sampleValue = 'Value1, Value2, Value3';
          break;
        case 'text':
          sampleValue = prop.name === 'item_code' ? 'ITM001' : 'Sample Text';
          break;
        case 'boolean':
          sampleValue = 'Yes';
          break;
        default:
          sampleValue = prop.name === 'item_code' ? 'ITM001' : 'Sample';
      }

      return { name: prop.name, value: sampleValue, options };
    });

    return FormulaEngine.evaluateText(template.description_formula, propertyValues, 'description_en');
  };

  const generateShortDescription = (properties: DeviceTemplateProperty[]) => {
    if (!template.short_description_formula || properties.length === 0) return 'Enter short description formula to see preview';

    const allProperties = getAllAvailableProperties(properties);
    const propertyValues: PropertyValue[] = allProperties.map(prop => {
      let sampleValue: string | number = '';
      let options: Array<{ code: string; label_en: string; label_ar?: string; }> | undefined;
      
      switch (prop.data_type) {
        case 'number':
          sampleValue = 100;
          break;
        case 'select':
          options = prop.options;
          sampleValue = prop.options?.[0]?.label_en || 'Option 1';
          break;
        case 'multiselect':
          options = prop.options;
          sampleValue = prop.options?.[0]?.label_en || 'Option 1';
          break;
        case 'dynamic_multiselect':
          sampleValue = 'Value1, Value2, Value3';
          break;
        case 'text':
          sampleValue = prop.name === 'item_code' ? 'ITM001' : 'Sample Text';
          break;
        case 'boolean':
          sampleValue = 'Yes';
          break;
        default:
          sampleValue = prop.name === 'item_code' ? 'ITM001' : 'Sample';
      }

      return { name: prop.name, value: sampleValue, options };
    });

    return FormulaEngine.evaluateText(template.short_description_formula, propertyValues, 'description_en');
  };

  const generateDescriptionAr = (properties: DeviceTemplateProperty[]) => {
    if (!template.description_ar_formula || properties.length === 0) return 'Enter Arabic description formula to see preview';

    const allProperties = getAllAvailableProperties(properties);
    const propertyValues: PropertyValue[] = allProperties.map(prop => {
      let sampleValue: string | number = '';
      let options: Array<{ code: string; label_en: string; label_ar?: string; }> | undefined;
      
      switch (prop.data_type) {
        case 'number':
          sampleValue = 100;
          break;
        case 'select':
          options = prop.options;
          sampleValue = prop.options?.[0]?.label_ar || prop.options?.[0]?.label_en || 'Option 1';
          break;
        case 'multiselect':
          options = prop.options;
          sampleValue = prop.options?.[0]?.label_ar || prop.options?.[0]?.label_en || 'Option 1';
          break;
        case 'dynamic_multiselect':
          sampleValue = 'Value1, Value2, Value3';
          break;
        case 'text':
          sampleValue = prop.name === 'item_code' ? 'ITM001' : 'نص عينة';
          break;
        case 'boolean':
          sampleValue = 'نعم';
          break;
        default:
          sampleValue = prop.name === 'item_code' ? 'ITM001' : 'عينة';
      }

      return { name: prop.name, value: sampleValue, options };
    });

    return FormulaEngine.evaluateText(template.description_ar_formula, propertyValues, 'description_ar');
  };

  const generateShortDescriptionAr = (properties: DeviceTemplateProperty[]) => {
    if (!template.short_description_ar_formula || properties.length === 0) return 'Enter Arabic short description formula to see preview';

    const allProperties = getAllAvailableProperties(properties);
    const propertyValues: PropertyValue[] = allProperties.map(prop => {
      let sampleValue: string | number = '';
      let options: Array<{ code: string; label_en: string; label_ar?: string; }> | undefined;
      
      switch (prop.data_type) {
        case 'number':
          sampleValue = 100;
          break;
        case 'select':
          options = prop.options;
          sampleValue = prop.options?.[0]?.label_ar || prop.options?.[0]?.label_en || 'Option 1';
          break;
        case 'multiselect':
          options = prop.options;
          sampleValue = prop.options?.[0]?.label_ar || prop.options?.[0]?.label_en || 'Option 1';
          break;
        case 'dynamic_multiselect':
          sampleValue = 'Value1, Value2, Value3';
          break;
        case 'text':
          sampleValue = prop.name === 'item_code' ? 'ITM001' : 'نص عينة';
          break;
        case 'boolean':
          sampleValue = 'نعم';
          break;
        default:
          sampleValue = prop.name === 'item_code' ? 'ITM001' : 'عينة';
      }

      return { name: prop.name, value: sampleValue, options };
    });

    return FormulaEngine.evaluateText(template.short_description_ar_formula, propertyValues, 'description_ar');
  };

  // Load existing template for edit mode
  useEffect(() => {
    const loadTemplate = async () => {
      if (!isEditMode || !currentTenant) return;

      setLoading(true);
      try {
        // Load template
        const { data: templateData, error: templateError } = await supabase
          .from('device_templates')
          .select('*')
          .eq('id', id)
          .single();

        if (templateError) throw templateError;

        // Load properties
        const { data: propertiesData, error: propertiesError } = await supabase
          .from('device_template_properties')
          .select('*')
          .eq('template_id', id)
          .order('sort_order');

        if (propertiesError) throw propertiesError;

        // Map properties to new format
        const properties: DeviceTemplateProperty[] = propertiesData.map(prop => ({
          id: prop.id,
          name: prop.property_name,
          label_en: prop.label_en,
          label_ar: prop.label_ar,
          type: prop.property_type as any,
          data_type: prop.property_type,
          required: prop.is_required,
          is_identifier: prop.is_identifier,
          is_device_name: prop.is_device_name || false,
          unit: prop.property_unit,
          sort_order: prop.sort_order || 0,
          property_options: (prop.property_options as any) || [],
          options: ((prop.property_options as any) || []).map((opt: any) => ({ 
            code: opt.code, 
            label_en: opt.label_en,
            label_ar: opt.label_ar
          })),
          formula: prop.formula || '',
          depends_on_properties: prop.depends_on_properties || []
        }));

        // Map old template fields to new interface
        setTemplate({
          name: templateData.name,
          label_ar: templateData.label_ar || '',
          device_type_id: templateData.device_type_id || templateData.category, // Handle both old and new schema
          brand_id: templateData.brand_id || '',
          description: templateData.description || '',
          supports_multilang: templateData.supports_multilang || false,
          sku_generation_type: (templateData.sku_generation_type as 'fixed' | 'dynamic') || 'fixed',
          sku_formula: templateData.sku_formula || '',
          description_generation_type: (templateData.description_generation_type as 'fixed' | 'dynamic') || 'fixed',
          description_formula: templateData.description_formula || '',
          short_description_generation_type: (templateData.short_description_generation_type as 'fixed' | 'dynamic') || 'dynamic',
          short_description_formula: templateData.short_description_formula || '',
          description_ar_generation_type: (templateData.description_ar_generation_type as 'fixed' | 'dynamic') || 'dynamic',
          description_ar_formula: templateData.description_ar_formula || '',
          short_description_ar_generation_type: (templateData.short_description_ar_generation_type as 'fixed' | 'dynamic') || 'dynamic',
          short_description_ar_formula: templateData.short_description_ar_formula || '',
          image_url: templateData.image_url || '',
          is_global: templateData.is_global || false,
          properties,
          template_version: templateData.template_version || 1,
          last_modified_by: templateData.last_modified_by,
          created_by: templateData.created_by
        });

        setActiveTab(templateData.is_global ? 'global' : 'tenant');

        // Check for draft
        const { data: draftData } = await supabase
          .from('device_template_drafts')
          .select('*')
          .eq('tenant_id', currentTenant.id)
          .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
          .eq('template_id', id)
          .order('updated_at', { ascending: false })
          .limit(1)
          .single();

        if (draftData) {
          const draft = draftData.template_data as any;
          setTemplate(draft);
          setActiveTab(draft.activeTab || (draft.is_global ? 'global' : 'tenant'));
          setAutoSaveId(draftData.id);
        }
      } catch (error) {
        console.error('Error loading template:', error);
        toast.error("Failed to load template");
        navigate('/global-admin');
      } finally {
        setLoading(false);
      }
    };

    loadTemplate();
  }, [id, isEditMode, currentTenant, navigate]);

  // Auto-save functionality
  useEffect(() => {
    if (!currentTenant) return;

    const autoSave = async () => {
      try {
        const templateData = { ...template, activeTab } as any;
        
        if (autoSaveId) {
          await supabase
            .from('device_template_drafts')
            .update({ 
              template_data: templateData,
              updated_at: new Date().toISOString()
            })
            .eq('id', autoSaveId);
        } else {
          const { data, error } = await supabase
            .from('device_template_drafts')
            .insert({
              tenant_id: currentTenant.id,
              user_id: (await supabase.auth.getUser()).data.user?.id,
              template_id: isEditMode ? id : null,
              template_data: templateData
            })
            .select('id')
            .single();
          
          if (!error && data) {
            setAutoSaveId(data.id);
          }
        }
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    };

    const debounceTimer = setTimeout(autoSave, 2000);
    return () => clearTimeout(debounceTimer);
  }, [template, activeTab, currentTenant, autoSaveId]);

  // Tab change effect
  useEffect(() => {
    setTemplate(prev => ({
      ...prev,
      is_global: activeTab === 'global'
    }));
  }, [activeTab]);

  // Load draft on mount
  useEffect(() => {
    const loadDraft = async () => {
      if (!currentTenant) return;

      try {
        const { data } = await supabase
          .from('device_template_drafts')
          .select('*')
          .eq('tenant_id', currentTenant.id)
          .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
          .eq('template_id', isEditMode ? id : null)
          .order('updated_at', { ascending: false })
          .limit(1)
          .single();

        if (data) {
          const draftData = data.template_data as any;
          setTemplate(draftData);
          setActiveTab(draftData.activeTab || 'global');
          setAutoSaveId(data.id);
        }
      } catch (error) {
        // No draft found, start fresh
      }
    };

    loadDraft();
  }, [currentTenant]);

  const handleSave = async () => {
    if (!currentTenant || !template.name.trim()) {
      toast.error("Template name is required");
      return;
    }

    if (!template.device_type_id) {
      toast.error("Device type is required");
      return;
    }

    setIsSaving(true);
    try {
      let templateData;
      
      if (isEditMode) {
        // Update existing template
        const { error: templateError } = await supabase
          .from('device_templates')
          .update({
            name: template.name,
            label_ar: template.label_ar,
            device_type_id: template.device_type_id,
            category: template.device_type_id, // Keep both for compatibility
            brand_id: template.brand_id || null,
            description: template.description,
            supports_multilang: template.supports_multilang,
            sku_generation_type: template.sku_generation_type,
            sku_formula: template.sku_formula,
            description_generation_type: template.description_generation_type,
            description_formula: template.description_formula,
            short_description_generation_type: template.short_description_generation_type,
            short_description_formula: template.short_description_formula,
            description_ar_generation_type: template.description_ar_generation_type,
            description_ar_formula: template.description_ar_formula,
            short_description_ar_generation_type: template.short_description_ar_generation_type,
            short_description_ar_formula: template.short_description_ar_formula,
            image_url: template.image_url,
            is_global: template.is_global,
            last_modified_by: user?.id,
            properties_schema: template.properties as any
          })
          .eq('id', id);

        if (templateError) throw templateError;
        templateData = { id };
      } else {
        // Create new template
        const { data: newTemplateData, error: templateError } = await supabase
          .from('device_templates')
          .insert({
            tenant_id: template.is_global ? null : currentTenant.id,
            name: template.name,
            label_ar: template.label_ar,
            device_type_id: template.device_type_id,
            category: template.device_type_id, // Keep both for compatibility
            brand_id: template.brand_id || null,
            description: template.description,
            supports_multilang: template.supports_multilang,
            sku_generation_type: template.sku_generation_type,
            sku_formula: template.sku_formula,
            description_generation_type: template.description_generation_type,
            description_formula: template.description_formula,
            short_description_generation_type: template.short_description_generation_type,
            short_description_formula: template.short_description_formula,
            description_ar_generation_type: template.description_ar_generation_type,
            description_ar_formula: template.description_ar_formula,
            short_description_ar_generation_type: template.short_description_ar_generation_type,
            short_description_ar_formula: template.short_description_ar_formula,
            image_url: template.image_url,
            is_global: template.is_global,
            created_by: user?.id,
            template_version: 1,
            properties_schema: template.properties as any
          })
          .select('id')
          .single();

        if (templateError) throw templateError;
        templateData = newTemplateData;
      }

      // Handle properties
      if (isEditMode) {
        // Delete existing properties for update
        await supabase
          .from('device_template_properties')
          .delete()
          .eq('template_id', id);
      }

      // Save properties with cost impact for options
      if (template.properties.length > 0) {
        const propertiesData = template.properties.map((prop, index) => ({
          template_id: templateData.id,
          property_name: prop.name,
          label_en: prop.label_en,
          label_ar: prop.label_ar,
          property_type: prop.type,
          is_required: prop.required || false,
          is_identifier: prop.is_identifier || false,
          is_device_name: prop.is_device_name || false,
          property_unit: prop.unit,
          sort_order: prop.sort_order !== undefined ? prop.sort_order : index,
          property_options: prop.property_options as any,
          formula: prop.formula || null,
          depends_on_properties: prop.depends_on_properties || null
        }));

        const { error: propertiesError } = await supabase
          .from('device_template_properties')
          .insert(propertiesData);

        if (propertiesError) throw propertiesError;

        // Save option cost modifiers
        const optionsWithCostImpact = template.properties.flatMap((prop, propIndex) => 
          prop.property_options
            .filter(opt => opt.has_cost_impact && opt.cost_modifier && opt.cost_modifier !== 0)
            .map(opt => ({
              template_id: templateData.id,
              tenant_id: template.is_global ? null : currentTenant.id,
              code: opt.code,
              label_en: opt.label_en,
              label_ar: opt.label_ar,
              cost_modifier: opt.cost_modifier,
              cost_modifier_type: opt.cost_modifier_type,
              sort_order: 0,
              active: true
            }))
        );

        if (optionsWithCostImpact.length > 0) {
          const { error: optionsError } = await supabase
            .from('device_template_options')
            .insert(optionsWithCostImpact);

          if (optionsError) throw optionsError;
        }
      }

      // Clean up draft
      if (autoSaveId) {
        await supabase
          .from('device_template_drafts')
          .delete()
          .eq('id', autoSaveId);
      }

      toast.success(isEditMode ? "Template updated successfully" : "Template created successfully");
      navigate('/global-admin');
    } catch (error: any) {
      console.error('Error saving template:', error);
      
      // Provide detailed error messages
      let errorMessage = "Failed to save template";
      
      if (error?.message) {
        errorMessage = `Failed to save template: ${error.message}`;
      }
      
      if (error?.code) {
        switch (error.code) {
          case '23505':
            errorMessage = "A template with this name already exists. Please choose a different name.";
            break;
          case '23502':
            errorMessage = "Missing required fields. Please check all required fields are filled.";
            break;
          case '42P17':
            errorMessage = "Database policy error. Please try again or contact support.";
            break;
          case '23503':
            errorMessage = "Invalid reference to device type or brand. Please refresh the page and try again.";
            break;
          default:
            if (error.code && error.message) {
              errorMessage = `Database error (${error.code}): ${error.message}`;
            }
        }
      }
      
      if (error?.details) {
        console.error('Error details:', error.details);
        errorMessage += ` Details: ${error.details}`;
      }
      
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!currentTenant || !isEditMode) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete the template "${template.name}"? This will move it to the recycle bin where it can be restored later.`
    );

    if (!confirmed) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('device_templates')
        .update({ 
          deleted_at: new Date().toISOString(),
          deleted_by: user?.id
        })
        .eq('id', id);

      if (error) throw error;

      // Clean up draft if exists
      if (autoSaveId) {
        await supabase
          .from('device_template_drafts')
          .delete()
          .eq('id', autoSaveId);
      }

      toast.success("Template moved to recycle bin successfully");
      navigate('/global-admin');
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error("Failed to delete template");
    } finally {
      setIsDeleting(false);
    }
  };

  const addProperty = () => {
    setTemplate(prev => ({
      ...prev,
      properties: [...prev.properties, {
        id: crypto.randomUUID(),
        name: '',
        label_en: '',
        label_ar: '',
        type: 'text',
        data_type: 'text',
        required: false,
        is_identifier: false,
        is_device_name: false,
        unit: '',
        sort_order: prev.properties.length,
        property_options: [],
        options: [],
        formula: '',
        depends_on_properties: []
      }]
    }));
  };

  const updateProperty = (index: number, field: keyof DeviceTemplateProperty, value: any) => {
    setTemplate(prev => ({
      ...prev,
      properties: prev.properties.map((prop, i) => {
        if (i === index) {
          const updates: any = { [field]: value };
          // Sync data_type with type field
          if (field === 'type') {
            updates.data_type = value;
          }
          // Update options array when property_options change
          if (field === 'property_options') {
            updates.options = value.map((opt: any) => ({ code: opt.code, label_en: opt.label_en }));
          }
          return { ...prop, ...updates };
        }
        return prop;
      })
    }));
  };

  const removeProperty = (index: number) => {
    setTemplate(prev => ({
      ...prev,
      properties: prev.properties.filter((_, i) => i !== index)
    }));
  };

  const addPropertyOption = (propertyIndex: number) => {
    setTemplate(prev => ({
      ...prev,
      properties: prev.properties.map((prop, i) => 
        i === propertyIndex 
          ? { 
              ...prop, 
              property_options: [...prop.property_options, { 
                code: '', 
                label_en: '', 
                label_ar: '',
                has_cost_impact: false
              }]
            } 
          : prop
      )
    }));
  };

  const updatePropertyOption = (propertyIndex: number, optionIndex: number, field: string, value: string | number | boolean) => {
    setTemplate(prev => ({
      ...prev,
      properties: prev.properties.map((prop, i) => 
        i === propertyIndex 
          ? { 
              ...prop, 
              property_options: prop.property_options.map((opt, j) => 
                j === optionIndex ? { ...opt, [field]: value } : opt
              )
            } 
          : prop
      )
    }));
  };

  const removePropertyOption = (propertyIndex: number, optionIndex: number) => {
    setTemplate(prev => ({
      ...prev,
      properties: prev.properties.map((prop, i) => 
        i === propertyIndex 
          ? { 
              ...prop, 
              property_options: prop.property_options.filter((_, j) => j !== optionIndex)
            } 
          : prop
      )
    }));
  };

  const updatePropertyReferences = () => {
    // Get all non-calculated properties that can be referenced
    const availableProperties = template.properties
      .filter(prop => prop.type !== 'calculated' && prop.name.trim())
      .map(prop => prop.name);

    // Update depends_on_properties for calculated properties
    setTemplate(prev => ({
      ...prev,
      properties: prev.properties.map(prop => {
        if (prop.type === 'calculated' && prop.formula) {
          const references = FormulaEngine.extractPropertyReferences(prop.formula);
          const validReferences = references.filter(ref => availableProperties.includes(ref));
          return { ...prop, depends_on_properties: validReferences };
        }
        return prop;
      })
    }));
    
    toast.success("Property references updated");
  };

  const validateCalculatedProperty = (property: DeviceTemplateProperty): string | null => {
    if (property.type !== 'calculated') return null;
    
    if (!property.formula?.trim()) {
      return "Formula is required for calculated properties";
    }

    const availableProperties = template.properties
      .filter(prop => prop.type !== 'calculated' && prop.name.trim())
      .map(prop => prop.name);

    const validation = FormulaEngine.validateFormula(property.formula, availableProperties);
    return validation.isValid ? null : validation.error || "Invalid formula";
  };

  // Generate previews using individual preview functions
  const preview = {
    sku: generateSKU(template.properties),
    description: generateDescription(template.properties),
    shortDescription: generateShortDescription(template.properties),
    descriptionAr: generateDescriptionAr(template.properties),
    shortDescriptionAr: generateShortDescriptionAr(template.properties)
  };

  // Clear formula fields when switching from dynamic to fixed
  const handleGenerationTypeChange = (field: string, value: 'fixed' | 'dynamic') => {
    const updates: any = { [field]: value };
    
    // Clear formula when switching to fixed
    if (value === 'fixed') {
      const formulaField = field.replace('_generation_type', '_formula');
      updates[formulaField] = '';
    }
    
    setTemplate(prev => ({ ...prev, ...updates }));
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading template...
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/global-admin')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Global Admin
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {isEditMode ? 'Edit Device Template' : 'Create Device Template'}
            </h1>
            <p className="text-muted-foreground">
              {isEditMode 
                ? `Modify the template properties and configuration${template.template_version ? ` • Version ${template.template_version}` : ''}`
                : 'Build a comprehensive device template with properties and multi-language support'
              }
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => console.log(preview)}>
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          {isEditMode && (
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={isDeleting}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {isDeleting ? 'Deleting...' : 'Delete Template'}
            </Button>
          )}
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : (isEditMode ? 'Save Changes' : 'Save Template')}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="global">Global Template</TabsTrigger>
          <TabsTrigger value="tenant">Tenant Template</TabsTrigger>
        </TabsList>

        <TabsContent value="global" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Template Name (English)</Label>
                  <Input
                    value={template.name}
                    onChange={(e) => setTemplate(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="LED Panel Template"
                  />
                </div>
                <div>
                  <Label>Template Name (Arabic)</Label>
                  <Input
                    value={template.label_ar || ''}
                    onChange={(e) => setTemplate(prev => ({ ...prev, label_ar: e.target.value }))}
                    placeholder="قالب لوحة LED"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Device Type</Label>
                  <HierarchicalDeviceTypeSelect 
                    value={template.device_type_id} 
                    onValueChange={(value) => setTemplate(prev => ({ ...prev, device_type_id: value }))}
                    placeholder="Select device type"
                  />
                </div>
                <div>
                  <Label>Brand</Label>
                  <Select value={template.brand_id} onValueChange={(value) => setTemplate(prev => ({ ...prev, brand_id: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder={brandsLoading ? "Loading..." : "Select brand"} />
                    </SelectTrigger>
                    <SelectContent>
                      {brands.map(brand => (
                        <SelectItem key={brand.id} value={brand.id}>{brand.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Description (English)</Label>
                <Textarea
                  value={template.description || ''}
                  onChange={(e) => setTemplate(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Template description in English"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="supports_multilang"
                  checked={template.supports_multilang}
                  onCheckedChange={(checked) => setTemplate(prev => ({ ...prev, supports_multilang: checked === true }))}
                />
                <Label htmlFor="supports_multilang">Enable Multi-language Support</Label>
              </div>

              <div>
                <ImageUpload
                  value={template.image_url}
                  onChange={(url) => setTemplate(prev => ({ ...prev, image_url: url || '' }))}
                  bucket="device-templates"
                  folder="templates"
                  className="mt-2"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Generation Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="text-base font-medium">SKU Generation</Label>
                <RadioGroup
                  value={template.sku_generation_type}
                  onValueChange={(value: 'fixed' | 'dynamic') => handleGenerationTypeChange('sku_generation_type', value)}
                  className="mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="fixed" id="sku-fixed-global" />
                    <Label htmlFor="sku-fixed-global">Fixed SKU</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="dynamic" id="sku-dynamic-global" />
                    <Label htmlFor="sku-dynamic-global">Dynamic SKU (Formula-based)</Label>
                  </div>
                </RadioGroup>
                
                {template.sku_generation_type === 'dynamic' ? (
                  <div className="mt-3">
                    <FormulaBuilder
                      label="SKU Formula"
                      value={template.sku_formula || ''}
                      onChange={(value) => setTemplate(prev => ({ ...prev, sku_formula: value }))}
                      properties={getAllAvailableProperties()}
                      placeholder="{item_code}-{wattage}W-{color_temperature}K"
                      description="Generate unique SKU codes using property references"
                    />
                    <div className="mt-2">
                      <p className="text-sm text-muted-foreground">
                        Preview: <Badge variant="outline">{preview.sku || 'Enter formula above'}</Badge>
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3">
                    <p className="text-sm text-muted-foreground p-3 bg-muted/30 rounded border-dashed border">
                      Fixed SKU will be entered during device creation. Each device can have its own unique SKU value.
                    </p>
                  </div>
                )}
              </div>

              <div>
                <Label className="text-base font-medium">Long Description Generation</Label>
                <RadioGroup
                  value={template.description_generation_type}
                  onValueChange={(value: 'fixed' | 'dynamic') => handleGenerationTypeChange('description_generation_type', value)}
                  className="mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="fixed" id="desc-fixed-global" />
                    <Label htmlFor="desc-fixed-global">Fixed Description</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="dynamic" id="desc-dynamic-global" />
                    <Label htmlFor="desc-dynamic-global">Dynamic Description (Formula-based)</Label>
                  </div>
                </RadioGroup>
                
                {template.description_generation_type === 'dynamic' ? (
                  <div className="mt-3">
                    <FormulaBuilder
                      label="Description Formula"
                      value={template.description_formula || ''}
                      onChange={(value) => setTemplate(prev => ({ ...prev, description_formula: value }))}
                      properties={getAllAvailableProperties()}
                      placeholder="{item_code} - {wattage}W LED Panel - {color_temperature}K - Professional Grade"
                      description="Generate detailed descriptions for product pages and specifications"
                    />
                    <div className="mt-2">
                      <p className="text-sm text-muted-foreground">
                        Preview: <Badge variant="outline">{preview.description || 'Enter formula above'}</Badge>
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3">
                    <p className="text-sm text-muted-foreground p-3 bg-muted/30 rounded border-dashed border">
                      Fixed description will be entered during device creation. Each device can have its own custom description.
                    </p>
                  </div>
                )}
              </div>

              <div>
                <Label className="text-base font-medium">Short Description Generation</Label>
                <RadioGroup
                  value={template.short_description_generation_type}
                  onValueChange={(value: 'fixed' | 'dynamic') => handleGenerationTypeChange('short_description_generation_type', value)}
                  className="mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="fixed" id="short-desc-fixed-global" />
                    <Label htmlFor="short-desc-fixed-global">Fixed Short Description</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="dynamic" id="short-desc-dynamic-global" />
                    <Label htmlFor="short-desc-dynamic-global">Dynamic Short Description (Formula-based)</Label>
                  </div>
                </RadioGroup>
                
                {template.short_description_generation_type === 'dynamic' ? (
                  <div className="mt-3">
                    <FormulaBuilder
                      label="Short Description Formula"
                      value={template.short_description_formula || ''}
                      onChange={(value) => setTemplate(prev => ({ ...prev, short_description_formula: value }))}
                      properties={getAllAvailableProperties()}
                      placeholder="{item_code} - {wattage}W LED - {color_temperature}K"
                      description="Generate brief descriptions for listings and summaries"
                    />
                    <div className="mt-2">
                      <p className="text-sm text-muted-foreground">
                        Preview: <Badge variant="outline">{preview.shortDescription || 'Enter formula above'}</Badge>
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3">
                    <p className="text-sm text-muted-foreground p-3 bg-muted/30 rounded border-dashed border">
                      Fixed short description will be entered during device creation. Each device can have its own brief description.
                    </p>
                  </div>
                 )}
               </div>

               <div>
                 <Label className="text-base font-medium">Arabic Long Description Generation</Label>
                  <RadioGroup
                    value={template.description_ar_generation_type || 'dynamic'}
                    onValueChange={(value: 'fixed' | 'dynamic') => handleGenerationTypeChange('description_ar_generation_type', value)}
                    className="mt-2"
                  >
                   <div className="flex items-center space-x-2">
                     <RadioGroupItem value="fixed" id="desc-ar-fixed-global" />
                     <Label htmlFor="desc-ar-fixed-global">Fixed Arabic Description</Label>
                   </div>
                   <div className="flex items-center space-x-2">
                     <RadioGroupItem value="dynamic" id="desc-ar-dynamic-global" />
                     <Label htmlFor="desc-ar-dynamic-global">Dynamic Arabic Description (Formula-based)</Label>
                   </div>
                 </RadioGroup>
                 
                  {template.description_ar_generation_type === 'dynamic' ? (
                    <div className="mt-3">
                      <FormulaBuilder
                        label="Arabic Description Formula"
                        value={template.description_ar_formula || ''}
                        onChange={(value) => setTemplate(prev => ({ ...prev, description_ar_formula: value }))}
                        properties={getAllAvailableProperties()}
                        placeholder="{item_code} - لوحة LED بقوة {wattage}W - {color_temperature}K - جودة مهنية"
                        description="Generate detailed Arabic descriptions for product pages and specifications"
                      />
                      <div className="mt-2">
                        <p className="text-sm text-muted-foreground">
                          Preview: <Badge variant="outline">{preview.descriptionAr || 'Enter formula above'}</Badge>
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3">
                      <p className="text-sm text-muted-foreground p-3 bg-muted/30 rounded border-dashed border">
                        Fixed Arabic description will be entered during device creation. Each device can have its own custom Arabic description.
                      </p>
                    </div>
                  )}
               </div>

               <div>
                 <Label className="text-base font-medium">Arabic Short Description Generation</Label>
                  <RadioGroup
                    value={template.short_description_ar_generation_type || 'dynamic'}
                    onValueChange={(value: 'fixed' | 'dynamic') => handleGenerationTypeChange('short_description_ar_generation_type', value)}
                    className="mt-2"
                  >
                   <div className="flex items-center space-x-2">
                     <RadioGroupItem value="fixed" id="short-desc-ar-fixed-global" />
                     <Label htmlFor="short-desc-ar-fixed-global">Fixed Arabic Short Description</Label>
                   </div>
                   <div className="flex items-center space-x-2">
                     <RadioGroupItem value="dynamic" id="short-desc-ar-dynamic-global" />
                     <Label htmlFor="short-desc-ar-dynamic-global">Dynamic Arabic Short Description (Formula-based)</Label>
                   </div>
                 </RadioGroup>
                 
                  {template.short_description_ar_generation_type === 'dynamic' ? (
                    <div className="mt-3">
                      <FormulaBuilder
                        label="Arabic Short Description Formula"
                        value={template.short_description_ar_formula || ''}
                        onChange={(value) => setTemplate(prev => ({ ...prev, short_description_ar_formula: value }))}
                        properties={getAllAvailableProperties()}
                        placeholder="{item_code} - LED {wattage}W - {color_temperature}K"
                        description="Generate brief Arabic descriptions for listings and summaries"
                      />
                      <div className="mt-2">
                        <p className="text-sm text-muted-foreground">
                          Preview: <Badge variant="outline">{preview.shortDescriptionAr || 'Enter formula above'}</Badge>
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3">
                      <p className="text-sm text-muted-foreground p-3 bg-muted/30 rounded border-dashed border">
                        Fixed Arabic short description will be entered during device creation. Each device can have its own brief Arabic description.
                      </p>
                    </div>
                  )}
               </div>
             </CardContent>
           </Card>

          <Card>
            <CardHeader>
              <CardTitle>Fixed Properties</CardTitle>
              <p className="text-sm text-muted-foreground">These properties are automatically included in every device template.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <Label className="font-medium">Item Code</Label>
                  <p className="text-sm text-muted-foreground">Unique identifier for each device (always used for SKU/Description)</p>
                  <Badge variant="outline" className="mt-1">Text • Required • Identifier</Badge>
                </div>
                <div>
                  <Label className="font-medium">Cost Price</Label>
                  <p className="text-sm text-muted-foreground">Base cost of the device (currency set during device creation)</p>
                  <Badge variant="outline" className="mt-1">Number • Required</Badge>
                </div>
                <div>
                  <Label className="font-medium">Device Image</Label>
                  <p className="text-sm text-muted-foreground">Product image or photo (URL or file upload)</p>
                  <Badge variant="outline" className="mt-1">Image • Optional</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Custom Properties</CardTitle>
                <div className="flex gap-2">
                  <Button 
                    onClick={updatePropertyReferences} 
                    size="sm" 
                    variant="outline"
                    title="Refresh property references for calculated fields"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Update Properties
                  </Button>
                  <Button onClick={addProperty} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Property
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {template.properties.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No custom properties added yet. Click "Add Property" to start.</p>
              ) : (
                <div className="space-y-6">
                  {template.properties.map((property, index) => (
                    <Card key={property.id}>
                      <CardContent className="pt-6">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-2">
                            <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                            <h4 className="font-medium">Property {index + 1}</h4>
                            <Badge variant="secondary" className="text-xs">Order: {property.sort_order}</Badge>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeProperty(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-3 gap-4 mb-4">
                          <div>
                            <Label>Property Name</Label>
                            <Input
                              value={property.name}
                              onChange={(e) => updateProperty(index, 'name', e.target.value)}
                              placeholder="wattage"
                            />
                          </div>
                          <div>
                            <Label>Label (English)</Label>
                            <Input
                              value={property.label_en}
                              onChange={(e) => updateProperty(index, 'label_en', e.target.value)}
                              placeholder="Wattage"
                            />
                          </div>
                          <div>
                            <Label>Label (Arabic)</Label>
                            <Input
                              value={property.label_ar}
                              onChange={(e) => updateProperty(index, 'label_ar', e.target.value)}
                              placeholder="القوة الكهربائية"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-5 gap-4 mb-4">
                          <div>
                            <Label>Type</Label>
                            <Select
                              value={property.type}
                              onValueChange={(value) => updateProperty(index, 'type', value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {PROPERTY_TYPES.map(type => (
                                  <SelectItem key={type.value} value={type.value}>
                                    {type.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Unit (Optional)</Label>
                            <Input
                              value={property.unit || ''}
                              onChange={(e) => updateProperty(index, 'unit', e.target.value)}
                              placeholder="W, mm, etc."
                            />
                          </div>
                          <div>
                            <Label>Sort Order</Label>
                            <Input
                              type="number"
                              value={property.sort_order}
                              onChange={(e) => updateProperty(index, 'sort_order', parseInt(e.target.value) || 0)}
                              min="0"
                            />
                          </div>
                          <div className="flex items-center space-x-2 pt-6">
                            <Checkbox
                              id={`required-${index}`}
                              checked={property.required}
                              onCheckedChange={(checked) => updateProperty(index, 'required', checked === true)}
                            />
                            <Label htmlFor={`required-${index}`}>Required</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`device-name-${index}`}
                              checked={property.is_device_name}
                              onCheckedChange={(checked) => updateProperty(index, 'is_device_name', checked === true)}
                            />
                            <Label htmlFor={`device-name-${index}`}>Use as Device Name</Label>
                          </div>
                        </div>

                        {(property.type === 'select' || property.type === 'multiselect') && (
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <Label>Options</Label>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => addPropertyOption(index)}
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Add Option
                              </Button>
                            </div>
                            <div className="space-y-3">
                              {property.property_options.map((option, optionIndex) => (
                                <div key={optionIndex} className="border p-3 rounded-lg space-y-3">
                                  <div className="flex gap-2 items-center">
                                    <Input
                                      placeholder="Code"
                                      value={option.code}
                                      onChange={(e) => updatePropertyOption(index, optionIndex, 'code', e.target.value)}
                                      className="w-20"
                                    />
                                    <Input
                                      placeholder="English Label"
                                      value={option.label_en}
                                      onChange={(e) => updatePropertyOption(index, optionIndex, 'label_en', e.target.value)}
                                    />
                                    <Input
                                      placeholder="Arabic Label"
                                      value={option.label_ar}
                                      onChange={(e) => updatePropertyOption(index, optionIndex, 'label_ar', e.target.value)}
                                    />
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => removePropertyOption(index, optionIndex)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                   
                                   {option.has_cost_impact ? (
                                     <div className="border-t pt-3">
                                       <div className="flex items-center justify-between mb-2">
                                         <Label className="text-sm font-medium">Cost Impact</Label>
                                         <Button
                                           size="sm"
                                           variant="ghost"
                                           onClick={() => updatePropertyOption(index, optionIndex, 'has_cost_impact', false)}
                                           className="text-destructive hover:text-destructive"
                                         >
                                           Remove Cost Impact
                                         </Button>
                                       </div>
                                       <div className="grid grid-cols-2 gap-2">
                                         <div>
                                           <Label className="text-xs">Amount</Label>
                                           <Input
                                             type="number"
                                             placeholder="0"
                                             value={option.cost_modifier || 0}
                                             onChange={(e) => updatePropertyOption(index, optionIndex, 'cost_modifier', parseFloat(e.target.value) || 0)}
                                             className="text-sm"
                                           />
                                         </div>
                                         <div>
                                           <Label className="text-xs">Type</Label>
                                           <Select
                                             value={option.cost_modifier_type || 'fixed'}
                                             onValueChange={(value) => updatePropertyOption(index, optionIndex, 'cost_modifier_type', value)}
                                           >
                                             <SelectTrigger className="text-sm">
                                               <SelectValue />
                                             </SelectTrigger>
                                             <SelectContent>
                                               <SelectItem value="fixed">Fixed Amount</SelectItem>
                                               <SelectItem value="percentage">Percentage</SelectItem>
                                             </SelectContent>
                                           </Select>
                                         </div>
                                       </div>
                                       {option.cost_modifier && option.cost_modifier !== 0 && (
                                         <p className="text-xs text-muted-foreground mt-1">
                                           {option.cost_modifier_type === 'percentage' 
                                             ? `+${option.cost_modifier}% of base cost`
                                             : `+${option.cost_modifier} (inherits template currency)`
                                           }
                                         </p>
                                       )}
                                     </div>
                                   ) : (
                                     <div className="border-t pt-3">
                                       <Button
                                         size="sm"
                                         variant="outline"
                                         onClick={() => {
                                           updatePropertyOption(index, optionIndex, 'has_cost_impact', true);
                                           updatePropertyOption(index, optionIndex, 'cost_modifier', 0);
                                           updatePropertyOption(index, optionIndex, 'cost_modifier_type', 'fixed');
                                         }}
                                         className="w-full"
                                       >
                                         <Plus className="h-3 w-3 mr-1" />
                                         Add Cost Impact
                                       </Button>
                                     </div>
                                   )}
                                </div>
                              ))}
                            </div>
                          </div>
                         )}

                         {property.type === 'calculated' && (
                           <div className="space-y-4">
                             <div>
                               <Label>Formula</Label>
                               <Input
                                 value={property.formula || ''}
                                 onChange={(e) => updateProperty(index, 'formula', e.target.value)}
                                 placeholder="e.g., {watt} * {efficiency}"
                                 className="font-mono"
                               />
                               <p className="text-xs text-muted-foreground mt-1">
                                 Use {'{property_name}'} to reference other properties
                               </p>
                             </div>
                             
                             {property.depends_on_properties && property.depends_on_properties.length > 0 && (
                               <div>
                                 <Label className="text-sm">Depends on:</Label>
                                 <div className="flex flex-wrap gap-1 mt-1">
                                   {property.depends_on_properties.map(dep => (
                                     <Badge key={dep} variant="outline" className="text-xs">
                                       {dep}
                                     </Badge>
                                   ))}
                                 </div>
                               </div>
                             )}

                             {(() => {
                               const error = validateCalculatedProperty(property);
                               if (error) {
                                 return (
                                   <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                                     {error}
                                   </div>
                                 );
                               }

                               // Show preview if formula is valid
                               if (property.formula) {
                                 const availableProps = template.properties
                                   .filter(p => p.type !== 'calculated' && p.name.trim())
                                   .map(p => ({ name: p.name, value: p.type === 'number' ? 10 : 'sample' }));
                                 
                                 const result = FormulaEngine.evaluate(property.formula, availableProps);
                                 return (
                                   <div className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                                     Preview (with sample values): <Badge variant="outline">{result}{property.unit && ` ${property.unit}`}</Badge>
                                   </div>
                                 );
                               }
                               return null;
                             })()}
                           </div>
                         )}
                       </CardContent>
                     </Card>
                   ))}
                 </div>
               )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tenant" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Template Name (English)</Label>
                  <Input
                    value={template.name}
                    onChange={(e) => setTemplate(prev => ({ ...prev, name: e.target.value, is_global: false }))}
                    placeholder="LED Panel Template"
                  />
                </div>
                <div>
                  <Label>Template Name (Arabic)</Label>
                  <Input
                    value={template.label_ar || ''}
                    onChange={(e) => setTemplate(prev => ({ ...prev, label_ar: e.target.value }))}
                    placeholder="قالب لوحة LED"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Brand</Label>
                  <Select value={template.brand_id} onValueChange={(value) => setTemplate(prev => ({ ...prev, brand_id: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select brand" />
                    </SelectTrigger>
                    <SelectContent>
                      {brandsLoading ? (
                        <SelectItem value="" disabled>Loading brands...</SelectItem>
                      ) : (
                        brands.map(brand => (
                          <SelectItem key={brand.id} value={brand.id}>{brand.name}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Device Type</Label>
                  <HierarchicalDeviceTypeSelect 
                    value={template.device_type_id} 
                    onValueChange={(value) => setTemplate(prev => ({ ...prev, device_type_id: value }))}
                    placeholder="Select device type"
                  />
                </div>
              </div>

              <div>
                <Label>Description (English)</Label>
                <Textarea
                  value={template.description || ''}
                  onChange={(e) => setTemplate(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Template description in English"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="supports_multilang_tenant"
                  checked={template.supports_multilang}
                  onCheckedChange={(checked) => setTemplate(prev => ({ ...prev, supports_multilang: checked === true }))}
                />
                <Label htmlFor="supports_multilang_tenant">Enable Multi-language Support</Label>
              </div>

              <div>
                <ImageUpload
                  value={template.image_url}
                  onChange={(url) => setTemplate(prev => ({ ...prev, image_url: url || '' }))}
                  bucket="device-templates"
                  folder="templates"
                  className="mt-2"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Generation Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="text-base font-medium">SKU Generation</Label>
                <RadioGroup
                  value={template.sku_generation_type}
                  onValueChange={(value: 'fixed' | 'dynamic') => {
                    setTemplate(prev => ({ 
                      ...prev, 
                      sku_generation_type: value,
                      // Clear formula when switching to fixed
                      sku_formula: value === 'fixed' ? '' : prev.sku_formula
                    }));
                  }}
                  className="mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="fixed" id="sku-fixed-tenant" />
                    <Label htmlFor="sku-fixed-tenant">Fixed SKU</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="dynamic" id="sku-dynamic-tenant" />
                    <Label htmlFor="sku-dynamic-tenant">Dynamic SKU (Formula-based)</Label>
                  </div>
                </RadioGroup>
                
                {template.sku_generation_type === 'dynamic' && (
                  <div className="mt-3">
                    <Label>SKU Formula</Label>
                    <Input
                      value={template.sku_formula || ''}
                      onChange={(e) => setTemplate(prev => ({ ...prev, sku_formula: e.target.value }))}
                      placeholder="LED-{wattage}W-{color_temperature}K"
                      className="mt-1"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Preview: <Badge variant="outline">{preview.sku || 'Enter formula above'}</Badge>
                    </p>
                  </div>
                )}
              </div>

              <div>
                <Label className="text-base font-medium">Description Generation</Label>
                <RadioGroup
                  value={template.description_generation_type}
                  onValueChange={(value: 'fixed' | 'dynamic') => {
                    setTemplate(prev => ({ 
                      ...prev, 
                      description_generation_type: value,
                      // Clear formula when switching to fixed
                      description_formula: value === 'fixed' ? '' : prev.description_formula
                    }));
                  }}
                  className="mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="fixed" id="desc-fixed-tenant" />
                    <Label htmlFor="desc-fixed-tenant">Fixed Description</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="dynamic" id="desc-dynamic-tenant" />
                    <Label htmlFor="desc-dynamic-tenant">Dynamic Description (Formula-based)</Label>
                  </div>
                </RadioGroup>
                
                {template.description_generation_type === 'dynamic' ? (
                  <div className="mt-3">
                    <FormulaBuilder
                      label="Description Formula"
                      value={template.description_formula || ''}
                      onChange={(value) => setTemplate(prev => ({ ...prev, description_formula: value }))}
                      properties={getAllAvailableProperties()}
                      placeholder="{item_code} - {wattage}W LED Panel - {color_temperature}K - Professional Grade"
                      description="Generate detailed descriptions using property references"
                    />
                    <div className="mt-2">
                      <p className="text-sm text-muted-foreground">
                        Preview: <Badge variant="outline">{preview.description || 'Enter formula above'}</Badge>
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3">
                    <Label>Fixed Description</Label>
                    <Textarea
                      value={template.description_formula || ''}
                      onChange={(e) => setTemplate(prev => ({ ...prev, description_formula: e.target.value }))}
                      placeholder="High-quality LED Panel Light with professional-grade specifications"
                      className="mt-1"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Enter a fixed description that will be used for all devices
                    </p>
                  </div>
                )}
              </div>

              <div>
                <Label className="text-base font-medium">Short Description Generation</Label>
                <RadioGroup
                  value={template.short_description_generation_type}
                  onValueChange={(value: 'fixed' | 'dynamic') => {
                    setTemplate(prev => ({ 
                      ...prev, 
                      short_description_generation_type: value,
                      // Clear formula when switching to fixed
                      short_description_formula: value === 'fixed' ? '' : prev.short_description_formula
                    }));
                  }}
                  className="mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="fixed" id="short-desc-fixed-tenant" />
                    <Label htmlFor="short-desc-fixed-tenant">Fixed Short Description</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="dynamic" id="short-desc-dynamic-tenant" />
                    <Label htmlFor="short-desc-dynamic-tenant">Dynamic Short Description (Formula-based)</Label>
                  </div>
                </RadioGroup>
                
                {template.short_description_generation_type === 'dynamic' ? (
                  <div className="mt-3">
                    <FormulaBuilder
                      label="Short Description Formula"
                      value={template.short_description_formula || ''}
                      onChange={(value) => setTemplate(prev => ({ ...prev, short_description_formula: value }))}
                      properties={getAllAvailableProperties()}
                      placeholder="{item_code} - {wattage}W LED - {color_temperature}K"
                      description="Generate brief descriptions for listings and summaries"
                    />
                    <div className="mt-2">
                      <p className="text-sm text-muted-foreground">
                        Preview: <Badge variant="outline">{preview.shortDescription || 'Enter formula above'}</Badge>
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3">
                    <Label>Fixed Short Description</Label>
                    <Input
                      value={template.short_description_formula || ''}
                      onChange={(e) => setTemplate(prev => ({ ...prev, short_description_formula: e.target.value }))}
                      placeholder="LED Panel Light"
                      className="mt-1"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Enter a fixed short description that will be used for all devices
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Fixed Properties</CardTitle>
              <p className="text-sm text-muted-foreground">These properties are automatically included in every device template.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <Label className="font-medium">Item Code</Label>
                  <p className="text-sm text-muted-foreground">Unique identifier for each device (always used for SKU/Description)</p>
                  <Badge variant="outline" className="mt-1">Text • Required • Identifier</Badge>
                </div>
                <div>
                  <Label className="font-medium">Cost Price</Label>
                  <p className="text-sm text-muted-foreground">Base cost of the device (currency set during device creation)</p>
                  <Badge variant="outline" className="mt-1">Number • Required</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Custom Properties</CardTitle>
                <Button onClick={addProperty} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Property
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {template.properties.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No custom properties added yet. Click "Add Property" to start.</p>
              ) : (
                <div className="space-y-6">
                  {template.properties.map((property, index) => (
                    <Card key={property.id}>
                      <CardContent className="pt-6">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-2">
                            <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                            <h4 className="font-medium">Property {index + 1}</h4>
                            <Badge variant="secondary" className="text-xs">Order: {property.sort_order}</Badge>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeProperty(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-3 gap-4 mb-4">
                          <div>
                            <Label>Property Name</Label>
                            <Input
                              value={property.name}
                              onChange={(e) => updateProperty(index, 'name', e.target.value)}
                              placeholder="wattage"
                            />
                          </div>
                          <div>
                            <Label>Label (English)</Label>
                            <Input
                              value={property.label_en}
                              onChange={(e) => updateProperty(index, 'label_en', e.target.value)}
                              placeholder="Wattage"
                            />
                          </div>
                          <div>
                            <Label>Label (Arabic)</Label>
                            <Input
                              value={property.label_ar}
                              onChange={(e) => updateProperty(index, 'label_ar', e.target.value)}
                              placeholder="القوة الكهربائية"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-5 gap-4 mb-4">
                          <div>
                            <Label>Type</Label>
                            <Select
                              value={property.type}
                              onValueChange={(value) => updateProperty(index, 'type', value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {PROPERTY_TYPES.map(type => (
                                  <SelectItem key={type.value} value={type.value}>
                                    {type.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Unit (Optional)</Label>
                            <Input
                              value={property.unit || ''}
                              onChange={(e) => updateProperty(index, 'unit', e.target.value)}
                              placeholder="W, mm, etc."
                            />
                          </div>
                          <div>
                            <Label>Sort Order</Label>
                            <Input
                              type="number"
                              value={property.sort_order}
                              onChange={(e) => updateProperty(index, 'sort_order', parseInt(e.target.value) || 0)}
                              min="0"
                            />
                          </div>
                          <div className="flex items-center space-x-2 pt-6">
                            <Checkbox
                              id={`required-tenant-${index}`}
                              checked={property.required}
                              onCheckedChange={(checked) => updateProperty(index, 'required', checked === true)}
                            />
                            <Label htmlFor={`required-tenant-${index}`}>Required</Label>
                          </div>
                          <div className="flex items-center space-x-2 pt-6">
                            <Checkbox
                              id={`identifier-tenant-${index}`}
                              checked={property.is_identifier}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  // Uncheck all other identifier checkboxes
                                  const updatedProperties = template.properties.map((prop, i) => ({
                                    ...prop,
                                    is_identifier: i === index
                                  }));
                                  setTemplate(prev => ({ ...prev, properties: updatedProperties }));
                                } else {
                                  updateProperty(index, 'is_identifier', false);
                                }
                              }}
                            />
                            <Label htmlFor={`identifier-tenant-${index}`}>Use as Unique Identifier (for imports)</Label>
                          </div>
                        </div>

                        {(property.type === 'select' || property.type === 'multiselect') && (
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <Label>Options</Label>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => addPropertyOption(index)}
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Add Option
                              </Button>
                            </div>
                            <div className="space-y-2">
                              {property.property_options.map((option, optionIndex) => (
                                <div key={optionIndex} className="flex gap-2 items-center">
                                  <Input
                                    placeholder="Code"
                                    value={option.code}
                                    onChange={(e) => updatePropertyOption(index, optionIndex, 'code', e.target.value)}
                                    className="w-20"
                                  />
                                  <Input
                                    placeholder="English Label"
                                    value={option.label_en}
                                    onChange={(e) => updatePropertyOption(index, optionIndex, 'label_en', e.target.value)}
                                  />
                                  <Input
                                    placeholder="Arabic Label"
                                    value={option.label_ar}
                                    onChange={(e) => updatePropertyOption(index, optionIndex, 'label_ar', e.target.value)}
                                  />
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => removePropertyOption(index, optionIndex)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}