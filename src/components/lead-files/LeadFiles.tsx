import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Upload, Download, Trash2, FileText, Image, File } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { DeleteConfirmationModal } from '@/components/modals/DeleteConfirmationModal';

interface LeadFile {
  id: string;
  name: string;
  file_path: string;
  mime_type: string;
  file_size: number;
  notes?: string;
  created_at: string;
  created_by: string;
}

interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
}

interface LeadFilesProps {
  leadId: string;
  leadType: 'contact' | 'company' | 'site';
  leadName: string;
}

export const LeadFiles = ({ leadId, leadType, leadName }: LeadFilesProps) => {
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [files, setFiles] = useState<LeadFile[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [notes, setNotes] = useState('');
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; file: LeadFile | null }>({
    open: false,
    file: null,
  });

  const fetchFiles = async () => {
    if (!currentTenant || !leadId) return;

    try {
      setLoading(true);
      
      // Fetch files
      const { data: filesData, error: filesError } = await supabase
        .from('lead_files')
        .select('*')
        .eq('entity_id', leadId)
        .eq('entity_type', leadType)
        .eq('tenant_id', currentTenant.id)
        .order('created_at', { ascending: false });

      if (filesError) throw filesError;

      // Fetch user profiles
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name');

      if (usersError) throw usersError;

      setFiles(filesData || []);
      setUsers(usersData || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [leadId, leadType, currentTenant]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !currentTenant || !user) return;

    setUploading(true);
    try {
      // Generate unique file path
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${leadType}_${leadId}_${Date.now()}.${fileExt}`;
      const filePath = `${currentTenant.id}/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('lead-files')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      // Save file record
      const { error: dbError } = await supabase
        .from('lead_files')
        .insert({
          entity_id: leadId,
          entity_type: leadType,
          name: selectedFile.name,
          file_path: filePath,
          mime_type: selectedFile.type,
          file_size: selectedFile.size,
          notes: notes.trim() || null,
          created_by: user.id,
          tenant_id: currentTenant.id,
        });

      if (dbError) throw dbError;

      // Log activity
      await supabase
        .from('activity_logs')
        .insert({
          entity_id: leadId,
          entity_type: leadType,
          activity_type: 'file_upload',
          title: 'File Uploaded',
          description: `Uploaded file: ${selectedFile.name}`,
          created_by: user.id,
          tenant_id: currentTenant.id,
        });

      toast({
        title: 'Success',
        description: 'File uploaded successfully',
      });

      // Reset form
      setSelectedFile(null);
      setNotes('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Refresh files
      await fetchFiles();
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

  const handleDownload = async (file: LeadFile) => {
    try {
      const { data, error } = await supabase.storage
        .from('lead-files')
        .download(file.file_path);

      if (error) throw error;

      // Create download link
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
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = (file: LeadFile) => {
    setDeleteModal({ open: true, file });
  };

  const confirmDelete = async () => {
    if (!deleteModal.file || !user) return;

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('lead-files')
        .remove([deleteModal.file.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('lead_files')
        .delete()
        .eq('id', deleteModal.file.id);

      if (dbError) throw dbError;

      // Log activity
      await supabase
        .from('activity_logs')
        .insert({
          entity_id: leadId,
          entity_type: leadType,
          activity_type: 'file_delete',
          title: 'File Deleted',
          description: `Deleted file: ${deleteModal.file.name}`,
          created_by: user.id,
          tenant_id: currentTenant?.id,
        });

      toast({
        title: 'Success',
        description: 'File deleted successfully',
      });

      setDeleteModal({ open: false, file: null });
      await fetchFiles();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return Image;
    if (mimeType.includes('pdf') || mimeType.includes('document')) return FileText;
    return File;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Upload File</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              className="cursor-pointer"
            />
          </div>
          
          {selectedFile && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium">Selected file:</p>
                <p className="text-sm text-muted-foreground">
                  {selectedFile.name} ({formatFileSize(selectedFile.size)})
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium">Notes (optional)</label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any notes about this file..."
                  rows={3}
                />
              </div>
              
              <div className="flex gap-2">
                <Button onClick={handleUpload} disabled={uploading}>
                  <Upload className="h-4 w-4 mr-2" />
                  {uploading ? 'Uploading...' : 'Upload File'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedFile(null);
                    setNotes('');
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Files ({files.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading files...</p>
          ) : files.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No files uploaded yet. Upload your first file above.
            </p>
          ) : (
            <div className="space-y-4">
              {files.map((file) => {
                const FileIcon = getFileIcon(file.mime_type);
                const user = users.find(u => u.id === file.created_by);
                return (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <FileIcon className="h-8 w-8 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{file.name}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{formatFileSize(file.file_size)}</span>
                          <span>•</span>
                          <span>
                            by {user?.first_name} {user?.last_name}
                          </span>
                          <span>•</span>
                          <span>{new Date(file.created_at).toLocaleDateString()}</span>
                        </div>
                        {file.notes && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {file.notes}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownload(file)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(file)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <DeleteConfirmationModal
        open={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, file: null })}
        onConfirm={confirmDelete}
        title="Delete File"
        description={`Are you sure you want to delete "${deleteModal.file?.name}"? This action cannot be undone.`}
      />
    </div>
  );
};