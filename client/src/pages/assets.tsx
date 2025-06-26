import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import Sidebar from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { 
  Search, 
  Upload, 
  Filter, 
  Grid3X3,
  List,
  FolderOpen,
  FileImage,
  FileText,
  Archive,
  Code,
  MoreHorizontal,
  Download,
  Edit,
  Trash2,
  Copy,
  Eye,
  Tag,
  Calendar,
  User,
  HardDrive
} from "lucide-react";
import { type Asset } from "@shared/schema";
import AssetUploadModal from "@/components/asset-upload-modal";

const assetTypeIcons = {
  image: FileImage,
  document: FileText,
  archive: Archive,
  template: Code,
  design: FileImage,
  video: FileImage,
  audio: FileImage,
};

const assetTypeColors = {
  image: "bg-green-500/20 text-green-400 border-green-500/30",
  document: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  archive: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  template: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  design: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  video: "bg-red-500/20 text-red-400 border-red-500/30",
  audio: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
};

const formatFileSize = (bytes: number): string => {
  const sizes = ['B', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
};

export default function AssetsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [folderFilter, setFolderFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const { isAdmin, isTeamMember, currentRole, authUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch assets
  const { data: assets, isLoading, error } = useQuery<Asset[]>({
    queryKey: ["/api/assets", { 
      organizationId: authUser?.organizationId || 1, 
      folder: folderFilter !== "all" ? folderFilter : undefined, 
      type: typeFilter !== "all" ? typeFilter : undefined,
      userId: currentRole === 'team_member' ? authUser?.id : undefined
    }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('organizationId', (authUser?.organizationId || 1).toString());
      
      if (folderFilter !== "all") {
        params.set('folder', folderFilter);
      }
      
      if (typeFilter !== "all") {
        params.set('type', typeFilter);
      }
      
      // For team members, filter by user ID to only show assets from accessible projects
      if (currentRole === 'team_member' && authUser?.id) {
        params.set('userId', authUser.id.toString());
      }
      
      const response = await fetch(`/api/assets?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch assets');
      }
      return response.json();
    }
  });

  // Fetch folders
  const { data: folders } = useQuery<string[]>({
    queryKey: ["/api/assets/folders/1"],
  });

  // Filter assets based on search and filters
  const filteredAssets = assets?.filter(asset => {
    const matchesSearch = asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         asset.originalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         asset.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesFolder = folderFilter === "all" || asset.folder === folderFilter;
    const matchesType = typeFilter === "all" || asset.type === typeFilter;
    
    return matchesSearch && matchesFolder && matchesType;
  }) || [];

  // Get unique asset types for filter
  const assetTypes = Array.from(new Set(assets?.map(asset => asset.type) || []));

  const handleDeleteAsset = useCallback(async (assetId: number) => {
    try {
      const response = await fetch(`/api/assets/${assetId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete asset");
      }

      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      toast({
        title: "Asset deleted",
        description: "The asset has been deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error deleting asset",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  }, [queryClient, toast]);

  const handleDownloadAsset = useCallback((asset: Asset) => {
    // In a real implementation, this would download the actual file
    window.open(asset.url, '_blank');
    toast({
      title: "Download started",
      description: `Downloading ${asset.name}`,
    });
  }, [toast]);

  const AssetCard = ({ asset, index }: { asset: Asset; index: number }) => {
    const TypeIcon = assetTypeIcons[asset.type as keyof typeof assetTypeIcons] || FileText;
    const typeColor = assetTypeColors[asset.type as keyof typeof assetTypeColors] || "bg-slate-500/20 text-slate-400 border-slate-500/30";

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
        className="glass rounded-lg p-4 hover:bg-white/10 transition-all duration-200 group"
      >
        <div className="space-y-3">
          {/* Asset Preview */}
          <div className="relative aspect-square rounded-lg overflow-hidden bg-white/5">
            {asset.thumbnailUrl ? (
              <img
                src={asset.thumbnailUrl}
                alt={asset.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <TypeIcon className="h-12 w-12 text-slate-400" />
              </div>
            )}
            
            {/* Quick Actions Overlay */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => window.open(asset.url, '_blank')}
                className="text-white hover:bg-white/20"
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDownloadAsset(asset)}
                className="text-white hover:bg-white/20"
              >
                <Download className="h-4 w-4" />
              </Button>
              {(isAdmin || isTeamMember) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-white hover:bg-white/20"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="glass-dark border-white/10" align="center">
                    <DropdownMenuItem className="text-slate-300 hover:text-white hover:bg-white/10">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Details
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-slate-300 hover:text-white hover:bg-white/10">
                      <Copy className="h-4 w-4 mr-2" />
                      Copy URL
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-white/10" />
                    <DropdownMenuItem 
                      onClick={() => handleDeleteAsset(asset.id)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          {/* Asset Info */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-white truncate flex-1 mr-2">
                {asset.name}
              </h3>
              <Badge className={typeColor} variant="outline">
                <TypeIcon className="h-3 w-3 mr-1" />
                {asset.type}
              </Badge>
            </div>
            
            <div className="flex items-center text-xs text-slate-400 space-x-2">
              <HardDrive className="h-3 w-3" />
              <span>{formatFileSize(asset.size)}</span>
              <span>•</span>
              <FolderOpen className="h-3 w-3" />
              <span>{asset.folder}</span>
            </div>

            {asset.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {asset.tags.slice(0, 3).map((tag, i) => (
                  <Badge key={i} variant="secondary" className="text-xs bg-white/10 text-slate-300 border-white/20">
                    {tag}
                  </Badge>
                ))}
                {asset.tags.length > 3 && (
                  <Badge variant="secondary" className="text-xs bg-white/10 text-slate-400 border-white/20">
                    +{asset.tags.length - 3}
                  </Badge>
                )}
              </div>
            )}

            <div className="flex items-center text-xs text-slate-500 pt-1">
              <Calendar className="h-3 w-3 mr-1" />
              <span>{new Date(asset.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen gradient-bg">
      <Sidebar />
      
      <main className="ml-64 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between mb-8"
          >
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Asset Library</h1>
              <p className="text-slate-400">
                Manage your brand assets, files, and media
              </p>
              <div className="flex items-center space-x-4 mt-3">
                <div className="text-xs text-slate-500">
                  <span className="text-white font-medium">{filteredAssets.length}</span> assets
                </div>
                <div className="text-xs text-slate-500">
                  <span className="text-white font-medium">{folders?.length || 0}</span> folders
                </div>
                <div className="text-xs text-slate-500">
                  <span className="text-white font-medium">{assetTypes.length}</span> file types
                </div>
              </div>
              {error && (
                <p className="text-red-400 text-sm mt-2">
                  Error: {error.message}
                </p>
              )}
            </div>
            
            {(isAdmin || isTeamMember) && (
              <Button 
                onClick={() => setIsUploadModalOpen(true)}
                className="gradient-primary"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Assets
              </Button>
            )}
          </motion.div>

          {/* Filters & Search */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex items-center justify-between mb-6 space-x-4"
          >
            <div className="flex items-center space-x-4 flex-1">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search assets..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white/5 border-white/10 text-white"
                />
              </div>

              {/* Folder Filter */}
              <Select value={folderFilter} onValueChange={setFolderFilter}>
                <SelectTrigger className="w-40 bg-white/5 border-white/10 text-white">
                  <FolderOpen className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="glass-dark border-white/10">
                  <SelectItem value="all">All Folders</SelectItem>
                  {folders?.map(folder => (
                    <SelectItem key={folder} value={folder}>{folder}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Type Filter */}
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-32 bg-white/5 border-white/10 text-white">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="glass-dark border-white/10">
                  <SelectItem value="all">All Types</SelectItem>
                  {assetTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* View Toggle */}
            <div className="flex items-center space-x-2">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="icon"
                onClick={() => setViewMode("grid")}
                className="text-slate-400 hover:text-white"
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="icon"
                onClick={() => setViewMode("list")}
                className="text-slate-400 hover:text-white"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>

          {/* Assets Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {isLoading ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-slate-400">Loading assets...</p>
              </div>
            ) : filteredAssets.length === 0 ? (
              <div className="text-center py-12">
                <Upload className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">No assets found</h3>
                <p className="text-slate-400 mb-4">
                  {searchTerm || folderFilter !== "all" || typeFilter !== "all" 
                    ? "No assets match your current filters" 
                    : "Start by uploading your first asset"}
                </p>
                {(searchTerm || folderFilter !== "all" || typeFilter !== "all") && (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setSearchTerm("");
                      setFolderFilter("all");
                      setTypeFilter("all");
                    }}
                    className="text-slate-400 hover:text-white"
                  >
                    Clear filters
                  </Button>
                )}
              </div>
            ) : (
              <div className={
                viewMode === "grid" 
                  ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6"
                  : "space-y-4"
              }>
                {filteredAssets.map((asset, index) => (
                  <AssetCard key={asset.id} asset={asset} index={index} />
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </main>

      {/* Asset Upload Modal */}
      <AssetUploadModal 
        isOpen={isUploadModalOpen} 
        onClose={() => setIsUploadModalOpen(false)}
      />
    </div>
  );
}