import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { 
  X, 
  Upload, 
  Image as ImageIcon, 
  FileText,
  Archive,
  Code,
  Video,
  Music,
  Loader2,
  Tag,
  FolderOpen
} from "lucide-react";

interface AssetUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const assetTypeOptions = [
  { value: "image", label: "Image", icon: ImageIcon },
  { value: "document", label: "Document", icon: FileText },
  { value: "design", label: "Design", icon: Code },
  { value: "video", label: "Video", icon: Video },
  { value: "audio", label: "Audio", icon: Music },
  { value: "archive", label: "Archive", icon: Archive },
  { value: "template", label: "Template", icon: FileText },
];

const folderOptions = [
  "brand-kit",
  "website-assets", 
  "designs",
  "documents",
  "templates",
  "media",
  "other"
];

export default function AssetUploadModal({ isOpen, onClose }: AssetUploadModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    originalName: "",
    type: "image",
    mimeType: "",
    url: "",
    thumbnailUrl: "",
    folder: "other",
    tags: "",
    description: ""
  });
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.url.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide a name and asset URL",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    try {
      const assetData = {
        organizationId: 1,
        projectId: null, // Organization-wide asset
        name: formData.name,
        originalName: formData.originalName || formData.name,
        type: formData.type,
        mimeType: formData.mimeType || getMimeTypeFromUrl(formData.url),
        size: 1024000, // Placeholder - would be calculated from actual file
        url: formData.url,
        thumbnailUrl: formData.thumbnailUrl || formData.url,
        uploadedBy: 1, // Current user - would be from auth context
        folder: formData.folder,
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()) : [],
        metadata: formData.description ? { description: formData.description } : {}
      };

      const response = await fetch('/api/assets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(assetData)
      });

      if (!response.ok) {
        throw new Error('Failed to create asset');
      }

      const newAsset = await response.json();

      // Invalidate and refetch assets
      await queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      
      toast({
        title: "Asset uploaded successfully",
        description: "Your asset has been added to the library"
      });

      // Reset form
      setFormData({
        name: "",
        originalName: "",
        type: "image",
        mimeType: "",
        url: "",
        thumbnailUrl: "",
        folder: "other",
        tags: "",
        description: ""
      });
      
      onClose();
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to upload asset. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const getMimeTypeFromUrl = (url: string): string => {
    const extension = url.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      svg: 'image/svg+xml',
      webp: 'image/webp',
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      mp4: 'video/mp4',
      mov: 'video/quicktime',
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      zip: 'application/zip',
      rar: 'application/x-rar-compressed'
    };
    return mimeTypes[extension || ''] || 'application/octet-stream';
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const file = files[0];
      toast({
        title: "File received",
        description: "In a real implementation, this would upload the file and generate a URL"
      });
      // In a real implementation, you would upload the file and get the URL
      setFormData(prev => ({
        ...prev,
        name: file.name,
        originalName: file.name,
        mimeType: file.type,
        type: file.type.startsWith('image/') ? 'image' : 
              file.type.startsWith('video/') ? 'video' :
              file.type.startsWith('audio/') ? 'audio' : 'document'
      }));
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-slate-900/95 backdrop-blur-xl rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl border border-white/10 flex flex-col"
      >
        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-gradient-to-r from-slate-900 to-slate-800">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">Upload Asset</h2>
            <p className="text-slate-400">Add a new asset to your library</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-slate-400 hover:text-white hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Asset Type */}
            <div className="space-y-2">
              <Label htmlFor="type" className="text-white">Asset Type</Label>
              <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="glass-dark border-white/10">
                  {assetTypeOptions.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center">
                        <type.icon className="h-4 w-4 mr-2" />
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Asset Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-white">Asset Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., company-logo.svg, hero-image.jpg..."
                className="bg-white/5 border-white/10 text-white placeholder-slate-400"
                required
              />
            </div>

            {/* Folder */}
            <div className="space-y-2">
              <Label className="text-white flex items-center">
                <FolderOpen className="h-4 w-4 mr-2" />
                Folder
              </Label>
              <Select value={formData.folder} onValueChange={(value) => setFormData(prev => ({ ...prev, folder: value }))}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="glass-dark border-white/10">
                  {folderOptions.map(folder => (
                    <SelectItem key={folder} value={folder}>
                      {folder.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* File Upload Area */}
            <div className="space-y-2">
              <Label className="text-white">Asset File</Label>
              <div
                className={`border-2 border-dashed rounded-lg p-6 transition-colors ${
                  dragActive 
                    ? 'border-primary bg-primary/10' 
                    : 'border-white/20 hover:border-white/30'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <div className="text-center">
                  <Upload className="h-8 w-8 text-slate-400 mx-auto mb-3" />
                  <p className="text-slate-300 mb-2">Drag & drop your file here</p>
                  <p className="text-slate-500 text-sm mb-4">Or paste a file URL below:</p>
                  <Input
                    value={formData.url}
                    onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                    placeholder="https://your-asset-url.com/file.png"
                    className="bg-white/5 border-white/10 text-white placeholder-slate-400"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Thumbnail URL (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="thumbnailUrl" className="text-white">Thumbnail URL (Optional)</Label>
              <Input
                id="thumbnailUrl"
                value={formData.thumbnailUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, thumbnailUrl: e.target.value }))}
                placeholder="https://your-thumbnail-url.com/thumb.png"
                className="bg-white/5 border-white/10 text-white placeholder-slate-400"
              />
              <p className="text-xs text-slate-500">
                Leave empty to use the main file URL as thumbnail
              </p>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label htmlFor="tags" className="text-white flex items-center">
                <Tag className="h-4 w-4 mr-2" />
                Tags (comma-separated)
              </Label>
              <Input
                id="tags"
                value={formData.tags}
                onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                placeholder="e.g., logo, brand, primary, vector"
                className="bg-white/5 border-white/10 text-white placeholder-slate-400"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-white">Description (Optional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of the asset..."
                className="bg-white/5 border-white/10 text-white placeholder-slate-400 resize-none"
                rows={3}
              />
            </div>
          </form>
        </div>
        
        {/* Fixed Submit Button Bar */}
        <div className="flex-shrink-0 p-6 border-t border-white/10 bg-slate-800/50">
          <div className="flex items-center justify-end space-x-3">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="text-slate-400 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isUploading || !formData.name.trim() || !formData.url.trim()}
              className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Asset
                </>
              )}
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}