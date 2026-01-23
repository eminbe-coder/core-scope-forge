import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FileSpreadsheet,
  ArrowLeft,
  Plus,
  Copy,
  Check,
  Send,
  Trash2,
  MoreVertical,
  Building2,
  MapPin,
  Contact,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { useCurrency } from '@/hooks/use-currency';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { QuoteVersionEditor } from '@/components/quotes/QuoteVersionEditor';

interface Quote {
  id: string;
  name: string;
  reference_number: string | null;
  status: string;
  total_amount: number;
  expiry_date: string | null;
  notes: string | null;
  created_at: string;
  deal?: { id: string; name: string } | null;
  site?: { id: string; name: string } | null;
  contact?: { id: string; first_name: string; last_name: string } | null;
  assigned_to_profile?: { first_name: string; last_name: string } | null;
  currency?: { id: string; code: string; symbol: string } | null;
}

interface QuoteVersion {
  id: string;
  version_number: number;
  version_name: string;
  is_primary: boolean;
  total_amount: number;
  margin_percentage: number;
  notes: string | null;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  sent: 'bg-blue-500/10 text-blue-500',
  approved: 'bg-green-500/10 text-green-500',
  rejected: 'bg-destructive/10 text-destructive',
  expired: 'bg-orange-500/10 text-orange-500',
};

export default function QuoteDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentTenant } = useTenant();
  const { formatCurrency } = useCurrency();
  const { user } = useAuth();

  const [quote, setQuote] = useState<Quote | null>(null);
  const [versions, setVersions] = useState<QuoteVersion[]>([]);
  const [activeVersion, setActiveVersion] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const fetchQuote = async () => {
    if (!id || !currentTenant?.id) return;

    setLoading(true);
    try {
      const { data: quoteData, error: quoteError } = await supabase
        .from('quotes')
        .select(`
          *,
          deal:deals(id, name),
          site:sites(id, name),
          contact:contacts(id, first_name, last_name),
          assigned_to_profile:profiles!quotes_assigned_to_fkey(first_name, last_name),
          currency:currencies(id, code, symbol)
        `)
        .eq('id', id)
        .eq('tenant_id', currentTenant.id)
        .is('deleted_at', null)
        .single();

      if (quoteError) throw quoteError;
      setQuote(quoteData);

      // Fetch versions
      const { data: versionsData, error: versionsError } = await supabase
        .from('quote_versions')
        .select('*')
        .eq('quote_id', id)
        .order('version_number');

      if (versionsError) throw versionsError;
      setVersions(versionsData || []);

      // Set active version to primary or first
      const primaryVersion = versionsData?.find((v) => v.is_primary);
      setActiveVersion(primaryVersion?.id || versionsData?.[0]?.id || null);
    } catch (error) {
      console.error('Error fetching quote:', error);
      toast.error('Failed to load quote');
      navigate('/quotes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuote();
  }, [id, currentTenant?.id]);

  const handleAddVersion = async () => {
    if (!quote || !currentTenant?.id || !user?.id) return;

    try {
      const newVersionNumber = versions.length + 1;
      const { data, error } = await supabase
        .from('quote_versions')
        .insert({
          tenant_id: currentTenant.id,
          quote_id: quote.id,
          version_number: newVersionNumber,
          version_name: `Version ${newVersionNumber}`,
          is_primary: false,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      setVersions([...versions, data]);
      setActiveVersion(data.id);
      toast.success('New version created');
    } catch (error) {
      console.error('Error creating version:', error);
      toast.error('Failed to create version');
    }
  };

  const handleSetPrimary = async (versionId: string) => {
    if (!quote) return;

    try {
      // First, unset all as primary
      await supabase
        .from('quote_versions')
        .update({ is_primary: false })
        .eq('quote_id', quote.id);

      // Set the selected one as primary
      const { error } = await supabase
        .from('quote_versions')
        .update({ is_primary: true })
        .eq('id', versionId);

      if (error) throw error;

      setVersions(
        versions.map((v) => ({
          ...v,
          is_primary: v.id === versionId,
        }))
      );
      toast.success('Primary version updated');
    } catch (error) {
      console.error('Error setting primary version:', error);
      toast.error('Failed to update primary version');
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!quote) return;

    try {
      const { error } = await supabase
        .from('quotes')
        .update({ status: newStatus })
        .eq('id', quote.id);

      if (error) throw error;

      setQuote({ ...quote, status: newStatus });
      toast.success(`Quote marked as ${newStatus}`);
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async () => {
    if (!quote) return;

    try {
      const { error } = await supabase
        .from('quotes')
        .update({ deleted_at: new Date().toISOString(), deleted_by: user?.id })
        .eq('id', quote.id);

      if (error) throw error;

      toast.success('Quote deleted');
      navigate('/quotes');
    } catch (error) {
      console.error('Error deleting quote:', error);
      toast.error('Failed to delete quote');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="container mx-auto py-6 text-center">
        <p className="text-muted-foreground">Quote not found</p>
        <Button onClick={() => navigate('/quotes')} className="mt-4">
          Back to Quotes
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/quotes')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">{quote.name}</h1>
              <Badge className={STATUS_COLORS[quote.status]}>
                {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
              </Badge>
            </div>
            {quote.reference_number && (
              <p className="text-muted-foreground mt-1">{quote.reference_number}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {quote.status === 'draft' && (
            <Button onClick={() => handleStatusChange('sent')}>
              <Send className="h-4 w-4 mr-2" />
              Mark as Sent
            </Button>
          )}
          {quote.status === 'sent' && (
            <>
              <Button
                variant="outline"
                onClick={() => handleStatusChange('rejected')}
              >
                Rejected
              </Button>
              <Button onClick={() => handleStatusChange('approved')}>
                <Check className="h-4 w-4 mr-2" />
                Approved
              </Button>
            </>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleStatusChange('draft')}>
                Set as Draft
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Quote
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Quote Info */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Building2 className="h-4 w-4" />
              <span className="text-sm">Deal</span>
            </div>
            <p className="font-medium">{quote.deal?.name || 'Not linked'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <MapPin className="h-4 w-4" />
              <span className="text-sm">Site</span>
            </div>
            <p className="font-medium">{quote.site?.name || 'Not linked'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Contact className="h-4 w-4" />
              <span className="text-sm">Contact</span>
            </div>
            <p className="font-medium">
              {quote.contact
                ? `${quote.contact.first_name} ${quote.contact.last_name}`
                : 'Not linked'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-muted-foreground text-sm mb-1">Total Amount</div>
            <p className="text-2xl font-bold">
              {formatCurrency(quote.total_amount || 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Versions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Quote Versions</CardTitle>
          <Button variant="outline" size="sm" onClick={handleAddVersion}>
            <Plus className="h-4 w-4 mr-2" />
            Add Version
          </Button>
        </CardHeader>
        <CardContent>
          <Tabs value={activeVersion || ''} onValueChange={setActiveVersion}>
            <TabsList className="mb-4">
              {versions.map((version) => (
                <TabsTrigger
                  key={version.id}
                  value={version.id}
                  className="flex items-center gap-2"
                >
                  {version.version_name}
                  {version.is_primary && (
                    <Badge variant="secondary" className="text-xs">
                      Primary
                    </Badge>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>

            {versions.map((version) => (
              <TabsContent key={version.id} value={version.id}>
                <QuoteVersionEditor
                  quoteId={quote.id}
                  version={version}
                  currencySymbol={quote.currency?.symbol || '$'}
                  onSetPrimary={() => handleSetPrimary(version.id)}
                  onRefresh={fetchQuote}
                />
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Quote</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this quote? This action can be undone from
              the recycle bin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
