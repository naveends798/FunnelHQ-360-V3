import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useTeam } from "@/hooks/useTeam";
import { useToast } from "@/hooks/use-toast";
import { OrganizationInvitations } from "@/components/organization-invitations";
import InvitationManagementPanel from "@/components/invitation-management-panel";
import SecurityMonitor from "@/components/security-monitor";
import Sidebar from "@/components/sidebar";
import ProjectAssignmentMatrix from "@/components/project-assignment-matrix";
import { BILLING_PLANS, type BillingPlan } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { 
  Users, 
  UserPlus, 
  Mail, 
  MoreHorizontal, 
  Crown, 
  Shield, 
  User,
  Check,
  X,
  RefreshCw,
  Search,
  Filter,
  UserMinus,
  UserCheck2,
  Edit,
  Settings,
  AlertTriangle,
  ArrowUpRight,
  Upload,
  Camera,
  Trash2
} from "lucide-react";

// Helper functions for team member display

const getRoleIcon = (role: string) => {
  switch (role) {
    case "admin":
      return Crown;
    case "team_member":
      return Shield;
    case "client":
      return User;
    default:
      return User;
  }
};

const getRoleColor = (role: string) => {
  switch (role) {
    case "admin":
      return "bg-red-500/20 text-red-400 border-red-500/30";
    case "team_member":
      return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    case "client":
      return "bg-green-500/20 text-green-400 border-green-500/30";
    default:
      return "bg-slate-500/20 text-slate-400 border-slate-500/30";
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "active":
      return "bg-green-500/20 text-green-400 border-green-500/30";
    case "pending":
      return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    case "suspended":
      return "bg-red-500/20 text-red-400 border-red-500/30";
    case "inactive":
      return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    default:
      return "bg-slate-500/20 text-slate-400 border-slate-500/30";
  }
};

const getSpecializationColor = (specialization: string) => {
  switch (specialization) {
    case "developer":
      return "bg-purple-500/20 text-purple-400 border-purple-500/30";
    case "designer":
      return "bg-pink-500/20 text-pink-400 border-pink-500/30";
    case "project_manager":
      return "bg-orange-500/20 text-orange-400 border-orange-500/30";
    default:
      return "bg-slate-500/20 text-slate-400 border-slate-500/30";
  }
};

const formatTimeAgo = (date: Date) => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
};

