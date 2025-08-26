import { supabase } from '@/integrations/supabase/client';

/**
 * Company validation utilities
 * Structured to easily swap in RPC or database constraints later
 */

// URL validation regex (more permissive than strict RFC)
const URL_REGEX = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/i;

// Email validation regex (RFC 5322 compliant, simplified)
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

export interface CompanyValidationResult {
  isValid: boolean;
  error?: string;
  errorCode?: 'INVALID_FORMAT' | 'ALREADY_EXISTS' | 'DATABASE_ERROR';
}

export interface CompanyValidationData {
  name: string;
  email?: string;
  website?: string;
  tenantId: string;
  excludeCompanyId?: string; // For updates
}

export interface CompanyAddress {
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}

export interface CompanyFormData {
  name: string;
  industry?: string;
  companyType?: string[];
  website?: string;
  email?: string;
  phone?: string;
  instagramPage?: string;
  linkedinPage?: string;
  address?: CompanyAddress;
  notes?: string;
  contactIds?: string[];
}

// Industry options - can be moved to a config file later
export const INDUSTRY_OPTIONS = [
  'Technology',
  'Healthcare',
  'Finance',
  'Manufacturing',
  'Retail',
  'Education',
  'Construction',
  'Real Estate',
  'Transportation',
  'Energy',
  'Media',
  'Legal',
  'Consulting',
  'Hospitality',
  'Agriculture',
  'Non-profit',
  'Government',
  'Other'
];

// Company type options
export const COMPANY_TYPE_OPTIONS = [
  'Client',
  'Vendor',
  'Partner',
  'Competitor',
  'Supplier',
  'Distributor',
  'Contractor',
  'Subsidiary'
];

/**
 * Validates company name format
 */
export function validateCompanyName(name: string): CompanyValidationResult {
  if (!name?.trim()) {
    return {
      isValid: false,
      error: 'Company name is required',
      errorCode: 'INVALID_FORMAT'
    };
  }

  if (name.trim().length < 2) {
    return {
      isValid: false,
      error: 'Company name must be at least 2 characters',
      errorCode: 'INVALID_FORMAT'
    };
  }

  return { isValid: true };
}

/**
 * Validates email format
 */
export function validateCompanyEmail(email: string): CompanyValidationResult {
  if (!email?.trim()) {
    return { isValid: true }; // Email is optional
  }

  if (!EMAIL_REGEX.test(email.trim())) {
    return {
      isValid: false,
      error: 'Please enter a valid email address',
      errorCode: 'INVALID_FORMAT'
    };
  }

  return { isValid: true };
}

/**
 * Validates website URL format
 */
export function validateCompanyWebsite(website: string): CompanyValidationResult {
  if (!website?.trim()) {
    return { isValid: true }; // Website is optional
  }

  if (!URL_REGEX.test(website.trim())) {
    return {
      isValid: false,
      error: 'Please enter a valid website URL',
      errorCode: 'INVALID_FORMAT'
    };
  }

  return { isValid: true };
}

/**
 * Checks if company name already exists for the tenant
 */
export async function checkCompanyNameExists(data: CompanyValidationData): Promise<CompanyValidationResult> {
  const { name, tenantId, excludeCompanyId } = data;
  
  if (!name?.trim()) {
    return { isValid: true }; // Will be caught by name validation
  }

  try {
    let query = supabase
      .from('companies')
      .select('id, name')
      .eq('name', name.trim())
      .eq('tenant_id', tenantId)
      .eq('active', true);

    // If we're updating an existing company, exclude it from the check
    if (excludeCompanyId) {
      query = query.neq('id', excludeCompanyId);
    }

    const { data: existingCompanies, error } = await query;

    if (error) {
      console.error('Error checking company name uniqueness:', error);
      return {
        isValid: false,
        error: 'Unable to validate company name. Please try again.',
        errorCode: 'DATABASE_ERROR'
      };
    }

    if (existingCompanies && existingCompanies.length > 0) {
      return {
        isValid: false,
        error: 'A company with this name already exists',
        errorCode: 'ALREADY_EXISTS'
      };
    }

    return { isValid: true };

  } catch (error) {
    console.error('Unexpected error during company name validation:', error);
    return {
      isValid: false,
      error: 'Unable to validate company name. Please try again.',
      errorCode: 'DATABASE_ERROR'
    };
  }
}

/**
 * Checks if company email already exists for the tenant
 */
