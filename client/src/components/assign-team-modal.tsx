import { useState } from "react";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { hasProjectPermission } from "@/lib/permissions";
import { User, UserCheck, X, Plus, Shield } from "lucide-react";
import type { User as UserType, ProjectTeamMember } from "@shared/schema";

interface AssignTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: number;
  projectTitle: string;
}

const PROJECT_ROLES = [
  { value: "project_manager", label: "Project Manager", color: "bg-purple-500/20 text-purple-400" },
  { value: "developer", label: "Developer", color: "bg-blue-500/20 text-blue-400" },
  { value: "designer", label: "Designer", color: "bg-green-500/20 text-green-400" },
  { value: "reviewer", label: "Reviewer", color: "bg-orange-500/20 text-orange-400" },
  { value: "client", label: "Client", color: "bg-gray-500/20 text-gray-400" },
];

export default function AssignTeamModal({ 
  isOpen, 
  onClose, 
  projectId, 
  projectTitle 
}: AssignTeamModalProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<string>("");
  const { authUser, currentRole, hasPermission } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check if user can manage team members
  const canManageTeam = hasPermission("projects", "assign_members") || currentRole === "admin";

  const { data: users = [] } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
    enabled: isOpen && canManageTeam,
  });

  const { data: currentTeamMembers = [] } = useQuery<(ProjectTeamMember & { user: UserType })[]>({
    queryKey: [`/api/projects/${projectId}/team-members`],
    enabled: isOpen,
  });

  const addTeamMemberMutation = useMutation({
    mutationFn: async (data: { userId: number; role: string; permissions: string[] }) => {
      const response = await fetch(`/api/projects/${projectId}/team-members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: data.userId,
          role: data.role,
          permissions: data.permissions,
          assignedBy: authUser?.id || 1,
          isActive: true,
        }),
      });
      if (!response.ok) throw new Error("Failed to add team member");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/team-members`] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Team member added",
        description: "The team member has been successfully assigned to the project.",
      });
      setSelectedUserId("");
      setSelectedRole("");
    },
    onError: () => {
      toast({
        title: "Failed to add team member",
        description: "There was an error assigning the team member to the project.",
        variant: "destructive",
      });
    },
  });

  const removeTeamMemberMutation = useMutation({
    mutationFn: async (memberId: number) => {
      const response = await fetch(`/api/project-team-members/${memberId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to remove team member");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/team-members`] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Team member removed",
        description: "The team member has been removed from the project.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to remove team member",
        description: "There was an error removing the team member from the project.",
        variant: "destructive",
      });
    },
  });

  // Get users not currently assigned to this project
  const availableUsers = users.filter(
    user => !currentTeamMembers.some(member => member.userId === user.id)
  );

  const handleAddTeamMember = () => {
    if (!selectedUserId || !selectedRole) {
      toast({
        title: "Missing information",
        description: "Please select both a user and a role.",
        variant: "destructive",
      });
      return;
    }

    // Get default permissions for the selected role
    const defaultPermissions = getDefaultPermissionsForRole(selectedRole);

    addTeamMemberMutation.mutate({
      userId: parseInt(selectedUserId),
      role: selectedRole,
      permissions: defaultPermissions,
    });
  };

  const handleRemoveTeamMember = (memberId: number) => {
    removeTeamMemberMutation.mutate(memberId);
  };

  const getDefaultPermissionsForRole = (role: string): string[] => {
    const rolePermissions = {
      project_manager: [
        "project:view", "project:update", "project:manage_tasks",
        "project:manage_milestones", "project:assign_members", "project:view_analytics"
      ],
      developer: ["project:view", "project:manage_tasks", "project:upload_documents", "project:comment"],
      designer: ["project:view", "project:manage_tasks", "project:upload_documents", "project:comment", "project:manage_designs"],
      reviewer: ["project:view", "project:comment", "project:review"],
      client: ["project:view", "project:comment"],
    };
    return rolePermissions[role as keyof typeof rolePermissions] || [];
  };

  const getRoleConfig = (role: string) => {
    return PROJECT_ROLES.find(r => r.value === role) || PROJECT_ROLES[0];
  };

  if (!canManageTeam) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="glass border-white/20">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Shield className="h-5 w-5 text-red-400" />
              Access Denied
            </DialogTitle>
            <DialogDescription className="text-slate-300">
              You don't have permission to manage team members for this project.
            </DialogDescription>
          </DialogHeader>
          <Button onClick={onClose} variant="outline" className="glass border-white/20">
            Close
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass border-white/20 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" />
            Manage Team - {projectTitle}
          </DialogTitle>
          <DialogDescription className="text-slate-300">
            Assign team members and manage their roles for this project.
          </DialogDescription>
        </DialogHeader>

        {/* Add New Team Member */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="user" className="text-slate-300">
                Select User
              </Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="glass border-white/20 text-white">
                  <SelectValue placeholder="Choose a user" />
                </SelectTrigger>
                <SelectContent className="glass border-white/20 bg-black/80">
                  {availableUsers.map(user => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      <div className="flex items-center gap-2">
                        <img
                          src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=6366f1&color=ffffff`}
                          alt={user.name}
                          className="w-6 h-6 rounded-full"
                        />
                        <span>{user.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role" className="text-slate-300">
                Project Role
              </Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="glass border-white/20 text-white">
                  <SelectValue placeholder="Choose a role" />
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

            <div className="flex items-end">
              <Button
                onClick={handleAddTeamMember}
                disabled={!selectedUserId || !selectedRole || addTeamMemberMutation.isPending}
                className="w-full gradient-primary"
              >
                {addTeamMemberMutation.isPending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Member
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Current Team Members */}
        <div className="space-y-4">
          <h4 className="text-white font-semibold flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            Current Team Members ({currentTeamMembers.length})
          </h4>

          <div className="space-y-2">
            {currentTeamMembers.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No team members assigned to this project yet.</p>
              </div>
            ) : (
              currentTeamMembers.map(member => {
                const roleConfig = getRoleConfig(member.role);
                return (
                  <motion.div
                    key={member.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between p-3 glass rounded-lg border border-white/10"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={member.user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.user.name)}&background=6366f1&color=ffffff`}
                        alt={member.user.name}
                        className="w-8 h-8 rounded-full"
                      />
                      <div>
                        <p className="text-white font-medium">{member.user.name}</p>
                        <p className="text-xs text-slate-400">{member.user.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge className={roleConfig.color}>
                        {roleConfig.label}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveTeamMember(member.id)}
                        disabled={removeTeamMemberMutation.isPending}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </motion.div>
                );
              })
            )}
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