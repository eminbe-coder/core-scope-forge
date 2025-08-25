import { supabase } from '@/integrations/supabase/client';

export interface SiteValidationError {
  field: string;
  message: string;
}

export interface ValidatedSiteData {
  name: string;
  address: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  customer_id?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
}

/**
 * Validates site name format
 */
export const validateSiteName = (name: string): boolean => {
  if (!name || name.trim().length === 0) {
    return false;
  }
  
  // Site name should be at least 2 characters and not just whitespace
  return name.trim().length >= 2 && /^[a-zA-Z0-9\s\-_.&()]+$/.test(name.trim());
};

/**
 * Check if site name already exists in the database
 */
export const checkSiteNameExists = async (name: string, tenantId: string, excludeId?: string): Promise<boolean> => {
  try {
    let query = supabase
      .from('sites')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('name', name.trim())
      .eq('active', true);
    
    if (excludeId) {
      query = query.neq('id', excludeId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error checking site name existence:', error);
      return false;
    }
    
    return data && data.length > 0;
  } catch (error) {
    console.error('Error in checkSiteNameExists:', error);
    return false;
  }
};

/**
 * Validates coordinates if provided
 */
export const validateCoordinates = (lat?: number, lng?: number): boolean => {
  if (lat === undefined && lng === undefined) return true;
  if (lat === undefined || lng === undefined) return false;
  
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
};

/**
 * Validates a single site's data
 */
export const validateSiteData = async (
  siteData: Partial<ValidatedSiteData>, 
  tenantId: string,
  excludeId?: string
): Promise<SiteValidationError[]> => {
  const errors: SiteValidationError[] = [];

  // Validate required fields
  if (!siteData.name || !validateSiteName(siteData.name)) {
    errors.push({
      field: 'name',
      message: 'Site name is required and must be at least 2 characters long'
    });
  }

  if (!siteData.address || siteData.address.trim().length === 0) {
    errors.push({
      field: 'address',
      message: 'Site address is required'
    });
  }

  // Check for unique site name
  if (siteData.name && validateSiteName(siteData.name)) {
    const nameExists = await checkSiteNameExists(siteData.name, tenantId, excludeId);
    if (nameExists) {
      errors.push({
        field: 'name',
        message: 'A site with this name already exists'
      });
    }
  }

  // Validate coordinates if provided
  if (!validateCoordinates(siteData.latitude, siteData.longitude)) {
    errors.push({
      field: 'coordinates',
      message: 'Invalid coordinates. Latitude must be between -90 and 90, longitude between -180 and 180'
    });
  }

  return errors;
};

/**
 * Validates multiple sites for batch operations
 */
export const validateSitesData = async (
  sitesData: Partial<ValidatedSiteData>[],
  tenantId: string
): Promise<{ valid: ValidatedSiteData[]; errors: Array<{ index: number; errors: SiteValidationError[] }> }> => {
  const valid: ValidatedSiteData[] = [];
  const errors: Array<{ index: number; errors: SiteValidationError[] }> = [];

  // Check for duplicate names within the batch
  const names = sitesData.map(site => site.name?.trim().toLowerCase()).filter(Boolean);
  const duplicateNames = names.filter((name, index) => names.indexOf(name) !== index);

  for (let i = 0; i < sitesData.length; i++) {
    const site = sitesData[i];
    const siteErrors = await validateSiteData(site, tenantId);

    // Check for duplicates within batch
    if (site.name && duplicateNames.includes(site.name.trim().toLowerCase())) {
      siteErrors.push({
        field: 'name',
        message: 'Duplicate site name in this batch'
      });
    }

    if (siteErrors.length === 0 && site.name && site.address) {
      valid.push({
        name: site.name.trim(),
        address: site.address.trim(),
        city: site.city?.trim(),
        state: site.state?.trim(),
        country: site.country?.trim(),
        postal_code: site.postal_code?.trim(),
        customer_id: site.customer_id,
        latitude: site.latitude,
        longitude: site.longitude,
        notes: site.notes?.trim()
      });
    } else {
      errors.push({ index: i, errors: siteErrors });
    }
  }

  return { valid, errors };
};

/**
 * Future-ready function for RPC validation
 * Can be swapped in later without changing calling code
 */
export const validateSiteWithRPC = async (
  siteData: Partial<ValidatedSiteData>,
  tenantId: string,
  excludeId?: string
): Promise<SiteValidationError[]> => {
  // TODO: Replace with RPC call when implemented
  // const { data, error } = await supabase.rpc('validate_site_data', {
  //   site_data: siteData,
  //   tenant_id: tenantId,
  //   exclude_id: excludeId
  // });
  
  // For now, use the direct validation
  return validateSiteData(siteData, tenantId, excludeId);
};

/**
 * Check if customer exists by ID
 */
export const checkCustomerExists = async (customerId: string, tenantId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('id')
      .eq('id', customerId)
      .eq('tenant_id', tenantId)
      .eq('active', true)
      .single();

    return !error && !!data;
  } catch (error) {
    console.error('Error checking customer existence:', error);
    return false;
  }
};

/**
 * Check if contact exists by ID
 */
export const checkContactExists = async (contactId: string, tenantId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('contacts')
      .select('id')
      .eq('id', contactId)
      .eq('tenant_id', tenantId)
      .eq('active', true)
      .single();

    return !error && !!data;
  } catch (error) {
    console.error('Error checking contact existence:', error);
    return false;
  }
};