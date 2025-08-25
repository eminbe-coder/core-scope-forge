import { validateCompany, normalizeCompanyData, CompanyFormData, CompanyValidationData } from './company-validation';
import { supabase } from '@/integrations/supabase/client';

export interface ImportCompany {
  name: string;
  industry?: string;
  companyType?: string;
  website?: string;
  email?: string;
  phone?: string;
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  notes?: string;
}

export interface CompanyImportResult {
  success: boolean;
  processedRows: number;
  skippedRows: number;
  errors: Array<{
    row: number;
    message: string;
    data: ImportCompany;
  }>;
  createdCompanies: number;
  duplicates: Array<{
    row: number;
    existingCompany: { id: string; name: string };
    importData: ImportCompany;
  }>;
}

export interface CompanyValidationError {
  row: number;
  field: string;
  message: string;
  data: ImportCompany;
}

/**
 * Parse CSV content and convert to company objects
 */
export function parseCSVToCompanies(csvContent: string): {
  companies: Array<ImportCompany & { row: number }>;
  errors: CompanyValidationError[];
} {
  const lines = csvContent.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('CSV file must contain at least a header row and one data row');
  }

  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const companies: Array<ImportCompany & { row: number }> = [];
  const errors: CompanyValidationError[] = [];

  // Map expected headers (case insensitive)
  const headerMap = {
    name: findHeaderIndex(headers, ['company name', 'name', 'company']),
    industry: findHeaderIndex(headers, ['industry', 'sector', 'business type']),
    companyType: findHeaderIndex(headers, ['company type', 'type', 'relationship']),
    website: findHeaderIndex(headers, ['website', 'url', 'web site']),
    email: findHeaderIndex(headers, ['email', 'email address', 'contact email']),
    phone: findHeaderIndex(headers, ['phone', 'telephone', 'phone number']),
    street: findHeaderIndex(headers, ['street', 'address', 'street address']),
    city: findHeaderIndex(headers, ['city', 'town']),
    state: findHeaderIndex(headers, ['state', 'province', 'region']),
    country: findHeaderIndex(headers, ['country', 'nation']),
    postalCode: findHeaderIndex(headers, ['postal code', 'zip code', 'zip', 'postcode']),
    notes: findHeaderIndex(headers, ['notes', 'comments', 'remarks'])
  };

  for (let i = 1; i < lines.length; i++) {
    const rowNumber = i + 1;
    const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
    
    const company: ImportCompany & { row: number } = {
      name: getValueByIndex(values, headerMap.name),
      industry: getValueByIndex(values, headerMap.industry),
      companyType: getValueByIndex(values, headerMap.companyType),
      website: getValueByIndex(values, headerMap.website),
      email: getValueByIndex(values, headerMap.email),
      phone: getValueByIndex(values, headerMap.phone),
      street: getValueByIndex(values, headerMap.street),
      city: getValueByIndex(values, headerMap.city),
      state: getValueByIndex(values, headerMap.state),
      country: getValueByIndex(values, headerMap.country),
      postalCode: getValueByIndex(values, headerMap.postalCode),
      notes: getValueByIndex(values, headerMap.notes),
      row: rowNumber
    };

    // Validate required fields
    if (!company.name?.trim()) {
      errors.push({
        row: rowNumber,
        field: 'name',
        message: 'Company name is required',
        data: company
      });
    }

    companies.push(company);
  }

  return { companies, errors };
}

/**
 * Detect potential duplicates by name or domain
 */
export async function detectCompanyDuplicates(
  companies: Array<ImportCompany & { row: number }>,
  tenantId: string
): Promise<Array<{
  row: number;
  existingCompany: { id: string; name: string; email?: string; website?: string };
  importData: ImportCompany;
  matchType: 'name' | 'email' | 'domain';
}>> {
  const duplicates = [];

  for (const company of companies) {
    // Check name duplicates
    if (company.name?.trim()) {
      const { data: nameMatches } = await supabase
        .from('companies')
        .select('id, name, email, website')
        .eq('tenant_id', tenantId)
        .eq('active', true)
        .ilike('name', company.name.trim());

      if (nameMatches && nameMatches.length > 0) {
        duplicates.push({
          row: company.row,
          existingCompany: nameMatches[0],
          importData: company,
          matchType: 'name' as const
        });
        continue;
      }
    }

    // Check email duplicates
    if (company.email?.trim()) {
      const { data: emailMatches } = await supabase
        .from('companies')
        .select('id, name, email, website')
        .eq('tenant_id', tenantId)
        .eq('active', true)
        .eq('email', company.email.trim().toLowerCase());

      if (emailMatches && emailMatches.length > 0) {
        duplicates.push({
          row: company.row,
          existingCompany: emailMatches[0],
          importData: company,
          matchType: 'email' as const
        });
        continue;
      }
    }

    // Check domain duplicates (extract domain from website and email)
    if (company.website?.trim()) {
      const domain = extractDomain(company.website);
      if (domain) {
        const { data: domainMatches } = await supabase
          .from('companies')
          .select('id, name, email, website')
          .eq('tenant_id', tenantId)
          .eq('active', true)
          .or(`website.ilike.%${domain}%,email.ilike.%${domain}%`);

        if (domainMatches && domainMatches.length > 0) {
          duplicates.push({
            row: company.row,
            existingCompany: domainMatches[0],
            importData: company,
            matchType: 'domain' as const
          });
        }
      }
    }
  }

  return duplicates;
}

