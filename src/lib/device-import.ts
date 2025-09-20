import * as XLSX from 'xlsx';

export interface DeviceImportRow {
  name?: string;
  category?: string;
  brand?: string;
  model?: string;
  unit_price?: number;
  currency_code?: string;
  specifications?: any;
  image_url?: string;
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
    const columnMapping: { [key: string]: keyof DeviceImportRow } = {
      'name': 'name',
      'device name': 'name',
      'product name': 'name',
      'category': 'category',
      'type': 'category',
      'device type': 'category',
      'brand': 'brand',
      'manufacturer': 'brand',
      'model': 'model',
      'model number': 'model',
      'price': 'price',
      'unit price': 'price',
      'cost': 'price',
      'currency': 'currency',
      'image url': 'image_url',
      'image': 'image_url',
      'specifications': 'specifications',
      'specs': 'specifications',
    };

    // Create a map of template properties for quick lookup
    const templatePropsMap = new Map<string, { property_name: string; property_type: string }>();
    templateProperties?.forEach(prop => {
      templatePropsMap.set(prop.property_name.toLowerCase().trim(), prop);
    });

    const devices: DeviceImportRow[] = dataRows.map((row, index) => {
      const device: DeviceImportRow = {
        name: '',
        category: '',
        brand: '',
        model: '',
        price: null,
        currency: '',
        image_url: '',
        specifications: '',
      };

      // Map standard columns
      headers.forEach((header, colIndex) => {
        const normalizedHeader = header.toLowerCase().trim();
        const mappedField = columnMapping[normalizedHeader];
        
        if (mappedField && row[colIndex] !== undefined && row[colIndex] !== null) {
          if (mappedField === 'price') {
            const value = row[colIndex];
            device[mappedField] = typeof value === 'number' ? value : parseFloat(String(value)) || null;
          } else {
            device[mappedField] = String(row[colIndex]).trim();
          }
        }
      });

      // Handle custom template properties (columns not in standard mapping)
      headers.forEach((header, colIndex) => {
        const normalizedHeader = header.toLowerCase().trim();
        if (!columnMapping[normalizedHeader] && row[colIndex] !== undefined && row[colIndex] !== null) {
          const templateProp = templatePropsMap.get(normalizedHeader);
          const rawValue = String(row[colIndex]).trim();
          
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
  }>
): Uint8Array {
  const headers = [
    'Name',
    'Category', 
    'Brand',
    'Model',
    'Unit Price',
    'Currency',
    'Image URL',
    'Specifications',
    ...templateProperties.map(prop => prop.label_en || prop.name)
  ];
  
  const sampleData = [
    'LED Panel Light',
    'LED Lighting',
    'Philips',
    'LP-001',
    '25.50',
    'USD',
    'https://example.com/image.jpg',
    '{"power": "20W", "voltage": "24V"}',
    ...templateProperties.map(prop => {
      if (prop.type === 'number') return '10';
      if (prop.type === 'select') return 'Option1';
      return 'Sample Value';
    })
  ];
  
  const worksheet = XLSX.utils.aoa_to_sheet([headers, sampleData]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Devices');
  
  return XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
}