export async function checkCompanyEmailExists(data: CompanyValidationData): Promise<CompanyValidationResult> {
  const { email, tenantId, excludeCompanyId } = data;
  
  if (!email?.trim()) {
    return { isValid: true }; // Email is optional
  }

  try {
    let query = supabase
      .from('companies')
      .select('id, email')
      .eq('email', email.trim().toLowerCase())
      .eq('tenant_id', tenantId)
      .eq('active', true);

    // If we're updating an existing company, exclude it from the check
    if (excludeCompanyId) {
      query = query.neq('id', excludeCompanyId);
    }

    const { data: existingCompanies, error } = await query;

    if (error) {
      console.error('Error checking company email uniqueness:', error);
      return {
        isValid: false,
        error: 'Unable to validate company email. Please try again.',
        errorCode: 'DATABASE_ERROR'
      };
    }

    if (existingCompanies && existingCompanies.length > 0) {
      return {
        isValid: false,
        error: 'A company with this email already exists',
        errorCode: 'ALREADY_EXISTS'
      };
    }

    return { isValid: true };

  } catch (error) {
    console.error('Unexpected error during company email validation:', error);
    return {
      isValid: false,
      error: 'Unable to validate company email. Please try again.',
      errorCode: 'DATABASE_ERROR'
    };
  }
}

/**
 * Complete company validation (all fields)
 */
export async function validateCompany(data: CompanyValidationData): Promise<{
  nameValidation: CompanyValidationResult;
  emailValidation: CompanyValidationResult;
  websiteValidation: CompanyValidationResult;
}> {
  // Validate format first
  const nameValidation = validateCompanyName(data.name);
  const emailValidation = validateCompanyEmail(data.email || '');
  const websiteValidation = validateCompanyWebsite(data.website || '');

  // If format validations pass, check uniqueness
  if (nameValidation.isValid) {
    const nameUniqueness = await checkCompanyNameExists(data);
    if (!nameUniqueness.isValid) {
      nameValidation.isValid = false;
      nameValidation.error = nameUniqueness.error;
      nameValidation.errorCode = nameUniqueness.errorCode;
    }
  }

  if (emailValidation.isValid && data.email?.trim()) {
    const emailUniqueness = await checkCompanyEmailExists(data);
    if (!emailUniqueness.isValid) {
      emailValidation.isValid = false;
      emailValidation.error = emailUniqueness.error;
      emailValidation.errorCode = emailUniqueness.errorCode;
    }
  }

  return {
    nameValidation,
    emailValidation,
    websiteValidation
  };
}

/**
 * Utility to normalize company data for storage
 */
export function normalizeCompanyData(data: CompanyFormData): any {
  const addressString = data.address ? [
    data.address.street,
    data.address.city,
    data.address.state,
    data.address.country,
    data.address.postalCode
  ].filter(Boolean).join(', ') : null;

  return {
    name: data.name.trim(),
    industry: data.industry?.trim() || null,
    website: data.website ? normalizeUrl(data.website) : null,
    email: data.email ? data.email.trim().toLowerCase() : null,
    phone: data.phone?.trim() || null,
    instagram_page: data.instagramPage ? normalizeUrl(data.instagramPage) : null,
    linkedin_page: data.linkedinPage ? normalizeUrl(data.linkedinPage) : null,
    headquarters: addressString,
    notes: data.notes?.trim() || null,
    // Store company types as JSON in notes for now, until we add a proper field
    description: data.companyType && data.companyType.length > 0 
      ? `Company Types: ${data.companyType.join(', ')}` 
      : null
  };
}

/**
 * Utility to normalize URLs
 */
export function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

/**
 * Future upgrade path: Replace database queries with RPC calls
 */
export async function validateCompanyRPC(data: CompanyValidationData): Promise<CompanyValidationResult> {
  // TODO: When RPC is implemented, replace direct database queries with this
  // Example:
  // const { data: validation, error } = await supabase.rpc('validate_company_data', {
  //   _name: data.name,
  //   _email: data.email,
  //   _tenant_id: data.tenantId,
  //   _company_id: data.excludeCompanyId
  // });
  
  // For now, delegate to the current validation functions
  const validations = await validateCompany(data);
  
  if (!validations.nameValidation.isValid) return validations.nameValidation;
  if (!validations.emailValidation.isValid) return validations.emailValidation;
  if (!validations.websiteValidation.isValid) return validations.websiteValidation;
  
  return { isValid: true };
}