import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Camera, Upload, X, User, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProfilePictureUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentAvatar?: string;
  userName: string;
  onAvatarUpdate: (avatarUrl: string) => void;
}

export function ProfilePictureUpload({
  open,
  onOpenChange,
  currentAvatar,
  userName,
  onAvatarUpdate
}: ProfilePictureUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Get user initials for fallback
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    console.log('File selected:', file);
    
    if (file) {
      console.log('File details:', {
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: file.lastModified
      });
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        console.error('Invalid file type:', file.type);
        toast({
          title: "Invalid file type",
          description: "Please select an image file (JPG, PNG, GIF, etc.)",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        console.error('File too large:', file.size);
        toast({
          title: "File too large",
          description: "Please select an image smaller than 5MB",
          variant: "destructive",
        });
        return;
      }

      console.log('File validation passed, setting selected file');
      setSelectedFile(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
        console.log('Preview URL created');
      };
      reader.readAsDataURL(file);
    } else {
      console.log('No file selected');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      console.error('No file selected');
      return;
    }

    console.log('Starting upload for file:', selectedFile.name, selectedFile.type, selectedFile.size);
    setUploading(true);
    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('avatar', selectedFile);
      
      console.log('FormData created, making request to /api/users/1/avatar');

      // Upload to server
      const response = await fetch('/api/users/1/avatar', { // TODO: Get userId from auth context
        method: 'POST',
        body: formData,
      });
      
      console.log('Response received:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Upload failed with status:', response.status, 'Response:', errorText);
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { error: errorText || 'Upload failed' };
        }
        throw new Error(errorData.error || `Upload failed with status ${response.status}`);
      }

      const result = await response.json();
      console.log('Upload successful:', result);
      
      onAvatarUpdate(result.avatarUrl);
      
      toast({
        title: "Profile picture updated",
        description: "Your profile picture has been successfully updated",
      });

      // Reset state and close modal
      setSelectedFile(null);
      setPreviewUrl(null);
      onOpenChange(false);
    } catch (error) {
      console.error('Avatar upload error:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload profile picture. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAvatar = () => {
    onAvatarUpdate('');
    toast({
      title: "Profile picture removed",
      description: "Your profile picture has been removed",
    });
    onOpenChange(false);
  };

  const resetSelection = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-slate-900 border-white/20">
        <DialogHeader>
          <DialogTitle className="text-white text-lg flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            Update Profile Picture
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Current/Preview Avatar */}
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <Avatar className="w-24 h-24 border-2 border-white/20">
                <AvatarImage 
                  src={previewUrl || currentAvatar} 
                  alt={userName}
                  className="object-cover"
                />
                <AvatarFallback className="bg-primary/20 text-primary text-lg font-medium">
                  {getInitials(userName)}
                </AvatarFallback>
              </Avatar>
              
              {/* File size indicator */}
              {selectedFile && (
                <Badge 
                  variant="outline" 
                  className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 text-xs border-primary/30 text-primary"
                >
                  {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
                </Badge>
              )}
            </div>

            <div className="text-center">
              <p className="text-white font-medium">{userName}</p>
              <p className="text-slate-400 text-sm">
                {selectedFile ? 'New picture selected' : 'Current profile picture'}
              </p>
            </div>
          </div>

          {/* Upload Options */}
          <div className="space-y-3">
            {/* File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* Upload Button */}
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              className="w-full border-white/20 text-white hover:bg-white/10"
              disabled={uploading}
            >
              <Upload className="h-4 w-4 mr-2" />
              {selectedFile ? 'Choose Different Picture' : 'Choose Picture'}
            </Button>

            {/* Preview Actions */}
            {selectedFile && (
              <div className="flex gap-2">
                <Button
                  onClick={resetSelection}
                  variant="ghost"
                  className="flex-1 text-slate-400 hover:text-white"
                  disabled={uploading}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  onClick={handleUpload}
                  className="flex-1 bg-primary hover:bg-primary/90"
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Save Picture
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Remove Avatar Option */}
            {currentAvatar && !selectedFile && (
              <Button
                onClick={handleRemoveAvatar}
                variant="ghost"
                className="w-full text-red-400 hover:text-red-300 hover:bg-red-500/10"
                disabled={uploading}
              >
                <X className="h-4 w-4 mr-2" />
                Remove Picture
              </Button>
            )}
          </div>

          {/* Upload Guidelines */}
          <div className="bg-slate-800/50 rounded-lg p-3 space-y-2">
            <p className="text-slate-300 text-sm font-medium">Guidelines:</p>
            <ul className="text-slate-400 text-xs space-y-1">
              <li>• Supported formats: JPG, PNG, GIF</li>
              <li>• Maximum file size: 5MB</li>
              <li>• Recommended: Square images work best</li>
              <li>• Minimum resolution: 100x100 pixels</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}