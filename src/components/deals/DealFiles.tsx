import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText, Upload, Download, Trash2, Plus, Calendar, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { useToast } from '@/hooks/use-toast';

interface DealFile {
  id: string;
  name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  notes?: string;
  created_at: string;
  created_by: string;
}

interface DealFilesProps {
  dealId: string;
}

export const DealFiles = ({ dealId }: DealFilesProps) => {
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const [files, setFiles] = useState<DealFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadNotes, setUploadNotes] = useState('');

  const fetchFiles = async () => {
    if (!dealId || !currentTenant) return;

    try {
      const { data, error } = await supabase
        .from('deal_files')
        .select(`
          id,
          name,
          file_path,
          file_size,
          mime_type,
          notes,
          created_at,
          created_by
        `)
        .eq('deal_id', dealId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching files:', error);
        setFiles([]);
      } else {
        setFiles(data || []);
      }
    } catch (error) {
      console.error('Error fetching files:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [dealId]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !currentTenant) return;

    setUploading(true);
    try {
      // Upload file to storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${dealId}/${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('deal-files')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      // Get current user for created_by
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get tenant_id from deal
      const { data: dealData, error: dealError } = await supabase
        .from('deals')
        .select('tenant_id')
        .eq('id', dealId)
        .single();

      if (dealError) throw dealError;

      // Create deal_files record
      const { error: dbError } = await supabase
        .from('deal_files')
        .insert({
          deal_id: dealId,
          name: selectedFile.name,
          file_path: uploadData.path,
          file_size: selectedFile.size,
          mime_type: selectedFile.type,
          notes: uploadNotes,
          created_by: user.id,
          tenant_id: dealData.tenant_id,
        });

      if (dbError) throw dbError;

      toast({
        title: 'Success',
        description: 'File uploaded successfully',
      });
      fetchFiles();
      setShowUploadModal(false);
      setSelectedFile(null);
      setUploadNotes('');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (file: DealFile) => {
    try {
      const { data, error } = await supabase.storage
        .from('deal-files')
        .download(file.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to download file',
        variant: 'destructive',
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileTypeColor = (mimeType: string) => {
    if (mimeType.includes('pdf')) return 'bg-red-500';
    if (mimeType.includes('image')) return 'bg-green-500';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'bg-blue-500';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'bg-emerald-500';
    return 'bg-gray-500';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">Loading files...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Files & Documents
            </CardTitle>
            <CardDescription>
              Upload estimates, contracts, and other deal-related files
            </CardDescription>
          </div>
          <Button onClick={() => setShowUploadModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Upload File
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {files.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No files uploaded yet</p>
            <Button onClick={() => setShowUploadModal(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Upload First File
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    <Badge className={`text-white ${getFileTypeColor(file.mime_type)}`}>
                      <FileText className="h-3 w-3" />
                    </Badge>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{file.name}</div>
                    <div className="text-sm text-muted-foreground flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(file.created_at).toLocaleDateString()}
                      </span>
                      <span>{formatFileSize(file.file_size)}</span>
                    </div>
                    {file.notes && (
                      <div className="text-xs text-muted-foreground mt-1 bg-accent/50 p-2 rounded">
                        {file.notes}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(file)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload File</DialogTitle>
            <DialogDescription>
              Add a new file to this deal with optional notes
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="file-upload">Select File</Label>
              <Input
                id="file-upload"
                type="file"
                onChange={handleFileSelect}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif"
              />
              {selectedFile && (
                <div className="mt-2 text-sm text-muted-foreground">
                  Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                </div>
              )}
            </div>
            <div>
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any notes about this file..."
                value={uploadNotes}
                onChange={(e) => setUploadNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpload} 
              disabled={!selectedFile || uploading}
            >
              {uploading ? 'Uploading...' : 'Upload File'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};