export default function TeamPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("team_member");
  const [inviteSpecialization, setInviteSpecialization] = useState<string>("developer");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isAssignmentMatrixOpen, setIsAssignmentMatrixOpen] = useState(false);
  
  // Team Member Edit Modal State
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editSpecialization, setEditSpecialization] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editAvatarFile, setEditAvatarFile] = useState<File | null>(null);
  const [editAvatarPreview, setEditAvatarPreview] = useState<string | null>(null);

  const { user, isAdmin, currentRole } = useAuth();
  const { toast } = useToast();
  
  // Fetch organization billing data to determine plan
  const { data: billingData } = useQuery({
    queryKey: [`/api/billing/1`], // Organization ID 1
    queryFn: async () => {
      const response = await fetch(`/api/billing/1`);
      if (!response.ok) throw new Error('Failed to fetch billing data');
      return response.json();
    }
  });
  
  // Use test plan instead of billing data plan
  const currentPlan = 'pro' as BillingPlan;
  
  // Use team management hook
  const {
    teamMembers,
    invitations,
    loading,
    error,
    addTeamMember,
    inviteUser,
    resendInvitation,
    cancelInvitation,
    updateMemberRole,
    updateMemberStatus,
    suspendMember,
    removeMember,
    refetch
  } = useTeam({
    organizationId: 1 // TODO: Get from auth context
  });

  const filteredMembers = teamMembers.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || member.role === roleFilter;
    const matchesStatus = statusFilter === "all" || member.status === statusFilter;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddTeamMember = async () => {
    if (!inviteName || !inviteEmail || !inviteRole) return;

    try {
      await addTeamMember(inviteName, inviteEmail, inviteRole, inviteSpecialization, avatarFile);
      setInviteName("");
      setInviteEmail("");
      setInviteRole("team_member");
      setInviteSpecialization("developer");
      setAvatarFile(null);
      setAvatarPreview(null);
      setIsInviteDialogOpen(false);
      
      toast({
        title: "Team member added",
        description: `${inviteName} has been added as ${inviteSpecialization}`,
      });
    } catch (error) {
      toast({
        title: "Error adding team member",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleResendInvitation = async (invitationId: number) => {
    try {
      await resendInvitation(invitationId);
      toast({
        title: "Invitation resent",
        description: "The invitation has been resent successfully",
      });
    } catch (error) {
      toast({
        title: "Error resending invitation",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleCancelInvitation = async (invitationId: number) => {
    try {
      await cancelInvitation(invitationId);
      toast({
        title: "Invitation cancelled",
        description: "The invitation has been cancelled",
      });
    } catch (error) {
      toast({
        title: "Error cancelling invitation",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleUpdateMemberRole = async (memberId: number, newRole: string) => {
    try {
      await updateMemberRole(memberId, newRole);
      toast({
        title: "Role updated",
        description: "Member role has been updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error updating role",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleSuspendMember = async (memberId: number, isSuspended: boolean) => {
    try {
      await suspendMember(memberId, !isSuspended);
      toast({
        title: isSuspended ? "Member reactivated" : "Member suspended",
        description: `Member has been ${isSuspended ? "reactivated" : "suspended"} successfully`,
      });
    } catch (error) {
      toast({
        title: "Error updating member status",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleRemoveMember = async (memberId: number, memberName: string) => {
    if (window.confirm(`Are you sure you want to remove ${memberName} from this organization? They will lose access to all projects and resources.`)) {
      try {
        await removeMember(memberId);
        toast({
          title: "Team member removed",
          description: `${memberName} has been removed from the organization`,
        });
      } catch (error) {
        toast({
          title: "Error removing team member",
          description: error instanceof Error ? error.message : "Unknown error",
          variant: "destructive",
        });
      }
    }
  };

  const handleMemberClick = (member: any) => {
    setSelectedMember(member);
    setEditName(member.name);
    setEditEmail(member.email);
    setEditRole(member.role);
    setEditSpecialization(member.specialization || "developer");
    setEditStatus(member.status);
    setEditAvatarPreview(member.avatar);
    setEditAvatarFile(null);
    setIsEditModalOpen(true);
  };

  const handleEditAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setEditAvatarFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setEditAvatarPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveChanges = async () => {
    if (!selectedMember) return;

    console.log(`🔄 Save Changes: Starting save for user ${selectedMember.id}`);
    console.log(`📊 Current member:`, { id: selectedMember.id, role: selectedMember.role, status: selectedMember.status });
    console.log(`📝 Form values:`, { editRole, editStatus });

    try {
      let hasChanges = false;

      // Update role if changed
      if (editRole !== selectedMember.role) {
        console.log(`🔄 Role changed: ${selectedMember.role} → ${editRole}`);
        await updateMemberRole(selectedMember.id, editRole);
        hasChanges = true;
      }

      // Update status if changed
      if (editStatus !== selectedMember.status) {
        console.log(`🔄 Status changed: ${selectedMember.status} → ${editStatus}`);
        await updateMemberStatus(selectedMember.id, editStatus);
        hasChanges = true;
      }

      // TODO: Add name and email update functionality
      // TODO: Add avatar update functionality

      // Let optimistic updates handle the UI changes
      // We'll refetch manually later if needed
      console.log(`📊 Save completed. hasChanges: ${hasChanges}`);

      setIsEditModalOpen(false);
      toast({
        title: "Member updated",
        description: `${editName} has been updated successfully`,
      });
    } catch (error) {
      toast({
        title: "Error updating member",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleDeleteMember = async () => {
    if (!selectedMember) return;

    // Prevent self-deletion
    if (selectedMember.id === user?.id) {
      toast({
        title: "Cannot delete yourself",
        description: "You cannot remove your own account from the organization",
        variant: "destructive",
      });
      return;
    }

    // Show appropriate confirmation message
    const isLastAdmin = selectedMember.role === "admin" && teamMembers.filter(m => m.role === "admin").length === 1;
    let confirmMessage = `Are you sure you want to permanently remove ${selectedMember.name} from this organization? This action cannot be undone.`;
    
    if (isLastAdmin) {
      confirmMessage = `Warning: ${selectedMember.name} is the last admin in this organization. Removing them will leave the organization without any administrators. Are you sure you want to continue?`;
    }

    if (window.confirm(confirmMessage)) {
      try {
        await removeMember(selectedMember.id);
        setIsEditModalOpen(false);
        toast({
          title: "Member removed",
          description: `${selectedMember.name} has been removed from the organization`,
        });
      } catch (error) {
        toast({
          title: "Error removing member",
          description: error instanceof Error ? error.message : "Unknown error",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <div className="min-h-screen gradient-bg">
      <Sidebar />
      
      <main className="ml-64 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Admin Plan Switcher for Testing */}
          {isAdmin && (
            <div>
            </div>
          )}
          
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-4 mb-2">
                <h1 className="text-3xl font-bold text-white">Team Management</h1>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-slate-400">
                    {teamMembers.length} / {BILLING_PLANS[currentPlan].limits.teamMembers === -1 ? 'unlimited' : BILLING_PLANS[currentPlan].limits.teamMembers} members
                  </span>
                  <span className="px-2 py-1 rounded text-xs font-medium bg-purple-900/30 text-purple-400 border border-purple-600">
                    {BILLING_PLANS[currentPlan].name} Plan
                  </span>
                </div>
              </div>
              <p className="text-slate-400">
                Manage your team members, roles, and invitations
              </p>
              <div className="flex items-center space-x-4 mt-3">
                <div className="text-xs text-slate-500">
                  <span className="text-white font-medium">{teamMembers.length}</span> active members
                </div>
                <div className="text-xs text-slate-500">
                  <span className="text-white font-medium">{invitations.length}</span> pending invitations
                </div>
                <div className="text-xs text-slate-500">
                  <span className="text-white font-medium">{teamMembers.filter(m => m.role === "admin").length}</span> admins
                </div>
              </div>
              {error && (
                <p className="text-red-400 text-sm mt-2">
                  Error: {error}
                </p>
              )}
            </div>
            
            {isAdmin && (
              <div className="flex space-x-3">
                <Button
                  onClick={() => setIsAssignmentMatrixOpen(true)}
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Project Assignments
                </Button>
                
                
                <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      className="gradient-primary disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={currentPlan === 'solo' && teamMembers.length >= BILLING_PLANS.solo.limits.teamMembers}
                      title={currentPlan === 'solo' && teamMembers.length >= BILLING_PLANS.solo.limits.teamMembers ? "Solo plan is limited to 1 team member. Upgrade to Pro for unlimited team members." : ""}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add Team Member
                    </Button>
                  </DialogTrigger>
                <DialogContent className="glass-dark border-white/10">
                  <DialogHeader>
                    <DialogTitle className="text-white">Add Team Member</DialogTitle>
                    <DialogDescription className="text-slate-400">
                      Add a new team member to your organization
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name" className="text-white">Name *</Label>
                      <Input
                        id="name"
                        type="text"
                        placeholder="Enter full name"
                        value={inviteName}
                        onChange={(e) => setInviteName(e.target.value)}
                        className="bg-white/5 border-white/10 text-white"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="email" className="text-white">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="Enter email address"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        className="bg-white/5 border-white/10 text-white"
                      />
                    </div>

                    <div>
                      <Label className="text-white">Profile Picture</Label>
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          {avatarPreview ? (
                            <img
                              src={avatarPreview}
                              alt="Profile preview"
                              className="w-16 h-16 rounded-full object-cover border-2 border-white/20"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-full bg-white/10 border-2 border-white/20 flex items-center justify-center">
                              <User className="h-8 w-8 text-white/40" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <input
                            type="file"
                            id="avatar"
                            accept="image/*"
                            onChange={handleAvatarChange}
                            className="hidden"
                          />
                          <label
                            htmlFor="avatar"
                            className="flex items-center justify-center px-4 py-2 border border-white/20 rounded-md cursor-pointer hover:bg-white/10 transition-colors"
                          >
                            <Upload className="h-4 w-4 mr-2 text-white" />
                            <span className="text-white text-sm">
                              {avatarFile ? 'Change Photo' : 'Upload Photo'}
                            </span>
                          </label>
                          <p className="text-xs text-slate-400 mt-1">
                            PNG, JPG, GIF up to 5MB
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="role" className="text-white">Organization Role</Label>
                      <Select value={inviteRole} onValueChange={setInviteRole}>
                        <SelectTrigger className="bg-white/5 border-white/10 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="glass-dark border-white/10">
                          <SelectItem value="team_member">Team Member</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="client">Client</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {inviteRole !== "client" && (
                      <div>
                        <Label htmlFor="specialization" className="text-white">Specialization</Label>
                        <Select value={inviteSpecialization} onValueChange={setInviteSpecialization}>
                          <SelectTrigger className="bg-white/5 border-white/10 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="glass-dark border-white/10">
                            <SelectItem value="developer">Developer</SelectItem>
                            <SelectItem value="designer">Designer</SelectItem>
                            <SelectItem value="project_manager">Project Manager</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    
                    <div className="flex justify-end space-x-2 pt-4">
                      <Button
                        variant="ghost"
                        onClick={() => setIsInviteDialogOpen(false)}
                        className="text-slate-400 hover:text-white"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleAddTeamMember}
                        className="gradient-primary"
                        disabled={!inviteName || !inviteEmail}
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Add Team Member
                      </Button>
                    </div>
                  </div>
                </DialogContent>
                </Dialog>
              </div>
            )}
          </div>

          {/* Organization Invitations */}
          {currentRole === 'admin' && (
            <div className="mb-8">
              <OrganizationInvitations />
            </div>
          )}

          {/* Solo Plan Notification */}
          {currentPlan === 'solo' && (
            <div className="mb-6 p-4 bg-purple-900/20 border border-purple-600 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-purple-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-purple-400 font-medium mb-1">Solo Plan Limitations</h3>
                  <p className="text-purple-300 text-sm mb-3">
                    Your Solo plan is designed for individual use and doesn't include team collaboration features. 
                    You can manage your own projects, but cannot invite team members or assign collaborators.
                  </p>
                  <div className="flex items-center gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="border-purple-600 text-purple-400 hover:bg-purple-900/30"
                    >
                      <ArrowUpRight className="h-3 w-3 mr-1" />
                      Upgrade to Pro
                    </Button>
                    <span className="text-purple-400/80 text-xs">
                      Get unlimited projects and unlimited team members
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="flex items-center space-x-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search members..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/5 border-white/10 text-white"
              />
            </div>
            
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-32 bg-white/5 border-white/10 text-white">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="glass-dark border-white/10">
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="team_member">Team Member</SelectItem>
                <SelectItem value="client">Client</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32 bg-white/5 border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="glass-dark border-white/10">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Team Members */}
            <div className="lg:col-span-2">
              <Card className="glass-dark border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Users className="h-5 w-5 mr-2" />
                    Team Members ({filteredMembers.length})
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Manage your team members and their roles
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-8">
                      <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                      <p className="text-slate-400">Loading team members...</p>
                    </div>
                  ) : filteredMembers.length === 0 ? (
                    <div className="text-center py-12">
                      <Users className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-white mb-2">No team members found</h3>
                      <p className="text-slate-400 mb-4">
                        {searchTerm || roleFilter !== "all" || statusFilter !== "all" 
                          ? "No members match your current filters" 
                          : "Start building your team by inviting members"}
                      </p>
                      {(searchTerm || roleFilter !== "all" || statusFilter !== "all") && (
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setSearchTerm("");
                            setRoleFilter("all");
                            setStatusFilter("all");
                          }}
                          className="text-slate-400 hover:text-white"
                        >
                          Clear filters
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredMembers.map((member, index) => {
                        const RoleIcon = getRoleIcon(member.role);
                        
                        return (
                          <motion.div
                            key={member.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="glass rounded-lg p-4 hover:bg-white/10 transition-all cursor-pointer group hover:scale-[1.02] hover:shadow-lg"
                            onClick={() => handleMemberClick(member)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <img
                                  src={member.avatar || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face"}
                                  alt={member.name}
                                  className="w-10 h-10 rounded-full object-cover"
                                />
                                <div>
                                  <h3 className="font-medium text-white">{member.name}</h3>
                                  <p className="text-sm text-slate-400">{member.email}</p>
                                  {member.lastLoginAt && (
                                    <p className="text-xs text-slate-500">
                                      Last active {formatTimeAgo(new Date(member.lastLoginAt))}
                                    </p>
                                  )}
                                </div>
                              </div>
                            
                            <div className="flex items-center space-x-2">
                              <Badge className={getRoleColor(member.role)}>
                                <RoleIcon className="h-3 w-3 mr-1" />
                                {member.role.replace('_', ' ')}
                              </Badge>
                              
                              {member.specialization && (
                                <Badge className={getSpecializationColor(member.specialization)}>
                                  {member.specialization.replace('_', ' ')}
                                </Badge>
                              )}
                              
                              <Badge className={getStatusColor(member.status)}>
                                {member.status}
                              </Badge>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Pending Invitations */}
            <div>
              <Card className="glass-dark border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Mail className="h-5 w-5 mr-2" />
                    Pending Invitations ({invitations.length})
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Manage pending team invitations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {invitations.map((invitation, index) => {
                      const RoleIcon = getRoleIcon(invitation.role);
                      
                      return (
                        <motion.div
                          key={invitation.id}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="glass rounded-lg p-3"
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-white truncate">
                                {invitation.email}
                              </p>
                              <div className="flex items-center space-x-1">
                                <Badge className={getRoleColor(invitation.role)} variant="outline">
                                  <RoleIcon className="h-3 w-3 mr-1" />
                                  {invitation.role.replace('_', ' ')}
                                </Badge>
                                {invitation.specialization && (
                                  <Badge className={getSpecializationColor(invitation.specialization)} variant="outline">
                                    {invitation.specialization.replace('_', ' ')}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            
                            <p className="text-xs text-slate-500">
                              Invited by {
                                teamMembers.find(m => m.id === invitation.invitedBy)?.name || 
                                `User ${invitation.invitedBy}`
                              }
                            </p>
                            
                            <p className="text-xs text-slate-500">
                              Expires {formatTimeAgo(new Date(invitation.expiresAt))}
                            </p>
                            
                            {isAdmin && (
                              <div className="flex space-x-1 pt-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleResendInvitation(invitation.id)}
                                  className="h-6 text-xs text-slate-400 hover:text-white"
                                >
                                  <RefreshCw className="h-3 w-3 mr-1" />
                                  Resend
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleCancelInvitation(invitation.id)}
                                  className="h-6 text-xs text-slate-400 hover:text-red-400"
                                >
                                  <X className="h-3 w-3 mr-1" />
                                  Cancel
                                </Button>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                    
                    {invitations.length === 0 && (
                      <div className="text-center py-4">
                        <Mail className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                        <p className="text-slate-400 text-sm">No pending invitations</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      
      {/* Team Member Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="glass-dark border-white/10 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center">
              <Edit className="h-5 w-5 mr-2" />
              Edit Team Member
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Update member details, role, and status
            </DialogDescription>
          </DialogHeader>
          
          {selectedMember && (
            <div className="space-y-6">
              {/* Profile Section */}
              <div className="flex items-start space-x-6 p-4 glass rounded-lg">
                <div className="flex-shrink-0">
                  {editAvatarPreview ? (
                    <img
                      src={editAvatarPreview}
                      alt="Profile preview"
                      className="w-20 h-20 rounded-full object-cover border-2 border-white/20"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-white/10 border-2 border-white/20 flex items-center justify-center">
                      <User className="h-10 w-10 text-white/40" />
                    </div>
                  )}
                  <input
                    type="file"
                    id="editAvatar"
                    accept="image/*"
                    onChange={handleEditAvatarChange}
                    className="hidden"
                  />
                  <label
                    htmlFor="editAvatar"
                    className="mt-2 flex items-center justify-center px-3 py-1 border border-white/20 rounded-md cursor-pointer hover:bg-white/10 transition-colors text-xs"
                  >
                    <Camera className="h-3 w-3 mr-1 text-white" />
                    <span className="text-white">Change</span>
                  </label>
                </div>
                
                <div className="flex-1 space-y-4">
                  <div>
                    <Label htmlFor="editName" className="text-white">Full Name</Label>
                    <Input
                      id="editName"
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="bg-white/5 border-white/10 text-white"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="editEmail" className="text-white">Email Address</Label>
                    <Input
                      id="editEmail"
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="bg-white/5 border-white/10 text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Role and Status Section */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editRole" className="text-white">Organization Role</Label>
                  <Select value={editRole} onValueChange={setEditRole}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="glass-dark border-white/10">
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="team_member">Team Member</SelectItem>
                      <SelectItem value="client">Client</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="editStatus" className="text-white">Status</Label>
                  <Select value={editStatus} onValueChange={setEditStatus}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="glass-dark border-white/10">
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {editRole !== "client" && (
                <div>
                  <Label htmlFor="editSpecialization" className="text-white">Specialization</Label>
                  <Select value={editSpecialization} onValueChange={setEditSpecialization}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="glass-dark border-white/10">
                      <SelectItem value="developer">Developer</SelectItem>
                      <SelectItem value="designer">Designer</SelectItem>
                      <SelectItem value="project_manager">Project Manager</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Member Info */}
              <div className="p-4 glass rounded-lg">
                <h4 className="text-white font-medium mb-2">Member Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-400">Member ID:</span>
                    <span className="text-white ml-2">{selectedMember.id}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Joined:</span>
                    <span className="text-white ml-2">
                      {selectedMember.createdAt ? new Date(selectedMember.createdAt).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Last Active:</span>
                    <span className="text-white ml-2">
                      {selectedMember.lastLoginAt ? formatTimeAgo(new Date(selectedMember.lastLoginAt)) : 'Never'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Projects:</span>
                    <span className="text-white ml-2">0</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-6 border-t border-white/10">
                {/* Debug info - remove after testing */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="text-xs text-slate-500 mb-4 text-center">
                    Debug: isAdmin: {String(isAdmin)} | memberRole: {selectedMember.role}
                  </div>
                )}
                
                <div className="flex flex-col space-y-3">
                  {/* Primary Actions Row */}
                  <div className="flex space-x-3">
                    <Button
                      variant="ghost"
                      onClick={() => setIsEditModalOpen(false)}
                      className="flex-1 text-slate-400 hover:text-white hover:bg-white/10"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSaveChanges}
                      className="flex-1 gradient-primary"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Save Changes
                    </Button>
                  </div>
                  
                  {/* Destructive Action Row */}
                  {isAdmin && (
                    <div className="flex justify-center pt-2">
                      <Button
                        onClick={handleDeleteMember}
                        variant="outline"
                        className="text-red-400 border-red-400/30 hover:text-red-300 hover:bg-red-900/20 hover:border-red-400/50"
                        disabled={selectedMember.role === "admin" && selectedMember.id === user?.id}
                        title={selectedMember.role === "admin" && selectedMember.id === user?.id ? "Cannot delete yourself" : "Remove member from organization"}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove Member from Organization
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Project Assignment Matrix */}
      <ProjectAssignmentMatrix
        isOpen={isAssignmentMatrixOpen}
        onClose={() => setIsAssignmentMatrixOpen(false)}
      />
    </div>
  );
}