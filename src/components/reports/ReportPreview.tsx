import { BarChart3, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useCurrency } from '@/hooks/use-currency';

interface ReportPreviewProps {
  data: any[];
  fields: string[];
  loading: boolean;
}

export function ReportPreview({ data, fields, loading }: ReportPreviewProps) {
  const { formatCurrency } = useCurrency();
  const formatValue = (value: any, field: string) => {
    if (value === null || value === undefined) return '-';
    
    if (field.includes('date') || field.includes('created_at') || field.includes('updated_at')) {
      return new Date(value).toLocaleDateString();
    }
    
    if (field === 'value' && typeof value === 'number') {
      return formatCurrency(value);
    }
    
    if (typeof value === 'boolean') {
      return value ? (
        <Badge variant="default">Yes</Badge>
      ) : (
        <Badge variant="secondary">No</Badge>
      );
    }
    
    return String(value);
  };

  const getFieldLabel = (field: string) => {
    return field.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Preview
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Loading preview...</span>
          </div>
        ) : fields.length === 0 ? (
          <div className="text-center py-8">
            <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Select fields to see a preview of your report
            </p>
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              No data found with the current query configuration
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Showing {data.length} rows (limited to first 100 for preview)
            </div>
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {fields.map((field) => (
                      <TableHead key={field} className="min-w-24">
                        {getFieldLabel(field)}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((row, index) => (
                    <TableRow key={index}>
                      {fields.map((field) => (
                        <TableCell key={field} className="max-w-48 truncate">
                          {formatValue(row[field], field)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}