import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, UserPlus, FileText, Image } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import CreateProjectModal from "@/components/create-project-modal";
import CreateClientModal from "@/components/create-client-modal";
import DesignUploadModal from "@/components/design-upload-modal";

export default function QuickActions() {
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showCreateClient, setShowCreateClient] = useState(false);
  const [showDesignUpload, setShowDesignUpload] = useState(false);
  const { currentRole, hasPermission } = useAuth();

  const handleDesignUpload = async (design: {
    title: string;
    description?: string;
    type: string;
    imageUrl: string;
    originalUrl?: string;
  }) => {
    // Create asset from design upload
    const assetData = {
      organizationId: 1,
      projectId: null, // Organization-wide asset in designs folder
      name: design.title.toLowerCase().replace(/\s+/g, '-') + '.jpg',
      originalName: design.title,
      type: 'design',
      mimeType: 'image/jpeg',
      size: 1024000, // Placeholder size
      url: design.imageUrl,
      thumbnailUrl: design.imageUrl,
      uploadedBy: 1, // Current user - would be from auth context
      folder: 'designs',
      tags: [design.type, 'design', 'funnel'],
      metadata: {
        description: design.description || '',
        originalUrl: design.originalUrl || '',
        designType: design.type
      }
    };

    try {
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

      console.log('Design uploaded successfully and stored in assets');
    } catch (error) {
      console.error('Failed to upload design:', error);
      throw error;
    }
  };
  return (
    <Card className="glass border-white/10 p-6">
      <CardContent className="p-0">
        <h3 className="text-lg font-bold text-white mb-4">Quick Actions</h3>
        <div className="space-y-3">
          {(hasPermission("projects", "create") || currentRole === "admin") && (
            <Button 
              variant="ghost"
              onClick={() => setShowCreateProject(true)}
              className="w-full justify-start p-3 bg-white/5 hover:bg-white/10 transition-colors text-left"
            >
              <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center flex-shrink-0 mr-3">
                <Plus className="text-white h-4 w-4" />
              </div>
              <span className="text-white font-medium">Create New Project</span>
            </Button>
          )}
          
          {(hasPermission("clients", "create") || currentRole === "admin") && (
            <Button 
              variant="ghost"
              onClick={() => setShowCreateClient(true)}
              className="w-full justify-start p-3 bg-white/5 hover:bg-white/10 transition-colors text-left"
            >
              <div className="w-8 h-8 gradient-secondary rounded-lg flex items-center justify-center flex-shrink-0 mr-3">
                <UserPlus className="text-white h-4 w-4" />
              </div>
              <span className="text-white font-medium">Add New Client</span>
            </Button>
          )}

          {(hasPermission("documents", "upload") || currentRole === "admin") && (
            <Button 
              variant="ghost"
              onClick={() => setShowDesignUpload(true)}
              className="w-full justify-start p-3 bg-white/5 hover:bg-white/10 transition-colors text-left"
            >
              <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-orange-500 rounded-lg flex items-center justify-center flex-shrink-0 mr-3">
                <Image className="text-white h-4 w-4" />
              </div>
              <span className="text-white font-medium">Add Design</span>
            </Button>
          )}
          
          {(hasPermission("billing", "manage") || currentRole === "admin") && (
            <Button 
              variant="ghost"
              className="w-full justify-start p-3 bg-white/5 hover:bg-white/10 transition-colors text-left"
            >
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center flex-shrink-0 mr-3">
                <FileText className="text-white h-4 w-4" />
              </div>
              <span className="text-white font-medium">Generate Invoice</span>
            </Button>
          )}
        </div>
      </CardContent>

      {/* Modals */}
      {(hasPermission("projects", "create") || currentRole === "admin") && (
        <CreateProjectModal 
          open={showCreateProject} 
          onOpenChange={setShowCreateProject}
        />
      )}
      {(hasPermission("clients", "create") || currentRole === "admin") && (
        <CreateClientModal 
          open={showCreateClient} 
          onOpenChange={setShowCreateClient}
        />
      )}
      {(hasPermission("documents", "upload") || currentRole === "admin") && (
        <DesignUploadModal 
          isOpen={showDesignUpload} 
          onClose={() => setShowDesignUpload(false)}
          onUpload={handleDesignUpload}
          projectId={0} // 0 for organization-wide designs
        />
      )}
    </Card>
  );
}
