import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Search, 
  User, 
  Calendar,
  Folder,
  X,
  Check,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Project {
  id: number;
  title: string;
  client: {
    id: number;
    name: string;
    email: string;
  };
  status: string;
  startDate: string;
  endDate?: string;
  hasAssignedForm?: boolean;
  assignedFormTitle?: string;
  isDisabledForAssignment?: boolean;
}

interface OnboardingForm {
  id: number;
  title: string;
  description: string;
  projectId?: number | null;
}

interface AssignFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  form: OnboardingForm | null;
  onAssign: (formId: number, projectId: number | null) => Promise<void>;
}

export default function AssignFormModal({ 
  isOpen, 
  onClose, 
  form, 
  onAssign 
}: AssignFormModalProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [projectFormAssignments, setProjectFormAssignments] = useState<Record<number, { formId: number; formTitle: string }>>({});

  useEffect(() => {
    if (isOpen) {
      fetchProjects();
      setSelectedProject(null);
      setSearchTerm("");
    }
  }, [isOpen]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      
      // Fetch projects and form assignments in parallel
      const [projectsResponse, formsResponse] = await Promise.all([
        fetch('/api/projects'),
        fetch('/api/onboarding-forms')
      ]);
      
      console.log('Projects Response Status:', projectsResponse.status);
      console.log('Forms Response Status:', formsResponse.status);
      
      if (projectsResponse.ok && formsResponse.ok) {
        const projectsData = await projectsResponse.json();
        const formsData = await formsResponse.json();
        
        console.log('Projects Data:', projectsData);
        console.log('Forms Data:', formsData);
        
        // Create a map of project assignments (only projects that have ANY form assigned)
        const assignments: Record<number, { formId: number; formTitle: string }> = {};
        formsData.forEach((formData: OnboardingForm) => {
          if (formData.projectId) {
            // Projects with ANY form assigned - they can't get additional forms
            assignments[formData.projectId] = {
              formId: formData.id,
              formTitle: formData.title
            };
          }
        });
        
        setProjectFormAssignments(assignments);
        
        // Add assignment info to projects
        const projectsWithAssignments = projectsData.map((project: Project) => {
          const hasAssignment = !!assignments[project.id];
          const isCurrentFormAssigned = assignments[project.id]?.formId === form?.id;
          
          return {
            ...project,
            hasAssignedForm: hasAssignment,
            assignedFormTitle: assignments[project.id]?.formTitle,
            // Project is disabled if it has a DIFFERENT form assigned (not the current one)
            isDisabledForAssignment: hasAssignment && !isCurrentFormAssigned
          };
        });
        
        console.log('Projects with assignments:', projectsWithAssignments);
        setProjects(projectsWithAssignments);
      } else {
        console.error('API response not ok:', {
          projectsStatus: projectsResponse.status,
          formsStatus: formsResponse.status
        });
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProjects = projects.filter(project =>
    project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.client.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAssign = async () => {
    if (!form || !selectedProject) return;

    // Double-check that the selected project doesn't have a different form assigned
    if (selectedProject.isDisabledForAssignment) {
      console.error('Cannot assign form to project that already has a different form assigned');
      return;
    }

    try {
      setAssigning(true);
      await onAssign(form.id, selectedProject.id);
      onClose();
    } catch (error) {
      console.error('Error assigning form:', error);
    } finally {
      setAssigning(false);
    }
  };

  const handleRemoveAssignment = async () => {
    if (!form) return;

    try {
      setAssigning(true);
      await onAssign(form.id, null);
      onClose();
    } catch (error) {
      console.error('Error removing assignment:', error);
    } finally {
      setAssigning(false);
    }
  };

  if (!form) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass border-white/20 max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center">
            <Folder className="h-5 w-5 mr-2 text-primary" />
            Assign Form to Project
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Assign "{form.title}" to a specific project so clients can access it
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-6 overflow-y-auto flex-1 pr-2">
          {/* Information Banner */}
          <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-blue-400 text-xs font-bold">!</span>
              </div>
              <div>
                <p className="text-blue-400 font-medium text-sm">Assignment Rules</p>
                <p className="text-blue-300 text-xs mt-1">
                  This form can be assigned to multiple projects. However, projects with existing forms cannot receive additional forms.
                </p>
              </div>
            </div>
          </div>

          {/* Current Assignment Status */}
          {form.projectId && (
            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-400 font-medium">Currently Assigned</p>
                  <p className="text-slate-300 text-sm">
                    Project ID: {form.projectId}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRemoveAssignment}
                  disabled={assigning}
                  className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                >
                  {assigning ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                  Remove
                </Button>
              </div>
            </div>
          )}

          {/* Search */}
          <div className="space-y-2">
            <Label className="text-slate-300">Search Projects</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
              <Input
                placeholder="Search by project name or client..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="glass border-0 pl-10 text-white placeholder-slate-400"
              />
            </div>
          </div>

          {/* Projects List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-slate-300">Available Projects</Label>
              <div className="text-xs text-slate-400">
                {filteredProjects.filter(p => !p.isDisabledForAssignment).length} of {filteredProjects.length} available
              </div>
            </div>
            <div className="max-h-64 overflow-y-auto space-y-2 border border-white/10 rounded-lg p-2">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="ml-2 text-slate-400">Loading projects...</span>
                </div>
              ) : filteredProjects.length === 0 ? (
                <div className="text-center py-8">
                  <Folder className="h-8 w-8 text-slate-500 mx-auto mb-2" />
                  <p className="text-slate-400">
                    {searchTerm ? 'No projects found' : 'No projects available'}
                  </p>
                </div>
              ) : (
                <AnimatePresence>
                  {filteredProjects.map((project) => {
                    const isDisabled = project.isDisabledForAssignment;
                    const isCurrentFormAssigned = project.hasAssignedForm && !isDisabled;
                    return (
                    <motion.div
                      key={project.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className={cn(
                        "p-3 rounded-lg border transition-all",
                        isDisabled
                          ? "opacity-50 cursor-not-allowed bg-gray-500/10 border-gray-500/20"
                          : selectedProject?.id === project.id
                            ? "bg-primary/20 border-primary/50 cursor-pointer"
                            : "bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10 cursor-pointer"
                      )}
                      onClick={() => !isDisabled && setSelectedProject(project)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h4 className={cn(
                              "font-medium",
                              isDisabled ? "text-gray-400" : "text-white"
                            )}>
                              {project.title}
                            </h4>
                            <Badge 
                              className={cn(
                                "text-xs",
                                project.status === 'active' && !isDisabled && "bg-green-500/20 text-green-400 border-green-500/30",
                                project.status === 'paused' && !isDisabled && "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
                                project.status === 'completed' && !isDisabled && "bg-blue-500/20 text-blue-400 border-blue-500/30",
                                isDisabled && "bg-gray-500/20 text-gray-400 border-gray-500/30"
                              )}
                            >
                              {project.status}
                            </Badge>
                            {isCurrentFormAssigned && (
                              <Badge className="text-xs bg-green-500/20 text-green-400 border-green-500/30">
                                This Form Assigned
                              </Badge>
                            )}
                            {isDisabled && (
                              <Badge className="text-xs bg-red-500/20 text-red-400 border-red-500/30">
                                Different Form Assigned
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center space-x-4 mt-1 text-sm">
                            <div className="flex items-center space-x-1">
                              <User className="h-3 w-3" />
                              <span className={isDisabled ? "text-gray-500" : "text-slate-400"}>
                                {project.client.name}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-3 w-3" />
                              <span className={isDisabled ? "text-gray-500" : "text-slate-400"}>
                                {new Date(project.startDate).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          {isDisabled && project.assignedFormTitle && (
                            <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded text-xs">
                              <p className="text-red-400 font-medium">Already has form assigned:</p>
                              <p className="text-red-300">"{project.assignedFormTitle}"</p>
                            </div>
                          )}
                        </div>
                        {selectedProject?.id === project.id && !isDisabled && (
                          <Check className="h-5 w-5 text-primary" />
                        )}
                        {isDisabled && (
                          <X className="h-5 w-5 text-red-400" />
                        )}
                      </div>
                    </motion.div>
                  );
                  })}
                </AnimatePresence>
              )}
            </div>
          </div>

          {/* Selected Project Summary */}
          {selectedProject && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-lg bg-primary/10 border border-primary/20"
            >
              <p className="text-primary font-medium mb-2">Selected Project</p>
              <div className="space-y-1 text-sm">
                <p className="text-white">
                  <span className="text-slate-400">Project:</span> {selectedProject.title}
                </p>
                <p className="text-white">
                  <span className="text-slate-400">Client:</span> {selectedProject.client.name}
                </p>
                <p className="text-white">
                  <span className="text-slate-400">Email:</span> {selectedProject.client.email}
                </p>
              </div>
            </motion.div>
          )}

        </div>

        {/* Action Buttons - Outside scrollable area */}
        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-white/10 mt-4 flex-shrink-0">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={assigning}
            className="glass border-white/20 text-white hover:bg-white/10"
          >
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={!selectedProject || assigning || selectedProject?.isDisabledForAssignment}
            className="bg-primary hover:bg-primary/90"
          >
            {assigning ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Assigning...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Assign Form
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}