import { useState, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  User, 
  Mail, 
  Camera,
  Upload,
  Edit
} from "lucide-react";
import { type Client } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface EditClientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client | null;
}

export default function EditClientModal({ open, onOpenChange, client }: EditClientModalProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    avatar: "",
    notes: "",
    avatarFile: null as File | null,
  });
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (client && open) {
      setFormData({
        name: client.name || "",
        email: client.email || "",
        avatar: client.avatar || "",
        notes: client.notes || "",
        avatarFile: null,
      });
    }
  }, [client, open]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // Create a preview URL for immediate display
      const previewUrl = URL.createObjectURL(file);
      setFormData(prev => ({ ...prev, avatar: previewUrl }));
      
      // Store the file for later upload
      setFormData(prev => ({ ...prev, avatarFile: file }));
      setIsUploading(false);
    } catch (error) {
      console.error("Failed to process image:", error);
      setIsUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setFormData(prev => ({ ...prev, avatar: "", avatarFile: null }));
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.email) {
      toast({
        title: "Validation Error",
        description: "Please fill in both name and email fields",
        variant: "destructive",
      });
      return;
    }

    if (!client?.id) {
      toast({
        title: "Error",
        description: "No client selected for editing",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // First, update the client basic info
      const updateData = {
        name: formData.name,
        email: formData.email,
        notes: formData.notes,
      };

      const response = await fetch(`/api/clients/${client.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        // If there's a new avatar file, upload it
        if (formData.avatarFile) {
          console.log("Uploading new avatar for client:", client.id);
          const avatarFormData = new FormData();
          avatarFormData.append('avatar', formData.avatarFile);
          
          const avatarResponse = await fetch(`/api/clients/${client.id}/avatar`, {
            method: "POST",
            body: avatarFormData,
          });
          
          if (!avatarResponse.ok) {
            console.warn("Failed to upload avatar, but client was updated");
          }
        }

        onOpenChange(false);
        queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
        toast({
          title: "Success!",
          description: "Client updated successfully",
        });
      } else {
        const errorData = await response.text();
        console.error("Server error:", errorData);
        toast({
          title: "Error",
          description: `Failed to update client: ${response.status} ${response.statusText}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Network error:", error);
      toast({
        title: "Error",
        description: "Network error occurred while updating client",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-slate-900 border-white/20">
        <DialogHeader>
          <DialogTitle className="text-white text-xl flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Edit Client
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Update client information
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Profile Picture */}
          <div>
            <Label className="text-white flex items-center gap-2 mb-3">
              <Camera className="h-4 w-4" />
              Profile Picture
            </Label>
            <div className="flex items-center gap-4">
              <div className="relative">
                {formData.avatar ? (
                  <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-white/20">
                    <img 
                      src={formData.avatar} 
                      alt="Client avatar" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white text-2xl font-semibold">
                    {formData.name ? formData.name.charAt(0).toUpperCase() : <User className="h-8 w-8" />}
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {isUploading ? "Uploading..." : "Upload Photo"}
                </Button>
                {formData.avatar && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveImage}
                    className="text-slate-400 hover:text-white"
                  >
                    Remove
                  </Button>
                )}
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>

          <div>
            <Label htmlFor="edit-name" className="text-white flex items-center gap-2">
              <User className="h-4 w-4" />
              Name *
            </Label>
            <Input
              id="edit-name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Client name"
              className="bg-white/5 border-white/20 text-white placeholder:text-slate-400"
            />
          </div>

          <div>
            <Label htmlFor="edit-email" className="text-white flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email *
            </Label>
            <Input
              id="edit-email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="client@example.com"
              className="bg-white/5 border-white/20 text-white placeholder:text-slate-400"
            />
          </div>

          <div>
            <Label htmlFor="edit-notes" className="text-white">
              Additional Notes
            </Label>
            <Textarea
              id="edit-notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Any additional information about this client"
              className="bg-white/5 border-white/20 text-white placeholder:text-slate-400"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-6 border-t border-white/20">
          <Button
            onClick={() => onOpenChange(false)}
            variant="ghost"
            className="text-slate-400 hover:text-white"
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
          >
            {isSubmitting ? "Updating..." : "Update Client"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}