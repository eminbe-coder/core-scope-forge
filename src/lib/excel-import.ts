import { validateContactEmailsBatch, normalizeEmail } from './contact-validation';
import { supabase } from '@/integrations/supabase/client';

export interface ImportContact {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  position?: string;
  company?: string;
  address?: string;
  notes?: string;
}

export interface ImportResult {
  success: boolean;
  processedRows: number;
  skippedRows: number;
  errors: Array<{
    row: number;
    message: string;
    data: ImportContact;
  }>;
  createdContacts: number;
}

export interface ValidationError {
  row: number;
  field: string;
  message: string;
  data: ImportContact;
}

/**
 * Parse CSV content and convert to contact objects
 */
export function parseCSVToContacts(csvContent: string): {
  contacts: Array<ImportContact & { row: number }>;
  errors: ValidationError[];
} {
  const lines = csvContent.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('CSV file must contain at least a header row and one data row');
  }

  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const contacts: Array<ImportContact & { row: number }> = [];
  const errors: ValidationError[] = [];

  // Map expected headers (case insensitive)
  const headerMap = {
    firstName: findHeaderIndex(headers, ['first name', 'firstname', 'fname']),
    lastName: findHeaderIndex(headers, ['last name', 'lastname', 'lname']),
    email: findHeaderIndex(headers, ['email', 'email address', 'e-mail']),
    phone: findHeaderIndex(headers, ['phone', 'telephone', 'mobile', 'phone number']),
    position: findHeaderIndex(headers, ['position', 'job title', 'title', 'role']),
    company: findHeaderIndex(headers, ['company', 'organization', 'employer']),
    address: findHeaderIndex(headers, ['address', 'street address', 'location']),
    notes: findHeaderIndex(headers, ['notes', 'comments', 'remarks'])
  };

  for (let i = 1; i < lines.length; i++) {
    const rowNumber = i + 1;
    const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
    
    const contact: ImportContact & { row: number } = {
      firstName: getValueByIndex(values, headerMap.firstName),
      lastName: getValueByIndex(values, headerMap.lastName),
      email: getValueByIndex(values, headerMap.email),
      phone: getValueByIndex(values, headerMap.phone),
      position: getValueByIndex(values, headerMap.position),
      company: getValueByIndex(values, headerMap.company),
      address: getValueByIndex(values, headerMap.address),
      notes: getValueByIndex(values, headerMap.notes),
      row: rowNumber
    };

    // Validate required fields
    if (!contact.firstName?.trim()) {
      errors.push({
        row: rowNumber,
        field: 'firstName',
        message: 'First name is required',
        data: contact
      });
    }

    if (!contact.lastName?.trim()) {
      errors.push({
        row: rowNumber,
        field: 'lastName',
        message: 'Last name is required',
        data: contact
      });
    }

    contacts.push(contact);
  }

  return { contacts, errors };
}

/**
 * Import contacts with email validation
 */
export async function importContactsFromCSV(
  csvContent: string,
  tenantId: string
): Promise<ImportResult> {
  try {
    const { contacts, errors: parseErrors } = parseCSVToContacts(csvContent);
    
    const result: ImportResult = {
      success: false,
      processedRows: contacts.length,
      skippedRows: 0,
      errors: parseErrors.map(e => ({
        row: e.row,
        message: `${e.field}: ${e.message}`,
        data: e.data
      })),
      createdContacts: 0
    };

    // If there are parse errors, don't proceed
    if (parseErrors.length > 0) {
      result.skippedRows = contacts.length;
      return result;
    }

    // Validate emails for all contacts that have email addresses
    const emailsToValidate = contacts
      .filter(contact => contact.email?.trim())
      .map((contact, index) => ({
        email: contact.email!,
        index: contacts.indexOf(contact)
      }));

    const emailValidations = await validateContactEmailsBatch(emailsToValidate, tenantId);

    // Add email validation errors
    for (const validation of emailValidations) {
      if (!validation.validation.isValid) {
        const contact = contacts[validation.index];
        result.errors.push({
          row: contact.row,
          message: `Email: ${validation.validation.error}`,
          data: contact
        });
      }
    }

    // Prepare valid contacts for insertion
    const validContacts = contacts.filter(contact => {
      const hasEmailError = result.errors.some(error => 
        error.row === contact.row && error.message.startsWith('Email:')
      );
      const hasOtherError = result.errors.some(error => 
        error.row === contact.row && !error.message.startsWith('Email:')
      );
      return !hasEmailError && !hasOtherError;
    });

    // Insert valid contacts
    if (validContacts.length > 0) {
      const contactsToInsert = validContacts.map(contact => ({
        first_name: contact.firstName.trim(),
        last_name: contact.lastName.trim(),
        email: contact.email ? normalizeEmail(contact.email) : null,
        phone: contact.phone?.trim() || null,
        position: contact.position?.trim() || null,
        address: contact.address?.trim() || null,
        notes: contact.notes?.trim() || null,
        tenant_id: tenantId,
        customer_id: null, // TODO: Map company names to customer IDs
      }));

      const { data, error } = await supabase
        .from('contacts')
        .insert(contactsToInsert)
        .select('id');

      if (error) {
        // Handle specific database constraint errors
        if (error.code === '23505' && error.message.includes('contacts_email_tenant_unique')) {
          result.errors.push({
            row: 0,
            message: 'Some contacts have duplicate emails that already exist in your database',
            data: {} as ImportContact
          });
        } else {
          throw error;
        }
      } else {
        result.createdContacts = data?.length || 0;
      }
    }

    result.skippedRows = result.processedRows - result.createdContacts;
    result.success = result.createdContacts > 0;

    return result;

  } catch (error) {
    console.error('Error importing contacts:', error);
    return {
      success: false,
      processedRows: 0,
      skippedRows: 0,
      errors: [{
        row: 0,
        message: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        data: {} as ImportContact
      }],
      createdContacts: 0
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