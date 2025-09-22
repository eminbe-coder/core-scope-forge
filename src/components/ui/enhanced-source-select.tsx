import * as React from "react";
import { useState, useEffect } from "react";
import { Check, ChevronDown, Building, User, Users, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QuickAddCompanyModal } from "@/components/modals/QuickAddCompanyModal";
import { UnifiedQuickAddContactModal } from "@/components/modals/UnifiedQuickAddContactModal";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";
import { useToast } from "@/hooks/use-toast";

interface DealSource {
  id: string;
  name: string;
  description?: string;
}

interface Company {
  id: string;
  name: string;
  email?: string;
}

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
}

interface SourceValues {
  sourceCategory: string;
  companySource: string;
  contactSource: string;
}

interface EnhancedSourceSelectProps {
  value: SourceValues;
  onValueChange: (value: SourceValues) => void;
  className?: string;
  disabled?: boolean;
}

export const EnhancedSourceSelect = React.forwardRef<HTMLDivElement, EnhancedSourceSelectProps>(
  ({ value, onValueChange, className, disabled }, ref) => {
    const { currentTenant } = useTenant();
    const { toast } = useToast();
    
    const [dealSources, setDealSources] = useState<DealSource[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [loadingCompanies, setLoadingCompanies] = useState(false);
    const [loadingContacts, setLoadingContacts] = useState(false);
    const [companySearch, setCompanySearch] = useState("");
    const [contactSearch, setContactSearch] = useState("");
    const [showCompanyModal, setShowCompanyModal] = useState(false);
    const [showContactModal, setShowContactModal] = useState(false);
    const [companyOpen, setCompanyOpen] = useState(false);
    const [contactOpen, setContactOpen] = useState(false);

    // Load deal sources on mount
    useEffect(() => {
      if (currentTenant) {
        loadDealSources();
      }
    }, [currentTenant]);

    // Load companies when company search changes
    useEffect(() => {
      if (companyOpen) {
        searchCompanies(companySearch);
      }
    }, [companySearch, companyOpen, currentTenant]);

    // Load contacts when contact search changes
    useEffect(() => {
      if (contactOpen) {
        searchContacts(contactSearch);
      }
    }, [contactSearch, contactOpen, currentTenant]);

    const loadDealSources = async () => {
      if (!currentTenant) return;

      try {
        const { data, error } = await supabase
          .from('deal_sources')
          .select('id, name, description')
          .eq('tenant_id', currentTenant.id)
          .eq('active', true)
          .order('sort_order');

        if (error) throw error;
        setDealSources(data || []);
      } catch (error) {
        console.error('Error loading deal sources:', error);
      }
    };

    const searchCompanies = async (searchTerm: string) => {
      if (!currentTenant) return;

      setLoadingCompanies(true);
      try {
        let query = supabase
          .from('companies')
          .select('id, name, email')
          .eq('tenant_id', currentTenant.id)
          .eq('active', true)
          .limit(20);

        if (searchTerm) {
          query = query.ilike('name', `%${searchTerm}%`);
        }

        const { data, error } = await query.order('name');

        if (error) throw error;
        setCompanies(data || []);
      } catch (error) {
        console.error('Error searching companies:', error);
      } finally {
        setLoadingCompanies(false);
      }
    };

    const searchContacts = async (searchTerm: string) => {
      if (!currentTenant) return;

      setLoadingContacts(true);
      try {
        let query = supabase
          .from('contacts')
          .select('id, first_name, last_name, email')
          .eq('tenant_id', currentTenant.id)
          .eq('active', true)
          .limit(20);

        if (searchTerm) {
          query = query.or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
        }

        const { data, error } = await query.order('first_name');

        if (error) throw error;
        setContacts(data || []);
      } catch (error) {
        console.error('Error searching contacts:', error);
      } finally {
        setLoadingContacts(false);
      }
    };

    const getDisplayName = (contact: Contact) => {
      const fullName = `${contact.first_name} ${contact.last_name}`.trim();
      return contact.email ? `${fullName} (${contact.email})` : fullName;
    };

    const getSelectedCompany = () => {
      return companies.find(c => c.id === value.companySource);
    };

    const getSelectedContact = () => {
      return contacts.find(c => c.id === value.contactSource);
    };

    // No need for handleCompanyAdd and handleContactAdd functions
    // as the modals handle their own logic

    return (
      <div ref={ref} className={cn("space-y-4", className)}>
        {/* Source Category */}
        <div className="space-y-2">
          <Label>Source Category</Label>
          <Select
            value={value.sourceCategory}
            onValueChange={(val) => onValueChange({ ...value, sourceCategory: val })}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select source category" />
            </SelectTrigger>
            <SelectContent>
              {dealSources.map((source) => (
                <SelectItem key={source.id} value={source.id}>
                  {source.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Company Source */}
        <div className="space-y-2">
          <Label>Company Source</Label>
          <Popover open={companyOpen} onOpenChange={setCompanyOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={companyOpen}
                className="w-full justify-between"
                disabled={disabled}
              >
                {getSelectedCompany() ? (
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    <span className="truncate">{getSelectedCompany()?.name}</span>
                  </div>
                ) : (
                  "Search companies..."
                )}
                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
              <div className="p-2">
                <Input
                  placeholder="Search companies..."
                  value={companySearch}
                  onChange={(e) => setCompanySearch(e.target.value)}
                  className="mb-2"
                />
              </div>
              <ScrollArea className="max-h-60">
                {loadingCompanies ? (
                  <div className="p-4 text-sm text-muted-foreground text-center">
                    Loading...
                  </div>
                ) : companies.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground text-center">
                    No companies found
                  </div>
                ) : (
                  <div className="p-1">
                    {companies.map((company) => (
                      <Button
                        key={company.id}
                        variant="ghost"
                        className="w-full justify-start h-auto p-2"
                        onClick={() => {
                          onValueChange({ ...value, companySource: company.id || null });
                          setCompanyOpen(false);
                        }}
                      >
                        <div className="flex items-center gap-2 w-full">
                          <Building className="h-4 w-4" />
                          <div className="flex-1 text-left">
                            <div className="font-medium">{company.name}</div>
                            {company.email && (
                              <div className="text-xs text-muted-foreground">
                                {company.email}
                              </div>
                            )}
                          </div>
                          {company.id === value.companySource && (
                            <Check className="h-4 w-4" />
                          )}
                        </div>
                      </Button>
                    ))}
                  </div>
                )}
              </ScrollArea>
              <div className="p-2 border-t">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    setShowCompanyModal(true);
                    setCompanyOpen(false);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Quick Add Company
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Contact Source */}
        <div className="space-y-2">
          <Label>Contact Source</Label>
          <Popover open={contactOpen} onOpenChange={setContactOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={contactOpen}
                className="w-full justify-between"
                disabled={disabled}
              >
                {getSelectedContact() ? (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span className="truncate">{getDisplayName(getSelectedContact()!)}</span>
                  </div>
                ) : (
                  "Search contacts..."
                )}
                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
              <div className="p-2">
                <Input
                  placeholder="Search contacts..."
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  className="mb-2"
                />
              </div>
              <ScrollArea className="max-h-60">
                {loadingContacts ? (
                  <div className="p-4 text-sm text-muted-foreground text-center">
                    Loading...
                  </div>
                ) : contacts.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground text-center">
                    No contacts found
                  </div>
                ) : (
                  <div className="p-1">
                    {contacts.map((contact) => (
                      <Button
                        key={contact.id}
                        variant="ghost"
                        className="w-full justify-start h-auto p-2"
                        onClick={() => {
                          onValueChange({ ...value, contactSource: contact.id || null });
                          setContactOpen(false);
                        }}
                      >
                        <div className="flex items-center gap-2 w-full">
                          <User className="h-4 w-4" />
                          <div className="flex-1 text-left">
                            <div className="font-medium">{getDisplayName(contact)}</div>
                            <div className="text-xs text-muted-foreground">
                              Contact
                            </div>
                          </div>
                          {contact.id === value.contactSource && (
                            <Check className="h-4 w-4" />
                          )}
                        </div>
                      </Button>
                    ))}
                  </div>
                )}
              </ScrollArea>
              <div className="p-2 border-t">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    setShowContactModal(true);
                    setContactOpen(false);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Quick Add Contact
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Modals */}
        <QuickAddCompanyModal
          open={showCompanyModal}
          onClose={() => setShowCompanyModal(false)}
          onCompanyCreated={(company) => {
            onValueChange({
              ...value,
              companySource: company.id || null,
            });
            searchCompanies(companySearch);
          }}
        />

        <UnifiedQuickAddContactModal
          open={showContactModal}
          onClose={() => setShowContactModal(false)}
          onContactCreated={(contact) => {
            onValueChange({
              ...value,
              contactSource: contact.id || null,
            });
            searchContacts(contactSearch);
          }}
        />
      </div>
    );
  }
);

EnhancedSourceSelect.displayName = "EnhancedSourceSelect";

export type { SourceValues };