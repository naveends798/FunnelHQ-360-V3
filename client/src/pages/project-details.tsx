import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/sidebar";
import CommentsThread from "@/components/comments-thread";
import ThreadedComments from "@/components/threaded-comments";
import ProjectOnboardingForm from "@/components/project-onboarding-form";
import DesignUploadModal from "@/components/design-upload-modal";
import SubmissionView from "@/components/submission-view";
import { useLocation } from "wouter";
import { type Project, type Client } from "@shared/schema";
import { useDesignComments } from "@/hooks/useDesignComments";
import { 
  ArrowLeft,
  Calendar,
  DollarSign,
  Users,
  Clock,
  FileText,
  MessageCircle,
  MoreHorizontal,
  Edit,
  Share,
  Star,
  Folder,
  Image,
  Upload,
  Eye,
  ClipboardCheck,
  Copy,
  ThumbsUp,
  CheckSquare,
  X,
  Plus,
  Reply,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ClipboardList,
  Mail
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

type ProjectWithClient = Project & { client: Client };

interface User {
  id: number;
  name: string;
  avatar?: string;
  role: string;
}

interface ProjectDetailsProps {
  projectId?: string;
}

const STATUS_COLORS = {
  active: "bg-green-500/20 text-green-400 border-green-500/30",
  completed: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  paused: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  cancelled: "bg-red-500/20 text-red-400 border-red-500/30"
};

const PRIORITY_COLORS = {
  low: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  medium: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  high: "bg-orange-500/20 text-orange-400 border-orange-500/30"
};

interface DesignComment {
  id: number;
  content: string;
  author: string;
  authorRole?: 'client' | 'team_member' | 'admin';
  timestamp: Date;
  status: 'pending' | 'in_progress' | 'completed';
  priority?: 'low' | 'normal' | 'high';
  parentId?: number;
  replies?: DesignComment[];
}

interface FunnelDesign {
  id: number;
  title: string;
  imageUrl: string;
  comments: DesignComment[];
  uploadedAt: Date;
  type: 'figma' | 'funnel' | 'website' | 'wireframe' | 'mockup' | 'prototype' | 'other';
  description?: string;
  originalUrl?: string;
}

export default function ProjectDetails({ projectId }: ProjectDetailsProps) {
  const { authUser, currentRole } = useAuth();
  const [location, setLocation] = useLocation();
  const [users, setUsers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState("overview");
  const { toast } = useToast();
  const [selectedDesign, setSelectedDesign] = useState<FunnelDesign | null>(null);
  const [newComment, setNewComment] = useState('');
  const [designs, setDesigns] = useState<FunnelDesign[]>([]);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [imageZoom, setImageZoom] = useState(1);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [submissionData, setSubmissionData] = useState<any>(null);
  const [showCompletionAnimation, setShowCompletionAnimation] = useState(false);
  const [showDesignUploadModal, setShowDesignUploadModal] = useState(false);
  const [uploadedAssets, setUploadedAssets] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  
  const { addComment, updateCommentStatus } = useDesignComments({
    designId: selectedDesign?.id || 0,
    projectId: parseInt(projectId || '0'),
    currentUserId: authUser?.id || 1
  });

  // Load project assets on mount
  useEffect(() => {
    const loadAssets = async () => {
      try {
        const response = await fetch(`/api/assets?organizationId=1&projectId=${projectId}`);
        if (response.ok) {
          const assets = await response.json();
          setUploadedAssets(assets);
        }
      } catch (error) {
        console.error('Failed to load assets:', error);
      }
    };
    
    if (projectId) {
      loadAssets();
    }
  }, [projectId]);

  // Helper function to create thumbnail URL for images
  const createThumbnailUrl = (url: string, type: string) => {
    if (type === 'image') {
      // For demo purposes, we'll use the same URL as thumbnail
      // In production, you'd want to generate actual thumbnails
      return url;
    }
    return null;
  };

  // Helper function to handle file upload
  const handleFileUpload = async (files: File[]) => {
    setIsUploading(true);
    const uploadPromises = files.map(async (file) => {
      try {
        // Create a data URL for the file (for demo purposes)
        const reader = new FileReader();
        return new Promise((resolve, reject) => {
          reader.onload = async (e) => {
            const dataUrl = e.target?.result as string;
            
            // Determine file type
            const fileType = file.type.startsWith('image/') ? 'image' : 
                           file.type === 'application/pdf' ? 'document' :
                           file.type.startsWith('video/') ? 'video' :
                           file.type.startsWith('audio/') ? 'audio' :
                           file.name.endsWith('.zip') || file.name.endsWith('.rar') ? 'archive' :
                           'document';
            
            const assetData = {
              organizationId: 1,
              projectId: parseInt(projectId || '0'),
              name: file.name.split('.')[0],
              originalName: file.name,
              type: fileType,
              mimeType: file.type,
              size: file.size,
              url: dataUrl, // In production, this would be a proper URL
              thumbnailUrl: createThumbnailUrl(dataUrl, fileType),
              uploadedBy: 1, // TODO: Get from auth context
              folder: 'uploads',
              tags: [],
              metadata: {}
            };
            
            // Save to backend
            const response = await fetch('/api/assets', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(assetData)
            });
            
            if (response.ok) {
              const newAsset = await response.json();
              resolve(newAsset);
            } else {
              reject(new Error('Failed to upload asset'));
            }
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      } catch (error) {
        console.error('Failed to upload file:', file.name, error);
        throw error;
      }
    });
    
    try {
      const newAssets = await Promise.all(uploadPromises);
      setUploadedAssets(prev => [...newAssets, ...prev]);
      toast({
        title: "Upload successful",
        description: `${newAssets.length} file(s) uploaded successfully.`
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Some files failed to upload. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Helper function to get file type icon
  const getFileTypeIcon = (type: string) => {
    switch (type) {
      case 'image': return <Image className="h-4 w-4" />;
      case 'document': return <FileText className="h-4 w-4" />;
      case 'video': return <FileText className="h-4 w-4" />;
      case 'audio': return <FileText className="h-4 w-4" />;
      case 'archive': return <Folder className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  // Helper function to format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const handleDesignUpload = (design: {
    title: string;
    description?: string;
    type: string;
    imageUrl: string;
    originalUrl?: string;
  }) => {
    const newDesign: FunnelDesign = {
      id: designs.length + 1,
      title: design.title,
      imageUrl: design.imageUrl,
      type: design.type as 'figma' | 'funnel' | 'website' | 'wireframe' | 'mockup' | 'prototype',
      uploadedAt: new Date(),
      comments: [],
      description: design.description,
      originalUrl: design.originalUrl
    };
    
    setDesigns(prev => [...prev, newDesign]);
  };

  // Load submission data from localStorage on mount
  useEffect(() => {
    if (projectId) {
      const storageKey = `submission_data_project_${projectId}`;
      const savedData = localStorage.getItem(storageKey);
      if (savedData) {
        try {
          const parsedData = JSON.parse(savedData);
          console.log('📄 Loaded submission data from localStorage:', parsedData);
          setSubmissionData(parsedData);
        } catch (error) {
          console.error('❌ Failed to parse saved submission data:', error);
          localStorage.removeItem(storageKey);
        }
      }
    }
  }, [projectId]);

  const { data: project, isLoading } = useQuery<ProjectWithClient>({
    queryKey: ["/api/projects", projectId],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch project');
      }
      return response.json();
    },
    enabled: !!projectId
  });

  // Sample designs data for demonstration  
  useEffect(() => {
    // Users are now fetched dynamically by the CommentsThread component based on roles

    const sampleDesigns: FunnelDesign[] = [];

    setDesigns(sampleDesigns);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Project Not Found</h2>
          <p className="text-slate-400 mb-6">The project you're looking for doesn't exist.</p>
          <Button onClick={() => setLocation("/dashboard")} className="bg-primary hover:bg-primary/90">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 gradient-primary rounded-full opacity-20 blur-3xl animate-float"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 gradient-secondary rounded-full opacity-15 blur-3xl animate-pulse-slow"></div>
      </div>

      <Sidebar />

      {/* Main Content */}
      <main className="lg:ml-64 p-4 lg:p-6 pt-20 lg:pt-6">
        <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/projects")}
              className="text-slate-400 hover:text-white"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white">{project.title}</h1>
              <div className="flex items-center space-x-3 mt-2">
                <Badge className={STATUS_COLORS[project.status]}>
                  {project.status}
                </Badge>
                <Badge className={PRIORITY_COLORS[project.priority]}>
                  {project.priority} priority
                </Badge>
                <span className="text-slate-400">•</span>
                <span className="text-slate-400">{project.client.name}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button variant="outline" className="glass border-white/20 text-white hover:bg-white/10">
              <Share className="h-4 w-4 mr-2" />
              Share
            </Button>
            <Button variant="outline" className="glass border-white/20 text-white hover:bg-white/10">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button variant="outline" size="icon" className="glass border-white/20 text-white hover:bg-white/10">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Project Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-xl p-4"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <DollarSign className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  ${parseFloat(project.budgetUsed || "0").toLocaleString()}
                </div>
                <div className="text-slate-400 text-sm">
                  of ${parseFloat(project.budget).toLocaleString()}
                </div>
              </div>
            </div>
            <div className="mt-3">
              <Progress value={(parseFloat(project.budgetUsed || "0") / parseFloat(project.budget)) * 100} className="h-2" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass rounded-xl p-4"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Clock className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{project.progress}%</div>
                <div className="text-slate-400 text-sm">Complete</div>
              </div>
            </div>
            <div className="mt-3">
              <Progress value={project.progress} className="h-2" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass rounded-xl p-4"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <Users className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{(project.teamMembers || []).length}</div>
                <div className="text-slate-400 text-sm">Team Members</div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass rounded-xl p-4"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-orange-500/20">
                <Calendar className="h-5 w-5 text-orange-400" />
              </div>
              <div>
                <div className="text-xl font-bold text-white">
                  {project.endDate ? new Date(project.endDate).toLocaleDateString() : "TBD"}
                </div>
                <div className="text-slate-400 text-sm">Due Date</div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Project Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="glass">
            <TabsTrigger value="overview" className="data-[state=active]:bg-primary/20">
              <FileText className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="onboarding" className="data-[state=active]:bg-primary/20">
              <ClipboardList className="h-4 w-4 mr-2" />
              Onboarding
            </TabsTrigger>
            <TabsTrigger value="submission" className="data-[state=active]:bg-primary/20">
              <ClipboardCheck className="h-4 w-4 mr-2" />
              Submission
            </TabsTrigger>
            <TabsTrigger value="comments" className="data-[state=active]:bg-primary/20">
              <MessageCircle className="h-4 w-4 mr-2" />
              Comments
            </TabsTrigger>
            <TabsTrigger value="assets" className="data-[state=active]:bg-primary/20">
              <Folder className="h-4 w-4 mr-2" />
              Assets
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
              {/* Project Description */}
              <div className="lg:col-span-2 space-y-6">
                <div className="glass rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Project Description</h3>
                  <p className="text-slate-300 leading-relaxed">{project.description}</p>
                </div>

                {/* Funnel Designs */}
                <div className="glass rounded-xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-1">Funnel Designs</h3>
                      <p className="text-slate-400 text-sm">Upload and manage your design assets</p>
                    </div>
                    <Button 
                      size="sm" 
                      className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg"
                      onClick={() => setShowDesignUploadModal(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Design
                    </Button>
                  </div>
                  
                  {designs.length > 0 ? (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {designs.map((design) => (
                        <div key={design.id} className="group relative bg-white/5 rounded-lg overflow-hidden hover:bg-white/10 transition-all duration-200">
                          <div className="aspect-video relative">
                            <img
                              src={design.imageUrl}
                              alt={design.title}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setSelectedDesign(design);
                                }}
                                className="text-white hover:bg-white/20"
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setSelectedDesign(design);
                                }}
                                className="text-white hover:bg-white/20"
                              >
                                <MessageCircle className="h-4 w-4 mr-1" />
                                Comment
                              </Button>
                            </div>
                          </div>
                          <div className="p-3">
                            <h4 className="font-medium text-white text-sm mb-1">{design.title}</h4>
                            <div className="flex items-center justify-between text-xs text-slate-400">
                              <span>Uploaded {design.uploadedAt.toLocaleDateString()}</span>
                              <span className="bg-primary/20 text-primary px-2 py-1 rounded">
                                {design.comments.length} comments
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mx-auto mb-4">
                        <Image className="h-8 w-8 text-primary" />
                      </div>
                      <h4 className="text-white font-medium mb-2">No designs uploaded yet</h4>
                      <p className="text-slate-400 text-sm mb-6">Upload your first funnel or website design to get started</p>
                      <Button 
                        className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg"
                        onClick={() => setShowDesignUploadModal(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Your First Design
                      </Button>
                    </div>
                  )}
                </div>

                {/* Tags */}
                <div className="glass rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {(project.tags || []).length > 0 ? (
                      project.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className="bg-primary/20 text-primary border-primary/30"
                        >
                          {tag}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-slate-400 text-sm">No tags added yet</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Client Info */}
                <div className="glass rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Client</h3>
                  <div className="flex items-center space-x-3">
                    {project.client.avatar ? (
                      <img
                        src={project.client.avatar}
                        alt={project.client.name}
                        className="h-12 w-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-medium">
                        {project.client.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="font-medium text-white">{project.client.name}</div>
                      <div className="text-slate-400 text-sm">{project.client.email}</div>
                    </div>
                  </div>
                </div>

                {/* Timeline */}
                <div className="glass rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Timeline</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Start Date</span>
                      <span className="text-white">{new Date(project.startDate).toLocaleDateString()}</span>
                    </div>
                    {project.endDate && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">End Date</span>
                        <span className="text-white">{new Date(project.endDate).toLocaleDateString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-400">Duration</span>
                      <span className="text-white">
                        {project.endDate ? 
                          Math.ceil((new Date(project.endDate).getTime() - new Date(project.startDate).getTime()) / (1000 * 60 * 60 * 24)) + " days"
                          : "Ongoing"
                        }
                      </span>
                    </div>
                  </div>
                </div>

                {/* Team Members */}
                <div className="glass rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Team</h3>
                  <div className="space-y-3">
                    {users.slice(0, 3).map((user) => (
                      <div key={user.id} className="flex items-center space-x-3">
                        <img
                          src={user.avatar}
                          alt={user.name}
                          className="h-8 w-8 rounded-full object-cover"
                        />
                        <div>
                          <div className="font-medium text-white text-sm">{user.name}</div>
                          <div className="text-slate-400 text-xs">{user.role}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </TabsContent>

          <TabsContent value="onboarding" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <ProjectOnboardingForm
                projectId={parseInt(projectId || '0')}
                clientId={project?.clientId || 1}
                existingSubmission={submissionData}
                onSubmissionComplete={(submission) => {
                  console.log('✅ Onboarding form submitted successfully:', submission);
                  
                  // Add timestamp if not present
                  const submissionWithTimestamp = {
                    ...submission,
                    submittedAt: submission.submittedAt || new Date().toISOString()
                  };
                  
                  // Save to localStorage for persistence
                  const storageKey = `submission_data_project_${projectId}`;
                  try {
                    localStorage.setItem(storageKey, JSON.stringify(submissionWithTimestamp));
                    console.log('💾 Submission data saved to localStorage');
                  } catch (error) {
                    console.error('❌ Failed to save submission to localStorage:', error);
                  }
                  
                  // Update state
                  setSubmissionData(submissionWithTimestamp);
                  
                  // Show completion animation
                  setShowCompletionAnimation(true);
                  console.log('🎉 Showing completion animation');
                  
                  // Navigate to submission tab after animation
                  setTimeout(() => {
                    setActiveTab("submission");
                    setShowCompletionAnimation(false);
                    console.log('📋 Navigated to submission tab');
                  }, 2500);
                }}
              />
            </motion.div>
          </TabsContent>

          <TabsContent value="submission" className="space-y-6">
            <SubmissionView 
              submissionData={submissionData}
              projectId={parseInt(projectId || '0')}
              projectName={project?.title}
            />
          </TabsContent>

          <TabsContent value="comments" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-xl p-6"
            >
              <CommentsThread
                projectId={project.id}
                currentUserId={authUser?.id || 1}
                users={users}
                onCommentCreate={(comment) => {
                  console.log('New comment created:', comment);
                }}
                onCommentUpdate={(commentId, updates) => {
                  console.log('Comment updated:', commentId, updates);
                }}
                onCommentDelete={(commentId) => {
                  console.log('Comment deleted:', commentId);
                }}
              />
            </motion.div>
          </TabsContent>

          <TabsContent value="assets" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-xl p-6"
            >
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-1">Client Assets</h3>
                <p className="text-slate-400 text-sm">Simple drag and drop area to collect all assets from this client</p>
              </div>
              
              {/* Simple Upload Area */}
              <div 
                className={`border-2 border-dashed border-white/20 rounded-xl p-12 text-center hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 cursor-pointer group ${
                  isUploading ? 'opacity-50 pointer-events-none' : ''
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.add('border-primary/60', 'bg-primary/10');
                }}
                onDragLeave={(e) => {
                  e.currentTarget.classList.remove('border-primary/60', 'bg-primary/10');
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove('border-primary/60', 'bg-primary/10');
                  const files = Array.from(e.dataTransfer.files);
                  handleFileUpload(files);
                }}
                onClick={() => {
                  if (isUploading) return;
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.multiple = true;
                  input.accept = 'image/*,application/pdf,.doc,.docx,.zip,.rar,video/*,audio/*';
                  input.onchange = (e) => {
                    const files = Array.from((e.target as HTMLInputElement).files || []);
                    handleFileUpload(files);
                  };
                  input.click();
                }}
              >
                <div className="flex flex-col items-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center group-hover:from-primary/30 group-hover:to-primary/20 transition-all duration-200">
                    {isUploading ? (
                      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Upload className="h-8 w-8 text-primary group-hover:scale-110 transition-transform duration-200" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-white font-medium mb-2 group-hover:text-primary transition-colors">
                      {isUploading ? 'Uploading...' : 'Upload Assets'}
                    </h4>
                    <p className="text-slate-400 text-sm mb-4">
                      {isUploading ? 'Please wait while files are being uploaded' : 'Drag and drop files here, or click to browse'}
                    </p>
                    <p className="text-slate-500 text-xs">
                      Supports images, PDFs, documents, videos, audio, and zip files
                    </p>
                  </div>
                </div>
              </div>

              {/* Recently Uploaded Files */}
              <div className="mt-8">
                <h4 className="text-white font-medium mb-4 flex items-center">
                  <Folder className="h-4 w-4 mr-2 text-primary" />
                  Recently Uploaded {uploadedAssets.length > 0 && `(${uploadedAssets.length})`}
                </h4>
                
                {uploadedAssets.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {uploadedAssets.map((asset) => (
                      <div key={asset.id} className="group relative bg-white/5 rounded-lg overflow-hidden hover:bg-white/10 transition-all duration-200 border border-white/10">
                        {/* Thumbnail or Icon */}
                        <div className="aspect-video relative bg-slate-800/50 flex items-center justify-center">
                          {asset.type === 'image' && asset.url ? (
                            <img
                              src={asset.url}
                              alt={asset.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                // Fallback to icon if image fails to load
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.nextElementSibling?.classList.remove('hidden');
                              }}
                            />
                          ) : null}
                          <div className={`${asset.type === 'image' ? 'hidden' : 'flex'} items-center justify-center w-full h-full`}>
                            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                              asset.type === 'image' ? 'bg-green-500/20 text-green-400' :
                              asset.type === 'document' ? 'bg-red-500/20 text-red-400' :
                              asset.type === 'video' ? 'bg-blue-500/20 text-blue-400' :
                              asset.type === 'audio' ? 'bg-purple-500/20 text-purple-400' :
                              asset.type === 'archive' ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-slate-500/20 text-slate-400'
                            }`}>
                              {getFileTypeIcon(asset.type)}
                            </div>
                          </div>
                          
                          {/* Hover overlay */}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                // Open file in new tab
                                window.open(asset.url, '_blank');
                              }}
                              className="text-white hover:bg-white/20"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </div>
                        </div>
                        
                        {/* File info */}
                        <div className="p-3">
                          <h4 className="font-medium text-white text-sm mb-1 truncate" title={asset.originalName}>
                            {asset.originalName}
                          </h4>
                          <div className="flex items-center justify-between text-xs text-slate-400">
                            <span className="capitalize">{asset.type}</span>
                            <span>{formatFileSize(asset.size)}</span>
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {new Date(asset.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    <Folder className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No assets uploaded yet</p>
                    <p className="text-xs mt-1">Upload files using the area above</p>
                  </div>
                )}
              </div>
            </motion.div>
          </TabsContent>
        </Tabs>

        {/* Design Modal */}
        <AnimatePresence>
          {selectedDesign && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setSelectedDesign(null);
                }
              }}
            >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900/95 backdrop-blur-xl rounded-2xl max-w-7xl w-full max-h-[95vh] shadow-2xl border border-white/10 flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header - Fixed */}
              <div className="flex items-center justify-between p-6 border-b border-white/10 bg-gradient-to-r from-slate-900 to-slate-800 flex-shrink-0">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">{selectedDesign.title}</h2>
                  <div className="flex items-center space-x-3 text-sm text-slate-400">
                    <span className="capitalize">{selectedDesign.type} Design</span>
                    <span>•</span>
                    <span>Uploaded {selectedDesign.uploadedAt.toLocaleDateString()}</span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedDesign(null)}
                  className="text-slate-400 hover:text-white hover:bg-white/10 transition-all duration-200"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              
              {/* Modal Content - Scrollable */}
              <div className="flex flex-1 min-h-0">
                {/* Design Image Panel - Scrollable */}
                <div className="flex-1 flex flex-col min-w-0">
                  {/* Image Controls - Fixed */}
                  <div className="flex items-center justify-between p-4 border-b border-white/10 bg-slate-800/50 flex-shrink-0">
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setImageZoom(Math.min(imageZoom + 0.25, 3))}
                        className="text-slate-400 hover:text-white"
                      >
                        <ZoomIn className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setImageZoom(Math.max(imageZoom - 0.25, 0.5))}
                        className="text-slate-400 hover:text-white"
                      >
                        <ZoomOut className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setImageZoom(1);
                          setImagePosition({ x: 0, y: 0 });
                        }}
                        className="text-slate-400 hover:text-white"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="text-xs text-slate-400">
                      {Math.round(imageZoom * 100)}%
                    </div>
                  </div>
                  
                  {/* Image Container - Scrollable */}
                  <div className="flex-1 p-6 overflow-auto bg-gradient-to-br from-slate-900/20 to-slate-800/30">
                    <div className="min-h-full flex items-start justify-center">
                      <img
                        src={selectedDesign.imageUrl}
                        alt={selectedDesign.title}
                        className="max-w-none h-auto cursor-grab active:cursor-grabbing shadow-2xl rounded-lg"
                        style={{
                          transform: `scale(${imageZoom}) translate(${imagePosition.x}px, ${imagePosition.y}px)`,
                          transformOrigin: 'center top',
                          transition: imageZoom === 1 ? 'transform 0.2s ease' : 'none',
                          minWidth: imageZoom > 1 ? 'auto' : '100%',
                          width: imageZoom > 1 ? 'auto' : '100%'
                        }}
                        draggable={false}
                        onMouseDown={(e) => {
                          if (imageZoom > 1) {
                            e.preventDefault();
                            const startX = e.clientX - imagePosition.x;
                            const startY = e.clientY - imagePosition.y;
                            
                            const handleMouseMove = (moveEvent: MouseEvent) => {
                              setImagePosition({
                                x: moveEvent.clientX - startX,
                                y: moveEvent.clientY - startY
                              });
                            };
                            
                            const handleMouseUp = () => {
                              document.removeEventListener('mousemove', handleMouseMove);
                              document.removeEventListener('mouseup', handleMouseUp);
                            };
                            
                            document.addEventListener('mousemove', handleMouseMove);
                            document.addEventListener('mouseup', handleMouseUp);
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
                
                {/* Comments Panel - Fixed Width, Scrollable Content */}
                <div className="w-96 border-l border-white/10 flex flex-col bg-gradient-to-b from-slate-900/50 to-slate-800/50 flex-shrink-0">
                  {/* Comments Header - Fixed */}
                  <div className="p-4 border-b border-white/10 bg-slate-800/50 flex-shrink-0">
                    <h3 className="font-semibold text-white mb-2 flex items-center">
                      <MessageCircle className="h-4 w-4 mr-2 text-primary" />
                      Comments & Feedback
                    </h3>
                    <div className="flex items-center space-x-2 text-sm text-slate-400">
                      <span>{selectedDesign.comments.length} comments</span>
                      <span>•</span>
                      <span className="text-green-400">
                        {selectedDesign.comments.filter(c => c.status === 'completed').length} completed
                      </span>
                    </div>
                  </div>
                  
                  {/* Threaded Comments - Scrollable */}
                  <div className="flex-1 overflow-hidden">
                    <ThreadedComments
                      comments={selectedDesign.comments}
                      onAddComment={async (content, parentId) => {
                        const newCommentObj = await addComment(content);
                        if (newCommentObj && selectedDesign) {
                          const commentToAdd = {
                            ...newCommentObj,
                            parentId
                          };
                          
                          let updatedComments;
                          if (parentId) {
                            // Add as reply
                            updatedComments = selectedDesign.comments.map(comment => {
                              if (comment.id === parentId) {
                                return {
                                  ...comment,
                                  replies: [...(comment.replies || []), commentToAdd]
                                };
                              }
                              return comment;
                            });
                          } else {
                            // Add as top-level comment
                            updatedComments = [...selectedDesign.comments, commentToAdd];
                          }
                          
                          const updatedDesign = {
                            ...selectedDesign,
                            comments: updatedComments
                          };
                          setDesigns(prev => prev.map(d => d.id === selectedDesign.id ? updatedDesign : d));
                          setSelectedDesign(updatedDesign);
                          
                          // Create notification for new comment
                          try {
                            await fetch('/api/notifications', {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                              },
                              body: JSON.stringify({
                                type: 'comment',
                                title: 'New Comment on Design',
                                message: `${commentToAdd.author} commented on "${selectedDesign.title}"`,
                                actionUrl: `/projects/${projectId}?design=${selectedDesign.id}`,
                                userId: 1, // TODO: Get admin/team member IDs
                                metadata: {
                                  designId: selectedDesign.id,
                                  designTitle: selectedDesign.title,
                                  commentId: commentToAdd.id,
                                  commentAuthor: commentToAdd.author,
                                  projectId: projectId
                                }
                              })
                            });
                          } catch (error) {
                            console.error('Failed to create notification:', error);
                          }
                        }
                      }}
                      onUpdateStatus={(commentId, status) => {
                        if (selectedDesign) {
                          const updateCommentStatus = (comments: any[]): any[] => {
                            return (comments || []).map(comment => {
                              if (comment.id === commentId) {
                                return { ...comment, status };
                              }
                              if (comment.replies) {
                                return {
                                  ...comment,
                                  replies: updateCommentStatus(comment.replies)
                                };
                              }
                              return comment;
                            });
                          };
                          
                          const updatedDesign = {
                            ...selectedDesign,
                            comments: updateCommentStatus(selectedDesign.comments || [])
                          };
                          setDesigns(prev => prev.map(d => d.id === selectedDesign.id ? updatedDesign : d));
                          setSelectedDesign(updatedDesign);
                          updateCommentStatus(commentId, status);
                        }
                      }}
                      currentUser="You"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
          )}
        </AnimatePresence>
        
        
        {/* Floating Action Button for Quick Upload */}
        {activeTab === "assets" && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="fixed bottom-8 right-8 z-40"
          >
            <Button
              size="lg"
              onClick={() => setActiveTab("assets")}
              className="h-14 w-14 rounded-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-2xl hover:shadow-primary/25 transition-all duration-300 hover:scale-110"
            >
              <Upload className="h-6 w-6" />
            </Button>
            <div className="absolute -top-12 right-0 bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              Upload Assets
            </div>
          </motion.div>
        )}
        
        {/* Completion Animation Overlay */}
        <AnimatePresence>
          {showCompletionAnimation && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
            >
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ 
                  type: "spring", 
                  stiffness: 260, 
                  damping: 20,
                  delay: 0.2 
                }}
                className="text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5, type: "spring", stiffness: 300 }}
                  className="w-24 h-24 mx-auto mb-6 rounded-full bg-green-500 flex items-center justify-center"
                >
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.8 }}
                  >
                    <CheckSquare className="h-12 w-12 text-white" />
                  </motion.div>
                </motion.div>
                
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 1 }}
                >
                  <h2 className="text-2xl font-bold text-white mb-2">Form Submitted!</h2>
                  <p className="text-slate-300">
                    Your onboarding information has been saved successfully.
                  </p>
                </motion.div>
                
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 1.5, type: "spring" }}
                  className="mt-6"
                >
                  <div className="w-16 h-1 bg-green-500 rounded-full mx-auto"></div>
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Design Upload Modal */}
        <DesignUploadModal
          isOpen={showDesignUploadModal}
          onClose={() => setShowDesignUploadModal(false)}
          onUpload={handleDesignUpload}
          projectId={parseInt(projectId || '0')}
        />
        </div>
      </main>
    </div>
  );
}