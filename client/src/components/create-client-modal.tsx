import { useState, useRef } from "react";
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
  Upload
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAuth as useClerkAuth } from "@clerk/clerk-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface CreateClientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateClientModal({ open, onOpenChange }: CreateClientModalProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { authUser } = useAuth();
  const { user: clerkUser } = useClerkAuth();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    avatar: "",
    notes: "",
    avatarFile: null as File | null,
  });
  const [isUploading, setIsUploading] = useState(false);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // Create a preview URL for immediate display
      const previewUrl = URL.createObjectURL(file);
      setFormData(prev => ({ ...prev, avatar: previewUrl }));
      
      // Store the file for later upload after client creation
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

    if (!authUser?.id) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to create a client",
        variant: "destructive",
      });
      return;
    }

    try {
      // First, create the client without avatar
      const clientData = {
        name: formData.name,
        email: formData.email,
        notes: formData.notes,
        clerkUserId: clerkUser?.id || 'anonymous',
        userEmail: clerkUser?.emailAddresses?.[0]?.emailAddress || authUser?.email || 'unknown@example.com',
      };
      
      console.log("Submitting client data:", clientData);
      
      const response = await apiRequest("POST", "/api/clients", clientData);

      if (response.ok) {
        const newClient = await response.json();
        console.log("Created client:", newClient);
        
        // If there's an avatar file, upload it
        if (formData.avatarFile) {
          console.log("Uploading avatar for client:", newClient.id);
          const avatarFormData = new FormData();
          avatarFormData.append('avatar', formData.avatarFile);
          
          // Get auth token for file upload
          const token = await clerkUser?.getToken();
          const headers: Record<string, string> = {};
          if (token) {
            headers["Authorization"] = `Bearer ${token}`;
          }
          
          const avatarResponse = await fetch(`/api/clients/${newClient.id}/avatar`, {
            method: "POST",
            headers,
            body: avatarFormData,
          });
          
          if (!avatarResponse.ok) {
            console.warn("Failed to upload avatar, but client was created");
          }
        }
        
        onOpenChange(false);
        // Reset form
        setFormData({
          name: "",
          email: "",
          avatar: "",
          notes: "",
          avatarFile: null,
        });
        // Invalidate and refetch clients data
        queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
        
        toast({
          title: "Success!",
          description: "Client created successfully",
        });
      } else {
        const errorData = await response.text();
        console.error("Server error:", errorData);
        toast({
          title: "Error",
          description: `Failed to create client: ${response.status} ${response.statusText}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error creating client:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      toast({
        title: "Error",
        description: `Failed to create client: ${errorMessage}`,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-slate-900 border-white/20">
        <DialogHeader>
          <DialogTitle className="text-white text-xl flex items-center gap-2">
            <User className="h-5 w-5" />
            Add New Client
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Create a new client with basic information
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
            <Label htmlFor="name" className="text-white flex items-center gap-2">
              <User className="h-4 w-4" />
              Name *
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Client name"
              className="bg-white/5 border-white/20 text-white placeholder:text-slate-400"
            />
          </div>

          <div>
            <Label htmlFor="email" className="text-white flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email *
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="client@example.com"
              className="bg-white/5 border-white/20 text-white placeholder:text-slate-400"
            />
          </div>

          <div>
            <Label htmlFor="notes" className="text-white">
              Additional Notes
            </Label>
            <Textarea
              id="notes"
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
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
          >
            Create Client
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}