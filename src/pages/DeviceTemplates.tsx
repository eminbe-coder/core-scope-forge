import React, { useEffect, useState } from 'react';
import { Plus, Download, Search, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DeviceTemplatesManager } from '@/components/settings/DeviceTemplatesManager';
import { TemplateImportDialog } from '@/components/templates/TemplateImportDialog';

interface DeviceTemplate {
  id: string;
  name: string;
  category: string;
  description?: string;
  properties_schema: any;
  is_global: boolean;
  tenant_id?: string;
  created_by?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  // Import tracking fields
  source_template_id?: string;
  import_status: string;
  imported_at?: string;
  last_synced_at?: string;
  sync_version: number;
}

interface ImportLog {
  id: string;
  action_type: string;
  status: string;
  devices_imported: number;
  devices_skipped: number;
  created_at: string;
  notes?: string;
}

export default function DeviceTemplates() {
  const { currentTenant, isSuperAdmin } = useTenant();
  const { toast } = useToast();
  const [globalTemplates, setGlobalTemplates] = useState<DeviceTemplate[]>([]);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isImportHistoryOpen, setIsImportHistoryOpen] = useState(false);
  const [importLogs, setImportLogs] = useState<ImportLog[]>([]);
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadGlobalTemplates();
    loadImportLogs();
  }, []);

  const loadImportLogs = async () => {
    if (!currentTenant) return;
    
    try {
      const { data, error } = await supabase
        .from('template_import_logs')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      setImportLogs(data || []);
    } catch (error) {
      console.error('Error loading import logs:', error);
    }
  };

  const loadGlobalTemplates = async () => {
    try {
      setLoading(true);
    const { data, error } = await supabase
      .from('device_templates')
      .select('*')
      .eq('is_global', true)
      .eq('active', true)
      .is('deleted_at', null) // Fix soft delete filtering
      .order('name');
      
      if (error) throw error;
      setGlobalTemplates(data || []);
    } catch (error) {
      console.error('Error loading global templates:', error);
      toast({
        title: "Error",
        description: "Failed to load global templates",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImportComplete = () => {
    loadImportLogs();
    // Refresh templates in DeviceTemplatesManager
    window.location.reload(); // Simple approach - in production you'd use proper state management
  };

  const toggleTemplateSelection = (templateId: string) => {
    setSelectedTemplates(prev => 
      prev.includes(templateId) 
        ? prev.filter(id => id !== templateId)
        : [...prev, templateId]
    );
  };

  const filteredGlobalTemplates = globalTemplates.filter(template =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Device Templates</h1>
            <p className="text-muted-foreground">
               {isSuperAdmin ? 'Global template import center and tenant management' : 'Import global templates and manage your templates'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setIsImportDialogOpen(true)}>
              <Download className="mr-2 h-4 w-4" />
              Import Templates
            </Button>
            <Button variant="outline" onClick={() => setIsImportHistoryOpen(true)}>
              <History className="mr-2 h-4 w-4" />
              Import History
            </Button>
          </div>
        </div>

        <DeviceTemplatesManager />

        <TemplateImportDialog 
          open={isImportDialogOpen} 
          onOpenChange={setIsImportDialogOpen}
          onImportComplete={handleImportComplete}
        />

        {/* Import History Dialog */}
        <Dialog open={isImportHistoryOpen} onOpenChange={setIsImportHistoryOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Template Import History</DialogTitle>
              <DialogDescription>
                View history of template and device imports
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {importLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No import history found
                </div>
              ) : (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Devices Imported</TableHead>
                        <TableHead>Devices Skipped</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            {new Date(log.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{log.action_type}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={log.status === 'success' ? 'default' : log.status === 'partial' ? 'secondary' : 'destructive'}>
                              {log.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{log.devices_imported}</TableCell>
                          <TableCell>{log.devices_skipped}</TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                            {log.notes || 'N/A'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              
              <div className="flex justify-end">
                <Button onClick={() => setIsImportHistoryOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}