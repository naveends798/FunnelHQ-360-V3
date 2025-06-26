import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Search, Users, FolderPlus, UserPlus, Check, X, AlertTriangle } from "lucide-react";
import type { User as UserType, Project, ProjectTeamMember, BillingPlan } from "@shared/schema";
import { BILLING_PLANS } from "@shared/schema";

interface ProjectAssignmentMatrixProps {
  isOpen: boolean;
  onClose: () => void;
}

const PROJECT_ROLES = [
  { value: "developer", label: "Developer", color: "bg-blue-500/20 text-blue-400" },
  { value: "designer", label: "Designer", color: "bg-green-500/20 text-green-400" },
  { value: "project_manager", label: "Project Manager", color: "bg-orange-500/20 text-orange-400" },
];

interface AssignmentChange {
  projectId: number;
  userId: number;
  role: string;
  action: 'assign' | 'unassign';
}

export default function ProjectAssignmentMatrix({ 
  isOpen, 
  onClose 
}: ProjectAssignmentMatrixProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("developer");
  const [pendingChanges, setPendingChanges] = useState<AssignmentChange[]>([]);
  const { authUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: users = [] } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
    enabled: isOpen,
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    enabled: isOpen,
  });

  const { data: allAssignments = [] } = useQuery<(ProjectTeamMember & { user: UserType; project: Project })[]>({
    queryKey: ["/api/project-assignments"],
    queryFn: async () => {
      // Get all project assignments
      const assignments = [];
      for (const project of projects) {
        const projectAssignments = await fetch(`/api/projects/${project.id}/team-members`).then(r => r.json());
        assignments.push(...projectAssignments.map((assignment: any) => ({ ...assignment, project })));
      }
      return assignments;
    },
    enabled: isOpen && projects.length > 0,
  });

  // Fetch organization billing data to check collaboration limits
  const { data: billingData } = useQuery({
    queryKey: [`/api/billing/${authUser?.organizationId || 1}`],
    queryFn: async () => {
      const response = await fetch(`/api/billing/${authUser?.organizationId || 1}`);
      if (!response.ok) throw new Error('Failed to fetch billing data');
      return response.json();
    },
    enabled: isOpen && !!authUser?.organizationId
  });

  const bulkAssignMutation = useMutation({
    mutationFn: async (changes: AssignmentChange[]) => {
      const results = [];
      for (const change of changes) {
        if (change.action === 'assign') {
          const response = await fetch(`/api/projects/${change.projectId}/team-members`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: change.userId,
              role: change.role,
              permissions: getDefaultPermissionsForRole(change.role),
              assignedBy: authUser?.id || 1,
              isActive: true,
            }),
          });
          if (!response.ok) throw new Error(`Failed to assign user ${change.userId} to project ${change.projectId}`);
          results.push(await response.json());
        } else {
          // Find the assignment to remove
          const assignment = allAssignments.find(a => 
            a.projectId === change.projectId && a.userId === change.userId
          );
          if (assignment) {
            const response = await fetch(`/api/project-team-members/${assignment.id}`, {
              method: "DELETE",
            });
            if (!response.ok) throw new Error(`Failed to unassign user ${change.userId} from project ${change.projectId}`);
            results.push({ removed: true });
          }
        }
      }
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/project-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setPendingChanges([]);
      toast({
        title: "Assignments updated",
        description: `Successfully processed ${pendingChanges.length} assignment changes.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Assignment failed",
        description: error instanceof Error ? error.message : "Failed to update assignments",
        variant: "destructive",
      });
    },
  });

  const getDefaultPermissionsForRole = (role: string): string[] => {
    const rolePermissions = {
      developer: ["project:view", "project:manage_tasks", "project:upload_documents", "project:comment"],
      designer: ["project:view", "project:manage_tasks", "project:upload_documents", "project:comment", "project:manage_designs"],
      project_manager: ["project:view", "project:manage_tasks", "project:upload_documents", "project:comment", "project:manage_team", "project:manage_settings"],
    };
    return rolePermissions[role as keyof typeof rolePermissions] || [];
  };

  // Check if collaboration is allowed based on plan
  const canCollaborate = () => {
    if (!billingData) return true; // Allow if data not loaded yet
    
    const currentPlan = billingData.subscriptionPlan || 'solo';
    const planLimits = BILLING_PLANS[currentPlan as BillingPlan];
    
    if (!planLimits) return true; // Allow if plan not found
    
    // Solo plan has teamMembers limit of 1 (no collaboration)
    return planLimits.limits.teamMembers > 1;
  };

  const getCollaborationMessage = () => {
    if (!billingData) return null;
    
    const currentPlan = billingData.subscriptionPlan || 'solo';
    const planLimits = BILLING_PLANS[currentPlan as BillingPlan];
    
    if (!planLimits) return null;
    if (planLimits.limits.teamMembers > 1) return null; // Collaboration allowed
    
    return `Your ${planLimits.name} plan doesn't include team collaboration. Upgrade to Pro to assign team members to projects.`;
  };

  const isUserAssignedToProject = (userId: number, projectId: number): boolean => {
    return allAssignments.some(assignment => 
      assignment.userId === userId && assignment.projectId === projectId
    );
  };

  const hasPendingChange = (userId: number, projectId: number): AssignmentChange | undefined => {
    return pendingChanges.find(change => 
      change.userId === userId && change.projectId === projectId
    );
  };

  const toggleAssignment = (userId: number, projectId: number) => {
    const currentlyAssigned = isUserAssignedToProject(userId, projectId);
    const pendingChange = hasPendingChange(userId, projectId);
    
    if (pendingChange) {
      // Remove pending change
      setPendingChanges(prev => prev.filter(change => 
        !(change.userId === userId && change.projectId === projectId)
      ));
    } else {
      // Add new change
      const action = currentlyAssigned ? 'unassign' : 'assign';
      setPendingChanges(prev => [...prev, {
        userId,
        projectId,
        role: selectedRole,
        action
      }]);
    }
  };

  const getDisplayState = (userId: number, projectId: number) => {
    const currentlyAssigned = isUserAssignedToProject(userId, projectId);
    const pendingChange = hasPendingChange(userId, projectId);
    
    if (pendingChange) {
      return pendingChange.action === 'assign' ? 'pending_assign' : 'pending_unassign';
    }
    return currentlyAssigned ? 'assigned' : 'unassigned';
  };

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredProjects = projects.filter(project => 
    project.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const applyChanges = () => {
    if (pendingChanges.length > 0) {
      bulkAssignMutation.mutate(pendingChanges);
    }
  };

  const resetChanges = () => {
    setPendingChanges([]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass border-white/20 max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Project Assignment Matrix
          </DialogTitle>
          <DialogDescription className="text-slate-300">
            Assign team members to projects in bulk. Select a role and click on cells to toggle assignments.
          </DialogDescription>
          {!canCollaborate() && getCollaborationMessage() && (
            <div className="mt-2 p-3 bg-orange-500/20 border border-orange-500/30 rounded-lg flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-400 flex-shrink-0" />
              <p className="text-orange-200 text-sm">{getCollaborationMessage()}</p>
            </div>
          )}
        </DialogHeader>

        {/* Controls */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search users or projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 glass border-white/20 text-white"
              />
            </div>
            
            <div className="flex gap-2">
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="glass border-white/20 text-white w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="glass border-white/20 bg-black/80">
                  {PROJECT_ROLES.map(role => (
                    <SelectItem key={role.value} value={role.value}>
                      <Badge className={role.color}>
                        {role.label}
                      </Badge>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Pending Changes Summary */}
          {pendingChanges.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass border border-yellow-500/30 p-4 rounded-lg"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-400 font-medium">
                    {pendingChanges.length} pending change{pendingChanges.length > 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-slate-400">
                    {pendingChanges.filter(c => c.action === 'assign').length} assignments, 
                    {pendingChanges.filter(c => c.action === 'unassign').length} removals
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetChanges}
                    className="border-white/20 text-white hover:bg-white/10"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={applyChanges}
                    disabled={bulkAssignMutation.isPending}
                    className="bg-yellow-500 hover:bg-yellow-600 text-black"
                  >
                    {bulkAssignMutation.isPending ? "Applying..." : "Apply Changes"}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Assignment Matrix */}
        <div className="border border-white/10 rounded-lg overflow-hidden">
          <div className="overflow-auto max-h-96">
            <table className="w-full">
              <thead className="bg-white/5 sticky top-0">
                <tr>
                  <th className="text-left p-3 text-sm font-medium text-slate-300 min-w-48">
                    Team Member
                  </th>
                  {filteredProjects.map(project => (
                    <th key={project.id} className="text-center p-3 text-xs font-medium text-slate-300 min-w-20">
                      <div className="truncate" title={project.title}>
                        {project.title.length > 15 ? `${project.title.substring(0, 15)}...` : project.title}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(user => (
                  <tr key={user.id} className="border-t border-white/10 hover:bg-white/5">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <img
                          src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=6366f1&color=ffffff`}
                          alt={user.name}
                          className="w-6 h-6 rounded-full"
                        />
                        <div>
                          <p className="text-white text-sm font-medium">{user.name}</p>
                          <p className="text-xs text-slate-400">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    {filteredProjects.map(project => {
                      const displayState = getDisplayState(user.id, project.id);
                      return (
                        <td key={project.id} className="p-3 text-center">
                          <button
                            onClick={() => canCollaborate() && toggleAssignment(user.id, project.id)}
                            disabled={!canCollaborate()}
                            className={`w-8 h-8 rounded-full border-2 transition-all duration-200 flex items-center justify-center ${
                              !canCollaborate()
                                ? 'border-white/10 text-white/20 cursor-not-allowed'
                                : displayState === 'assigned' 
                                ? 'bg-green-500/20 border-green-500 text-green-400' 
                                : displayState === 'pending_assign'
                                ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400'
                                : displayState === 'pending_unassign'
                                ? 'bg-red-500/20 border-red-500 text-red-400'
                                : 'border-white/20 hover:border-white/40 hover:bg-white/5'
                            }`}
                            title={
                              !canCollaborate()
                                ? 'Team collaboration not available on your current plan'
                                : displayState === 'assigned' 
                                ? 'Currently assigned - click to remove' 
                                : displayState === 'pending_assign'
                                ? 'Pending assignment'
                                : displayState === 'pending_unassign'
                                ? 'Pending removal'
                                : 'Not assigned - click to assign'
                            }
                          >
                            {displayState === 'assigned' && <Check className="h-4 w-4" />}
                            {displayState === 'pending_assign' && <UserPlus className="h-3 w-3" />}
                            {displayState === 'pending_unassign' && <X className="h-4 w-4" />}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center">
              <Check className="h-2 w-2 text-green-400" />
            </div>
            <span>Assigned</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-yellow-500/20 border-2 border-yellow-500 flex items-center justify-center">
              <UserPlus className="h-2 w-2 text-yellow-400" />
            </div>
            <span>Pending Assignment</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center">
              <X className="h-2 w-2 text-red-400" />
            </div>
            <span>Pending Removal</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full border-2 border-white/20"></div>
            <span>Not Assigned</span>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-white/10">
          <Button variant="outline" onClick={onClose} className="glass border-white/20">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}