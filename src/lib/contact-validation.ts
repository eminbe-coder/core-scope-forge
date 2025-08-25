import { supabase } from '@/integrations/supabase/client';

/**
 * Email validation utilities for contact management
 * Structured to easily swap in RPC or database constraints later
 */

// RFC 5322 compliant email regex (simplified but robust)
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

export interface EmailValidationResult {
  isValid: boolean;
  error?: string;
  errorCode?: 'INVALID_FORMAT' | 'ALREADY_EXISTS' | 'DATABASE_ERROR';
}

export interface ContactEmailData {
  email: string;
  tenantId: string;
  excludeContactId?: string; // For updates, exclude current contact
}

/**
 * Validates email format using RFC 5322 compliant regex
 */
export function validateEmailFormat(email: string): EmailValidationResult {
  if (!email.trim()) {
    return { isValid: true }; // Empty email is allowed
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
 * Checks if email already exists in the contacts table for the given tenant
 * This function can be easily replaced with an RPC call later
 */
export async function checkEmailExists(data: ContactEmailData): Promise<EmailValidationResult> {
  const { email, tenantId, excludeContactId } = data;
  
  if (!email.trim()) {
    return { isValid: true }; // Empty email is allowed
  }

  try {
    let query = supabase
      .from('contacts')
      .select('id, email')
      .eq('email', email.trim().toLowerCase())
      .eq('tenant_id', tenantId)
      .eq('active', true);

    // If we're updating an existing contact, exclude it from the check
    if (excludeContactId) {
      query = query.neq('id', excludeContactId);
    }

    const { data: existingContacts, error } = await query;

    if (error) {
      console.error('Error checking email uniqueness:', error);
      return {
        isValid: false,
        error: 'Unable to validate email. Please try again.',
        errorCode: 'DATABASE_ERROR'
      };
    }

    if (existingContacts && existingContacts.length > 0) {
      return {
        isValid: false,
        error: 'This email already exists in your contacts',
        errorCode: 'ALREADY_EXISTS'
      };
    }

    return { isValid: true };

  } catch (error) {
    console.error('Unexpected error during email validation:', error);
    return {
      isValid: false,
      error: 'Unable to validate email. Please try again.',
      errorCode: 'DATABASE_ERROR'
    };
  }
}

/**
 * Complete email validation (format + uniqueness)
 * This is the main validation function to use in forms
 */
export async function validateContactEmail(data: ContactEmailData): Promise<EmailValidationResult> {
  // First check format
  const formatResult = validateEmailFormat(data.email);
  if (!formatResult.isValid) {
    return formatResult;
  }

  // Then check uniqueness if format is valid
  return await checkEmailExists(data);
}

/**
 * Batch email validation for imports (Excel, OAuth sync)
 * Returns validation results for all emails
 */
export async function validateContactEmailsBatch(
  emails: Array<{ email: string; index: number }>,
  tenantId: string
): Promise<Array<{ index: number; email: string; validation: EmailValidationResult }>> {
  const results = [];

  for (const { email, index } of emails) {
    const validation = await validateContactEmail({ email, tenantId });
    results.push({ index, email, validation });
  }

  return results;
}

/**
 * Utility to normalize email for storage
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Future upgrade path: Replace database queries with RPC calls
 * When RPC is available, update this function to use it instead
 */
export async function checkEmailExistsRPC(data: ContactEmailData): Promise<EmailValidationResult> {
  // TODO: When RPC is implemented, replace checkEmailExists with this
  // Example:
  // const { data: isUnique, error } = await supabase.rpc('validate_contact_email_unique', {
  //   _email: data.email,
  //   _tenant_id: data.tenantId,
  //   _contact_id: data.excludeContactId
  // });
  
  // For now, delegate to the direct database query
  return await checkEmailExists(data);
}