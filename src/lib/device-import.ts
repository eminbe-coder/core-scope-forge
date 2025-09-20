import * as XLSX from 'xlsx';

export interface DeviceImportRow {
  name?: string;
  category?: string;
  brand?: string;
  model?: string;
  unit_price?: number;
  currency_code?: string;
  image_url?: string;
  specifications?: string;
  dynamic_sku?: boolean;
  sku?: string;
  dynamic_description?: boolean;
  description?: string; 
  dynamic_short_description?: boolean;
  short_description?: string;
  [key: string]: any; // For template properties
}

export interface DeviceImportResult {
  success: boolean;
  data?: DeviceImportRow[];
  errors?: string[];
  totalRows?: number;
  validRows?: number;
}

export interface DeviceImportValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export const parseDeviceExcel = async (file: File, templateProperties?: Array<{ property_name: string; property_type: string }>): Promise<DeviceImportResult> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

    if (jsonData.length < 2) {
      return {
        success: false,
        errors: ['Excel file must have at least a header row and one data row']
      };
    }

    const headers = jsonData[0] as string[];
    const dataRows = jsonData.slice(1);

    // Create a mapping of possible column names to our interface
    const columnMapping: { [key: string]: string } = {
      'Name': 'name',
      'Device Name': 'name',
      'Product Name': 'name',
      'Category': 'category',
      'Type': 'category',
      'Device Type': 'category',
      'Brand': 'brand',
      'Manufacturer': 'brand',
      'Model': 'model',
      'Model Number': 'model',
      'Unit Price': 'unit_price',
      'Price': 'unit_price',
      'Cost': 'unit_price',
      'Currency': 'currency_code',
      'Image URL': 'image_url',
      'Image': 'image_url',
      'Specifications': 'specifications',
      'Specs': 'specifications',
      'Dynamic SKU': 'dynamic_sku',
      'SKU': 'sku',
      'Dynamic Description': 'dynamic_description',
      'Description': 'description',
      'Dynamic Short Description': 'dynamic_short_description',
      'Short Description': 'short_description',
    };

    // Create a map of template properties for quick lookup
    const templatePropsMap = new Map<string, { property_name: string; property_type: string }>();
    templateProperties?.forEach(prop => {
      templatePropsMap.set(prop.property_name.toLowerCase().trim(), prop);
    });

    const devices: DeviceImportRow[] = dataRows.map((row, index) => {
      const device: DeviceImportRow = {};

      // Map all columns
      headers.forEach((header, colIndex) => {
        const cellValue = row[colIndex];
        if (cellValue === undefined || cellValue === null || cellValue === '') return;

        const propertyName = columnMapping[header];
        
        if (propertyName) {
          // Handle mapped standard columns
          if (propertyName === 'unit_price') {
            device.unit_price = typeof cellValue === 'number' ? cellValue : parseFloat(String(cellValue)) || undefined;
          } else if (propertyName === 'currency_code') {
            device.currency_code = cellValue;
          } else if (propertyName === 'specifications') {
            try {
              device.specifications = typeof cellValue === 'string' ? cellValue : JSON.stringify(cellValue);
            } catch (e) {
              device.specifications = String(cellValue || '');
            }
          } else if (propertyName === 'dynamic_sku' || propertyName === 'dynamic_description' || propertyName === 'dynamic_short_description') {
            // Convert to boolean
            device[propertyName] = cellValue === 'TRUE' || cellValue === 'true' || cellValue === '1' || cellValue === 1 || cellValue === true;
          } else {
            device[propertyName] = String(cellValue).trim();
          }
        } else {
          // Handle custom template properties
          const templateProp = templatePropsMap.get(header.toLowerCase().trim());
          const rawValue = String(cellValue).trim();
          
          // Handle dynamic_multiselect properties - parse comma-separated values
          if (templateProp?.property_type === 'dynamic_multiselect') {
            // Split by comma and clean up values
            const values = rawValue.split(',').map(v => v.trim()).filter(v => v.length > 0);
            device[header] = values;
          } else {
            // Store as string for other property types
            device[header] = rawValue;
          }
        }
      });

      return device;
    });

    return {
      success: true,
      data: devices
    };
  } catch (error) {
    console.error('Error parsing Excel file:', error);
    return {
      success: false,
      errors: [error instanceof Error ? error.message : 'Unknown error occurred while parsing Excel file']
    };
  }
};

