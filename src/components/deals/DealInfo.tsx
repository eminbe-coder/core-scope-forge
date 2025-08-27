import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Calendar, Building, MapPin, User, Percent } from 'lucide-react';

interface Deal {
  id: string;
  name: string;
  description?: string;
  value?: number;
  status: string;
  probability?: number;
  expected_close_date?: string;
  notes?: string;
  customers?: {
    name: string;
  };
  sites?: {
    name: string;
  };
  currencies?: {
    symbol: string;
  };
  created_at: string;
  updated_at: string;
}

interface DealInfoProps {
  deal: Deal;
  onUpdate: () => void;
}

const statusColors = {
  lead: 'bg-gray-500',
  qualified: 'bg-blue-500',
  proposal: 'bg-yellow-500',
  negotiation: 'bg-orange-500',
  won: 'bg-green-500',
  lost: 'bg-red-500',
};

export const DealInfo = ({ deal }: DealInfoProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Deal Details</CardTitle>
          <CardDescription>Basic information about this deal</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Status</span>
              <Badge className={`text-white ${statusColors[deal.status as keyof typeof statusColors] || 'bg-gray-500'}`}>
                {deal.status}
              </Badge>
            </div>
            
            {deal.value && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Value
                </span>
                <span className="font-semibold">
                  {deal.currencies?.symbol || '$'}{deal.value.toLocaleString()}
                </span>
              </div>
            )}
            
            {deal.probability !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium flex items-center gap-2">
                  <Percent className="h-4 w-4" />
                  Probability
                </span>
                <span>{deal.probability}%</span>
              </div>
            )}
            
            {deal.expected_close_date && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Expected Close
                </span>
                <span>{new Date(deal.expected_close_date).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Related Information</CardTitle>
          <CardDescription>Customer and site details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {deal.customers && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium flex items-center gap-2">
                <Building className="h-4 w-4" />
                Customer
              </span>
              <span>{deal.customers.name}</span>
            </div>
          )}
          
          {deal.sites && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Site
              </span>
              <span>{deal.sites.name}</span>
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Created
            </span>
            <span>{new Date(deal.created_at).toLocaleDateString()}</span>
          </div>
        </CardContent>
      </Card>

      {deal.description && (
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{deal.description}</p>
          </CardContent>
        </Card>
      )}

      {deal.notes && (
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{deal.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};