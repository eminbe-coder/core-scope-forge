import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';

interface CreateQuoteFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  prefillDealId?: string;
  prefillSiteId?: string;
}

interface Deal {
  id: string;
  name: string;
}

interface Site {
  id: string;
  name: string;
}

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
}

interface Currency {
  id: string;
  code: string;
  symbol: string;
}

export function CreateQuoteForm({
  open,
  onOpenChange,
  onSuccess,
  prefillDealId,
  prefillSiteId,
}: CreateQuoteFormProps) {
  const navigate = useNavigate();
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    reference_number: '',
    deal_id: prefillDealId || '',
    site_id: prefillSiteId || '',
    contact_id: '',
    currency_id: '',
    expiry_date: '',
    notes: '',
  });

  useEffect(() => {
    if (open && currentTenant?.id) {
      fetchRelatedData();
    }
  }, [open, currentTenant?.id]);

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      deal_id: prefillDealId || '',
      site_id: prefillSiteId || '',
    }));
  }, [prefillDealId, prefillSiteId]);

  const fetchRelatedData = async () => {
    if (!currentTenant?.id) return;

    try {
      const [dealsRes, sitesRes, contactsRes, currenciesRes, tenantRes] = await Promise.all([
        supabase
          .from('deals')
          .select('id, name')
          .eq('tenant_id', currentTenant.id)
          .is('deleted_at', null)
          .order('name'),
        supabase
          .from('sites')
          .select('id, name')
          .eq('tenant_id', currentTenant.id)
          .is('deleted_at', null)
          .order('name'),
        supabase
          .from('contacts')
          .select('id, first_name, last_name')
          .eq('tenant_id', currentTenant.id)
          .is('deleted_at', null)
          .order('first_name'),
        supabase.from('currencies').select('id, code, symbol').order('code'),
        supabase
          .from('tenants')
          .select('default_currency_id')
          .eq('id', currentTenant.id)
          .single(),
      ]);

      if (dealsRes.data) setDeals(dealsRes.data);
      if (sitesRes.data) setSites(sitesRes.data);
      if (contactsRes.data) setContacts(contactsRes.data);
      if (currenciesRes.data) {
        setCurrencies(currenciesRes.data);
        // Set default currency
        if (tenantRes.data?.default_currency_id) {
          setFormData((prev) => ({
            ...prev,
            currency_id: tenantRes.data.default_currency_id,
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching related data:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTenant?.id || !user?.id) return;

    if (!formData.name.trim()) {
      toast.error('Quote name is required');
      return;
    }

    setLoading(true);
    try {
      // Create the quote
      const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .insert({
          tenant_id: currentTenant.id,
          name: formData.name.trim(),
          reference_number: formData.reference_number.trim() || null,
          deal_id: formData.deal_id || null,
          site_id: formData.site_id || null,
          contact_id: formData.contact_id || null,
          currency_id: formData.currency_id || null,
          expiry_date: formData.expiry_date || null,
          notes: formData.notes.trim() || null,
          status: 'draft',
          created_by: user.id,
          assigned_to: user.id,
        })
        .select()
        .single();

      if (quoteError) throw quoteError;

      // Create initial version
      const { error: versionError } = await supabase.from('quote_versions').insert({
        tenant_id: currentTenant.id,
        quote_id: quote.id,
        version_number: 1,
        version_name: 'Version 1',
        is_primary: true,
        created_by: user.id,
      });

      if (versionError) throw versionError;

      toast.success('Quote created successfully');
      onSuccess?.();
      navigate(`/quotes/${quote.id}`);
    } catch (error) {
      console.error('Error creating quote:', error);
      toast.error('Failed to create quote');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      reference_number: '',
      deal_id: '',
      site_id: '',
      contact_id: '',
      currency_id: '',
      expiry_date: '',
      notes: '',
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Quote</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="name">Quote Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter quote name"
              />
            </div>

            <div>
              <Label htmlFor="reference_number">Reference Number</Label>
              <Input
                id="reference_number"
                value={formData.reference_number}
                onChange={(e) =>
                  setFormData({ ...formData, reference_number: e.target.value })
                }
                placeholder="Q-001"
              />
            </div>

            <div>
              <Label htmlFor="currency">Currency</Label>
              <Select
                value={formData.currency_id}
                onValueChange={(value) => setFormData({ ...formData, currency_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((currency) => (
                    <SelectItem key={currency.id} value={currency.id}>
                      {currency.code} ({currency.symbol})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="deal">Related Deal</Label>
              <Select
                value={formData.deal_id}
                onValueChange={(value) => setFormData({ ...formData, deal_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select deal (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {deals.map((deal) => (
                    <SelectItem key={deal.id} value={deal.id}>
                      {deal.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="site">Site</Label>
              <Select
                value={formData.site_id}
                onValueChange={(value) => setFormData({ ...formData, site_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select site (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {sites.map((site) => (
                    <SelectItem key={site.id} value={site.id}>
                      {site.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="contact">Contact</Label>
              <Select
                value={formData.contact_id}
                onValueChange={(value) => setFormData({ ...formData, contact_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select contact (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {contacts.map((contact) => (
                    <SelectItem key={contact.id} value={contact.id}>
                      {contact.first_name} {contact.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="expiry_date">Expiry Date</Label>
              <Input
                id="expiry_date"
                type="date"
                value={formData.expiry_date}
                onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Quote'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
