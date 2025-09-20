import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ImageUploadProps {
  value?: string;
  onValueChange: (url: string | null) => void;
  bucket: string;
  folder?: string;
  accept?: string;
  maxSize?: number; // in MB
  disabled?: boolean;
  className?: string;
}

export function ImageUpload({
  value,
  onValueChange,
  bucket,
  folder = '',
  accept = 'image/*',
  maxSize = 5,
  disabled = false,
  className = ''
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    if (file.size > maxSize * 1024 * 1024) {
      toast.error(`File size must be less than ${maxSize}MB`);
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    uploadFile(file);
  };

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = folder ? `${folder}/${fileName}` : fileName;

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file);

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      onValueChange(urlData.publicUrl);
      toast.success('Image uploaded successfully');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!value) return;

    try {
      // Extract path from URL
      const url = new URL(value);
      const path = url.pathname.split('/storage/v1/object/public/' + bucket + '/')[1];
      
      if (path) {
        await supabase.storage.from(bucket).remove([path]);
      }
      
      onValueChange(null);
      toast.success('Image removed');
    } catch (error) {
      console.error('Remove error:', error);
      toast.error('Failed to remove image');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  return (
    <div className={className}>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFileSelect(e.target.files[0]);
          }
        }}
        className="hidden"
        disabled={disabled}
      />

      {value ? (
        <div className="relative">
          <img
            src={value}
            alt="Uploaded image"
            className="w-full h-48 object-cover rounded-lg border"
          />
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="absolute top-2 right-2"
            onClick={handleRemove}
            disabled={disabled}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
            transition-colors duration-200
            ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
            ${disabled ? 'cursor-not-allowed opacity-50' : 'hover:border-primary hover:bg-primary/5'}
          `}
          onClick={() => !disabled && fileInputRef.current?.click()}
        >
          <div className="flex flex-col items-center gap-3">
            {isUploading ? (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            ) : (
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
            )}
            <div>
              <p className="text-sm font-medium">
                {isUploading ? 'Uploading...' : 'Drop an image here or click to browse'}
              </p>
              <p className="text-xs text-muted-foreground">
                PNG, JPG, WEBP up to {maxSize}MB
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}