/**
 * Import companies with validation and duplicate detection
 */
export async function importCompaniesFromCSV(
  csvContent: string,
  tenantId: string,
  options: {
    skipDuplicates?: boolean;
    mergeDuplicates?: boolean;
  } = {}
): Promise<CompanyImportResult> {
  try {
    const { companies, errors: parseErrors } = parseCSVToCompanies(csvContent);
    
    const result: CompanyImportResult = {
      success: false,
      processedRows: companies.length,
      skippedRows: 0,
      errors: parseErrors.map(e => ({
        row: e.row,
        message: `${e.field}: ${e.message}`,
        data: e.data
      })),
      createdCompanies: 0,
      duplicates: []
    };

    // If there are parse errors, don't proceed
    if (parseErrors.length > 0) {
      result.skippedRows = companies.length;
      return result;
    }

    // Detect duplicates
    const duplicates = await detectCompanyDuplicates(companies, tenantId);
    result.duplicates = duplicates;

    // Validate all companies
    for (const company of companies) {
      const validationData: CompanyValidationData = {
        name: company.name,
        email: company.email,
        website: company.website,
        tenantId
      };

      const validation = await validateCompany(validationData);

      if (!validation.nameValidation.isValid) {
        result.errors.push({
          row: company.row,
          message: `Name: ${validation.nameValidation.error}`,
          data: company
        });
      }

      if (!validation.emailValidation.isValid) {
        result.errors.push({
          row: company.row,
          message: `Email: ${validation.emailValidation.error}`,
          data: company
        });
      }

      if (!validation.websiteValidation.isValid) {
        result.errors.push({
          row: company.row,
          message: `Website: ${validation.websiteValidation.error}`,
          data: company
        });
      }
    }

    // Filter out companies with errors or duplicates (unless merging)
    const validCompanies = companies.filter(company => {
      const hasValidationError = result.errors.some(error => error.row === company.row);
      const isDuplicate = duplicates.some(dup => dup.row === company.row);
      
      if (hasValidationError) return false;
      if (isDuplicate && options.skipDuplicates) return false;
      
      return true;
    });

    // Insert valid companies
    if (validCompanies.length > 0) {
      const companiesToInsert = validCompanies.map(company => {
        const formData: CompanyFormData = {
          name: company.name,
          industry: company.industry,
          companyType: company.companyType ? [company.companyType] : [],
          website: company.website,
          email: company.email,
          phone: company.phone,
          address: {
            street: company.street,
            city: company.city,
            state: company.state,
            country: company.country,
            postalCode: company.postalCode
          },
          notes: company.notes
        };

        return {
          ...normalizeCompanyData(formData),
          tenant_id: tenantId
        };
      });

      const { data, error } = await supabase
        .from('companies')
        .insert(companiesToInsert)
        .select('id');

      if (error) {
        // Handle specific database constraint errors
        if (error.code === '23505') {
          result.errors.push({
            row: 0,
            message: 'Some companies have duplicate names or emails that already exist',
            data: {} as ImportCompany
          });
        } else {
          throw error;
        }
      } else {
        result.createdCompanies = data?.length || 0;
      }
    }

    result.skippedRows = result.processedRows - result.createdCompanies;
    result.success = result.createdCompanies > 0;

    return result;

  } catch (error) {
    console.error('Error importing companies:', error);
    return {
      success: false,
      processedRows: 0,
      skippedRows: 0,
      errors: [{
        row: 0,
        message: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        data: {} as ImportCompany
      }],
      createdCompanies: 0,
      duplicates: []
    };
  }
}

// Helper functions
function findHeaderIndex(headers: string[], possibleNames: string[]): number {
  for (const name of possibleNames) {
    const index = headers.findIndex(h => h.toLowerCase().includes(name.toLowerCase()));
    if (index !== -1) return index;
  }
  return -1;
}

function getValueByIndex(values: string[], index: number): string {
  if (index === -1 || index >= values.length) return '';
  return values[index]?.trim() || '';
}

function extractDomain(url: string): string | null {
  try {
    // Handle cases where URL doesn't have protocol
    const urlWithProtocol = url.startsWith('http') ? url : `https://${url}`;
    const domain = new URL(urlWithProtocol).hostname;
    return domain.replace('www.', '');
  } catch {
    // If URL parsing fails, try to extract domain with regex
    const match = url.match(/(?:https?:\/\/)?(?:www\.)?([^\/\s]+)/);
    return match ? match[1] : null;
  }
}