export function validateDeviceImportData(
  devices: DeviceImportRow[],
  identifierProperty?: string
): DeviceImportValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  devices.forEach((device, index) => {
    const rowNum = index + 2; // Excel row number (1-based + header)
    
    // Required field validation
    if (!device.name?.trim()) {
      errors.push(`Row ${rowNum}: Device name is required`);
    }
    
    if (!device.category?.trim()) {
      errors.push(`Row ${rowNum}: Category is required`);
    }
    
    // Identifier validation
    if (identifierProperty && !device[identifierProperty]) {
      errors.push(`Row ${rowNum}: Identifier property '${identifierProperty}' is required`);
    }
    
    // Price validation
    if (device.unit_price !== undefined && (isNaN(device.unit_price) || device.unit_price < 0)) {
      errors.push(`Row ${rowNum}: Unit price must be a valid positive number`);
    }
    
    // Specifications validation
    if (device.specifications && typeof device.specifications === 'string') {
      try {
        JSON.parse(device.specifications);
      } catch {
        warnings.push(`Row ${rowNum}: Specifications is not valid JSON, will be stored as text`);
      }
    }

    // Dynamic generation validation
    if (device.dynamic_sku === true && !device.sku?.trim()) {
      warnings.push(`Row ${rowNum}: Dynamic SKU is enabled but SKU formula is empty`);
    }
    
    if (device.dynamic_description === true && !device.description?.trim()) {
      warnings.push(`Row ${rowNum}: Dynamic Description is enabled but Description formula is empty`);
    }
    
    if (device.dynamic_short_description === true && !device.short_description?.trim()) {
      warnings.push(`Row ${rowNum}: Dynamic Short Description is enabled but Short Description formula is empty`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

export function generateDeviceImportTemplate(
  templateProperties: Array<{
    name: string;
    label_en: string;
    type: string;
    required: boolean;
    is_identifier?: boolean;
  }>,
  includeGenerationColumns = true
): Uint8Array {
  const baseHeaders = [
    'Name',
    'Category', 
    'Brand',
    'Model',
    'Unit Price',
    'Currency',
    'Image URL',
    'Specifications',
  ];

  const generationHeaders = includeGenerationColumns ? [
    'Dynamic SKU',
    'SKU',
    'Dynamic Description', 
    'Description',
    'Dynamic Short Description',
    'Short Description'
  ] : [];

  const templateHeaders = templateProperties.map(prop => prop.label_en || prop.name);
  
  const headers = [...baseHeaders, ...generationHeaders, ...templateHeaders];
  
  const baseSampleData = [
    'LED Panel Light',
    'LED Lighting',
    'Philips',
    'LP-001',
    '25.50',
    'USD',
    'https://example.com/image.jpg',
    '{"power": "20W", "voltage": "24V"}',
  ];

  const generationSampleData = includeGenerationColumns ? [
    'TRUE',
    'LED-{wattage}W-{color}',
    'TRUE',
    '{wattage}W LED Panel - {color} Color Temperature',
    'FALSE',
    'Compact LED Panel'
  ] : [];

  const templateSampleData = templateProperties.map(prop => {
    if (prop.type === 'number') return '10';
    if (prop.type === 'select') return 'Option1';
    if (prop.type === 'dynamic_multiselect') return 'Value1, Value2';
    return 'Sample Value';
  });
  
  const sampleData = [...baseSampleData, ...generationSampleData, ...templateSampleData];
  
  const worksheet = XLSX.utils.aoa_to_sheet([headers, sampleData]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Devices');
  
  return XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
}