import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  X, 
  Upload, 
  Image as ImageIcon, 
  Link as LinkIcon,
  FileText,
  Loader2,
  Camera,
  Plus
} from "lucide-react";

interface DesignUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (design: {
    title: string;
    description?: string;
    type: string;
    imageUrl: string;
    originalUrl?: string;
  }) => void;
  projectId: number;
}

export default function DesignUploadModal({ 
  isOpen, 
  onClose, 
  onUpload, 
  projectId 
}: DesignUploadModalProps) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "figma",
    imageUrl: "",
    originalUrl: ""
  });
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [previewImage, setPreviewImage] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.imageUrl.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide a title and image URL",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    try {
      // In a real implementation, this would upload to your backend
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate upload
      
      onUpload({
        title: formData.title,
        description: formData.description || undefined,
        type: formData.type,
        imageUrl: formData.imageUrl,
        originalUrl: formData.originalUrl || undefined
      });

      toast({
        title: "Design uploaded successfully",
        description: "Your design has been added to the project"
      });

      // Reset form
      setFormData({
        title: "",
        description: "",
        type: "figma",
        imageUrl: "",
        originalUrl: ""
      });
      setPreviewImage("");
      
      onClose();
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to upload design. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
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
      if (file.type.startsWith('image/')) {
        handleFileUpload(file);
      } else {
        toast({
          title: "Invalid file type",
          description: "Please upload an image file (PNG, JPG, WebP)",
          variant: "destructive"
        });
      }
    }
  };

  const handleFileUpload = (file: File) => {
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 10MB",
        variant: "destructive"
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setPreviewImage(result);
      setFormData(prev => ({ ...prev, imageUrl: result }));
    };
    reader.readAsDataURL(file);

    toast({
      title: "Image uploaded",
      description: "Your design image has been loaded successfully"
    });
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
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
            <h2 className="text-2xl font-bold text-white mb-1">Upload Design</h2>
            <p className="text-slate-400">Add a new funnel or website design to your project</p>
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
          {/* Design Type */}
          <div className="space-y-2">
            <Label htmlFor="type" className="text-white">Design Type</Label>
            <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="glass-dark border-white/10">
                <SelectItem value="figma">Figma Design</SelectItem>
                <SelectItem value="funnel">Funnel Design</SelectItem>
                <SelectItem value="website">Website Design</SelectItem>
                <SelectItem value="wireframe">Wireframe</SelectItem>
                <SelectItem value="mockup">Mockup</SelectItem>
                <SelectItem value="prototype">Prototype</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-white">Design Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Funnel design, landing page, upsell etc."
              className="bg-white/5 border-white/10 text-white placeholder-slate-400"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-white">Description (Optional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="e.g., Landing page for product launch, mobile-optimized checkout flow..."
              className="bg-white/5 border-white/10 text-white placeholder-slate-400 resize-none"
              rows={3}
            />
          </div>

          {/* Image Upload Area */}
          <div className="space-y-2">
            <Label className="text-white">Design Image</Label>
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
              {previewImage || formData.imageUrl ? (
                <div className="space-y-4">
                  <div className="relative">
                    <img 
                      src={previewImage || formData.imageUrl} 
                      alt="Design preview" 
                      className="w-full h-48 object-cover rounded-lg"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        target.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                    <div className="hidden text-center text-slate-400 py-20">
                      <ImageIcon className="h-12 w-12 mx-auto mb-2" />
                      <p>Failed to load image</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setPreviewImage("");
                        setFormData(prev => ({ ...prev, imageUrl: "" }));
                      }}
                      className="absolute top-2 right-2 bg-black/50 text-white hover:bg-black/70"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex justify-center">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleFileSelect}
                      className="bg-white/5 border-white/20 text-white hover:bg-white/10"
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Change Image
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <div className="flex justify-center items-center space-x-4 mb-4">
                    <Upload className="h-8 w-8 text-slate-400" />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleFileSelect}
                      className="bg-gradient-to-r from-primary/20 to-primary/10 border-primary/30 text-primary hover:bg-primary/20 hover:border-primary/50"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Choose Image
                    </Button>
                  </div>
                  <p className="text-slate-300 mb-2">Drag & drop your design image here or click to upload</p>
                  <p className="text-slate-500 text-sm mb-4">Supports PNG, JPG, WebP images up to 10MB</p>
                  
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-600"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="bg-slate-900 px-2 text-slate-400">or paste URL</span>
                    </div>
                  </div>
                  
                  <Input
                    value={formData.imageUrl}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, imageUrl: e.target.value }));
                      setPreviewImage("");
                    }}
                    placeholder="https://your-image-url.com/design.png"
                    className="mt-4 bg-white/5 border-white/10 text-white placeholder-slate-400"
                  />
                  <div className="mt-3 text-xs text-slate-500">
                    💡 Tip: Use services like Imgur, Cloudinary, or your file hosting for image URLs
                  </div>
                </div>
              )}
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>

          {/* Original URL (for Figma links, etc.) */}
          <div className="space-y-2">
            <Label htmlFor="originalUrl" className="text-white">Original Design URL (Optional)</Label>
            <div className="relative">
              <LinkIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                id="originalUrl"
                value={formData.originalUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, originalUrl: e.target.value }))}
                placeholder="https://figma.com/design/... or https://your-prototype-url.com"
                className="pl-10 bg-white/5 border-white/10 text-white placeholder-slate-400"
              />
              <p className="text-xs text-slate-500 mt-1">
                Link to Figma file, prototype, or original design source
              </p>
            </div>
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
              disabled={isUploading || !formData.title.trim() || !formData.imageUrl.trim()}
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
                  Upload Design
                </>
              )}
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}