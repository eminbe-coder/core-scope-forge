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

export function parseDeviceExcel(file: File): Promise<DeviceImportResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        
        if (jsonData.length < 2) {
          resolve({
            success: false,
            errors: ['File must contain at least a header row and one data row']
          });
          return;
        }
        
        const headers = jsonData[0] as string[];
        const rows = jsonData.slice(1);
        
        const devices: DeviceImportRow[] = rows
          .filter(row => row.some(cell => cell !== null && cell !== undefined && cell !== ''))
          .map((row, index) => {
            const device: DeviceImportRow = {};
            
            headers.forEach((header, colIndex) => {
              const value = row[colIndex];
              if (value !== null && value !== undefined && value !== '') {
                const headerLower = header.toLowerCase().trim();
                
                // Map standard columns
                if (headerLower === 'name' || headerLower === 'device name') {
                  device.name = String(value);
                } else if (headerLower === 'category' || headerLower === 'device category') {
                  device.category = String(value);
                } else if (headerLower === 'brand') {
                  device.brand = String(value);
                } else if (headerLower === 'model') {
                  device.model = String(value);
                } else if (headerLower === 'unit_price' || headerLower === 'unit price' || headerLower === 'price') {
                  device.unit_price = typeof value === 'number' ? value : parseFloat(String(value));
                } else if (headerLower === 'currency' || headerLower === 'currency_code') {
                  device.currency_code = String(value);
                } else if (headerLower === 'image_url' || headerLower === 'image url' || headerLower === 'image') {
                  device.image_url = String(value);
                } else if (headerLower === 'specifications') {
                  try {
                    device.specifications = typeof value === 'string' ? JSON.parse(value) : value;
                  } catch {
                    device.specifications = String(value);
                  }
                } else {
                  // Store as template property
                  device[header] = value;
                }
              }
            });
            
            return device;
          });
        
        resolve({
          success: true,
          data: devices,
          totalRows: rows.length,
          validRows: devices.length
        });
        
      } catch (error) {
        resolve({
          success: false,
          errors: [`Error parsing Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`]
        });
      }
    };
    
    reader.onerror = () => {
      resolve({
        success: false,
        errors: ['Error reading file']
      });
    };
    
    reader.readAsArrayBuffer(file);
  });
}

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