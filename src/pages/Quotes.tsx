import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FileSpreadsheet, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { useCurrency } from '@/hooks/use-currency';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { CreateQuoteForm } from '@/components/quotes/CreateQuoteForm';

interface Quote {
  id: string;
  name: string;
  reference_number: string | null;
  status: string;
  total_amount: number;
  expiry_date: string | null;
  created_at: string;
  deal?: { id: string; name: string } | null;
  site?: { id: string; name: string } | null;
  contact?: { id: string; first_name: string; last_name: string } | null;
  assigned_to_profile?: { first_name: string; last_name: string } | null;
  currency?: { code: string; symbol: string } | null;
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  sent: 'bg-blue-500/10 text-blue-500',
  approved: 'bg-green-500/10 text-green-500',
  rejected: 'bg-destructive/10 text-destructive',
  expired: 'bg-orange-500/10 text-orange-500',
};

export default function Quotes() {
  const navigate = useNavigate();
  const { currentTenant } = useTenant();
  const { formatCurrency } = useCurrency();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateForm, setShowCreateForm] = useState(false);

  const fetchQuotes = async () => {
    if (!currentTenant?.id) return;

    setLoading(true);
    try {
      let query = supabase
        .from('quotes')
        .select(`
          *,
          deal:deals(id, name),
          site:sites(id, name),
          contact:contacts(id, first_name, last_name),
          assigned_to_profile:profiles!quotes_assigned_to_fkey(first_name, last_name),
          currency:currencies(code, symbol)
        `)
        .eq('tenant_id', currentTenant.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,reference_number.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setQuotes(data || []);
    } catch (error) {
      console.error('Error fetching quotes:', error);
      toast.error('Failed to load quotes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotes();
  }, [currentTenant?.id, statusFilter, searchTerm]);

  const handleQuoteClick = (quoteId: string) => {
    navigate(`/quotes/${quoteId}`);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileSpreadsheet className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Quotes</h1>
            <p className="text-muted-foreground">Manage proposals and estimates</p>
          </div>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Quote
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search quotes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : quotes.length === 0 ? (
            <div className="text-center py-12">
              <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No quotes found</h3>
              <p className="text-muted-foreground mb-4">
                Create your first quote to get started
              </p>
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Quote
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quote</TableHead>
                  <TableHead>Deal / Site</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead>Assigned To</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotes.map((quote) => (
                  <TableRow
                    key={quote.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleQuoteClick(quote.id)}
                  >
                    <TableCell>
                      <div>
                        <div className="font-medium">{quote.name}</div>
                        {quote.reference_number && (
                          <div className="text-sm text-muted-foreground">
                            {quote.reference_number}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {quote.deal?.name || quote.site?.name || '-'}
                    </TableCell>
                    <TableCell>
                      {quote.contact
                        ? `${quote.contact.first_name} ${quote.contact.last_name}`
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[quote.status] || ''}>
                        {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(quote.total_amount || 0)}
                    </TableCell>
                    <TableCell>
                      {quote.expiry_date
                        ? format(new Date(quote.expiry_date), 'MMM d, yyyy')
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {quote.assigned_to_profile
                        ? `${quote.assigned_to_profile.first_name} ${quote.assigned_to_profile.last_name}`
                        : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CreateQuoteForm
        open={showCreateForm}
        onOpenChange={setShowCreateForm}
        onSuccess={() => {
          fetchQuotes();
          setShowCreateForm(false);
        }}
      />
    </div>
  );
}
