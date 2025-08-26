import { ValidatedSiteData, validateSitesData, SiteValidationError } from './site-validation';
import { supabase } from '@/integrations/supabase/client';

export interface SiteImportResult {
  success: boolean;
  imported: number;
  errors: Array<{
    row: number;
    siteName: string;
    errors: SiteValidationError[];
  }>;
  duplicates: Array<{
    row: number;
    siteName: string;
    action: 'skipped' | 'updated';
  }>;
}

export interface ImportedSiteData extends ValidatedSiteData {
  customer_name?: string; // For lookup during import
}

/**
 * Parse CSV content into site objects
 */
export const parseSiteCSV = (csvContent: string): ImportedSiteData[] => {
  const lines = csvContent.split('\n').filter(line => line.trim());
  if (lines.length <= 1) return [];

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const sites: ImportedSiteData[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const site: ImportedSiteData = {} as ImportedSiteData;

    headers.forEach((header, index) => {
      const value = values[index] || '';
      
      switch (header) {
        case 'site name':
        case 'name':
          site.name = value;
          break;
        case 'address':
        case 'site address':
          site.address = value;
          break;
        case 'city':
          site.city = value || undefined;
          break;
        case 'state':
        case 'province':
          site.state = value || undefined;
          break;
        case 'country':
          site.country = value || undefined;
          break;
        case 'postal code':
        case 'zip code':
        case 'zip':
          site.postal_code = value || undefined;
          break;
        case 'customer name':
        case 'customer':
          site.customer_name = value || undefined;
          break;
        case 'latitude':
        case 'lat':
          site.latitude = value ? parseFloat(value) : undefined;
          break;
        case 'longitude':
        case 'lng':
        case 'lon':
          site.longitude = value ? parseFloat(value) : undefined;
          break;
        case 'notes':
          site.notes = value || undefined;
          break;
      }
    });

    if (site.name && site.address) {
      sites.push(site);
    }
  }

  return sites;
};

/**
 * Find customer ID by name
 */
export const findCustomerByName = async (customerName: string, tenantId: string): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('active', true)
      .ilike('name', customerName)
      .single();

    if (error || !data) return null;
    return data.id;
  } catch (error) {
    console.error('Error finding customer by name:', error);
    return null;
  }
};

/**
 * Import sites from parsed data
 */
export const importSites = async (
  sitesData: ImportedSiteData[],
  tenantId: string,
  userId: string,
  options: {
    skipDuplicates?: boolean;
    updateDuplicates?: boolean;
  } = {}
): Promise<SiteImportResult> => {
  const result: SiteImportResult = {
    success: true,
    imported: 0,
    errors: [],
    duplicates: []
  };

  // Resolve customer names to IDs
  const processedSites: ValidatedSiteData[] = [];
  
  for (let i = 0; i < sitesData.length; i++) {
    const site = sitesData[i];
    const processedSite: ValidatedSiteData = { ...site };

    // Try to find customer by name if provided
    if (site.customer_name && !site.customer_id) {
      const customerId = await findCustomerByName(site.customer_name, tenantId);
      if (customerId) {
        processedSite.customer_id = customerId;
      }
    }

    processedSites.push(processedSite);
  }

  // Validate all sites
  const validation = await validateSitesData(processedSites, tenantId);

  // Add validation errors to result
  validation.errors.forEach(error => {
    result.errors.push({
      row: error.index + 2, // +2 because Excel/CSV rows start at 1 and we skip header
      siteName: sitesData[error.index]?.name || `Row ${error.index + 2}`,
      errors: error.errors
    });
  });

  // Import valid sites
  for (const site of validation.valid) {
    try {
      const { data, error } = await supabase
        .from('sites')
        .insert({
          ...site,
          tenant_id: tenantId,
          active: true,
          country: site.country || 'Saudi Arabia', // Default country if not provided
          is_lead: false, // Default value for new column
          contact_id: null, // Default value for new column
          company_id: null, // Default value for new column
          images: null, // Default value for new column
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') { // Duplicate key error
          const index = validation.valid.indexOf(site);
          result.duplicates.push({
            row: index + 2,
            siteName: site.name,
            action: 'skipped'
          });
        } else {
          result.errors.push({
            row: validation.valid.indexOf(site) + 2,
            siteName: site.name,
            errors: [{ field: 'general', message: error.message }]
          });
        }
      } else {
        result.imported++;
      }
    } catch (error) {
      result.errors.push({
        row: validation.valid.indexOf(site) + 2,
        siteName: site.name,
        errors: [{ field: 'general', message: 'Failed to save site to database' }]
      });
    }
  }

  result.success = result.errors.length === 0;
  return result;
};

/**
 * Generate sample CSV template for site import
 */
export const generateSiteImportTemplate = (): string => {
  const headers = [
    'Site Name',
    'Address',
    'City',
    'State',
    'Country',
    'Postal Code',
    'Customer Name',
    'Latitude',
    'Longitude',
    'Notes'
  ];

  const sampleRows = [
    [
      'Headquarters Office',
      '123 Business St',
      'New York',
      'NY',
      'USA',
      '10001',
      'Acme Corporation',
      '40.7128',
      '-74.0060',
      'Main office location'
    ],
    [
      'West Coast Branch',
      '456 Innovation Ave',
      'San Francisco',
      'CA',
      'USA',
      '94105',
      'Tech Solutions Inc',
      '37.7749',
      '-122.4194',
      'Branch office'
    ]
  ];

  const csv = [
    headers.join(','),
    ...sampleRows.map(row => row.join(','))
  ].join('\n');

  return csv;
};

/**
 * Download CSV template
 */
export const downloadSiteTemplate = () => {
  const csv = generateSiteImportTemplate();
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = 'site_import_template.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
};