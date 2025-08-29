import { useState } from 'react';
import { Download, FileText, FileSpreadsheet, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { useAuth } from '@/hooks/use-auth';

interface ReportExportProps {
  reportId?: string;
  reportName: string;
  data: any[];
  fields: string[];
}

export function ReportExport({ reportId, reportName, data, fields }: ReportExportProps) {
  const { toast } = useToast();
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const [exporting, setExporting] = useState(false);
  const [schedulingEnabled, setSchedulingEnabled] = useState(false);
  const [scheduleType, setScheduleType] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [emailRecipients, setEmailRecipients] = useState('');
  const [scheduleName, setScheduleName] = useState('');

  const exportToCSV = () => {
    if (data.length === 0 || fields.length === 0) {
      toast({
        title: 'Error',
        description: 'No data available to export',
        variant: 'destructive',
      });
      return;
    }

    const headers = fields.map(field => field.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' '));

    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        fields.map(field => {
          const value = row[field];
          if (value === null || value === undefined) return '';
          if (typeof value === 'string' && value.includes(',')) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return String(value);
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${reportName}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: 'Success',
      description: 'Report exported as CSV successfully',
    });
  };

  const exportToPDF = async () => {
    if (!reportId) {
      toast({
        title: 'Error',
        description: 'Report must be saved before exporting to PDF',
        variant: 'destructive',
      });
      return;
    }

    setExporting(true);
    try {
      const { data: exportData, error } = await supabase.functions.invoke('export-report-pdf', {
        body: {
          reportId,
          data,
          fields,
          reportName,
        },
      });

      if (error) throw error;

      // The edge function will return a presigned URL or file path
      if (exportData?.downloadUrl) {
        window.open(exportData.downloadUrl, '_blank');
      }

      toast({
        title: 'Success',
        description: 'PDF export started. You will receive a download link shortly.',
      });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast({
        title: 'Error',
        description: 'Failed to export PDF',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  const createScheduledReport = async () => {
    if (!reportId || !scheduleName || !emailRecipients) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields for scheduling',
        variant: 'destructive',
      });
      return;
    }

    const recipients = emailRecipients.split(',').map(email => email.trim()).filter(Boolean);
    if (recipients.length === 0) {
      toast({
        title: 'Error',
        description: 'Please provide at least one email recipient',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('scheduled_reports')
        .insert({
          tenant_id: currentTenant?.id,
          report_id: reportId,
          user_id: user?.id,
          name: scheduleName,
          schedule_type: scheduleType,
          email_recipients: recipients,
          schedule_config: {
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Scheduled report created successfully',
      });

      // Reset form
      setScheduleName('');
      setEmailRecipients('');
      setSchedulingEnabled(false);
    } catch (error) {
      console.error('Error creating scheduled report:', error);
      toast({
        title: 'Error',
        description: 'Failed to create scheduled report',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Export & Scheduling
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-sm font-medium mb-2 block">Export Options</Label>
          <div className="flex gap-2">
            <Button onClick={exportToCSV} variant="outline" size="sm">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button 
              onClick={exportToPDF} 
              variant="outline" 
              size="sm"
              disabled={exporting || !reportId}
            >
              <FileText className="h-4 w-4 mr-2" />
              {exporting ? 'Exporting...' : 'Export PDF'}
            </Button>
          </div>
          {!reportId && (
            <p className="text-xs text-muted-foreground mt-1">
              Save the report first to enable PDF export
            </p>
          )}
        </div>

        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-4">
            <Label className="text-sm font-medium">Schedule Reports</Label>
            <Switch
              checked={schedulingEnabled}
              onCheckedChange={setSchedulingEnabled}
            />
          </div>

          {schedulingEnabled && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="scheduleName">Schedule Name</Label>
                <Input
                  id="scheduleName"
                  value={scheduleName}
                  onChange={(e) => setScheduleName(e.target.value)}
                  placeholder="e.g., Weekly Sales Report"
                />
              </div>

              <div>
                <Label htmlFor="scheduleType">Frequency</Label>
                <Select value={scheduleType} onValueChange={(value: any) => setScheduleType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="emailRecipients">Email Recipients</Label>
                <Textarea
                  id="emailRecipients"
                  value={emailRecipients}
                  onChange={(e) => setEmailRecipients(e.target.value)}
                  placeholder="email1@company.com, email2@company.com"
                  rows={2}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Separate multiple emails with commas
                </p>
              </div>

              <Button onClick={createScheduledReport} disabled={!reportId}>
                <Mail className="h-4 w-4 mr-2" />
                Create Schedule
              </Button>
              
              {!reportId && (
                <p className="text-xs text-muted-foreground">
                  Save the report first to enable scheduling
                </p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}