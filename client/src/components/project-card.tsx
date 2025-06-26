import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProgressRing } from "@/components/ui/progress-ring";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { formatCurrency, getStatusColor, calculateDaysLeft, cn } from "@/lib/utils";
import { type Project, type Client, type ProjectTeamMember, type User } from "@shared/schema";
import { MoreHorizontal, ArrowRight, Calendar, DollarSign, Users, Clock, AlertTriangle, Settings, UserPlus } from "lucide-react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import EditProjectStatsModal from "@/components/edit-project-stats-modal";
import AssignTeamModal from "@/components/assign-team-modal";

type ProjectWithClient = Project & { client: Client };

interface ProjectCardProps {
  project: ProjectWithClient;
  onProjectUpdate?: (projectId: number, updates: Partial<Project>) => void;
}

export default function ProjectCard({ project, onProjectUpdate }: ProjectCardProps) {
  const [showEditModal, setShowEditModal] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const { currentRole, hasPermission } = useAuth();
  
  const daysLeft = calculateDaysLeft(project.endDate);
  const budgetUsedPercent = (parseFloat(project.budgetUsed || "0") / parseFloat(project.budget)) * 100;
  const isOverBudget = budgetUsedPercent > 90;
  const isUrgent = daysLeft <= 7;

  // Fetch project team members
  const { data: teamMembers = [] } = useQuery<(ProjectTeamMember & { user: User })[]>({
    queryKey: [`/api/projects/${project.id}/team-members`],
  });

  // Check permissions
  const canEditProject = hasPermission("projects", "update") || currentRole === "admin";
  const canManageTeam = hasPermission("projects", "assign_members") || currentRole === "admin";

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case "active":
        return isOverBudget ? "Review Needed" : "On Track";
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const getStatusColor = (status: string) => {
    if (isOverBudget || isUrgent) return "bg-red-500/20 text-red-400 border border-red-500/30";
    switch (status.toLowerCase()) {
      case "on track":
        return "bg-green-500/20 text-green-400 border border-green-500/30";
      case "active":
        return "bg-blue-500/20 text-blue-400 border border-blue-500/30";
      default:
        return "bg-slate-500/20 text-slate-400 border border-slate-500/30";
    }
  };

  const handleProjectUpdate = async (updates: Partial<Project>) => {
    if (onProjectUpdate) {
      onProjectUpdate(project.id, updates);
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowEditModal(true);
  };

  const handleTeamClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowTeamModal(true);
  };

  return (
    <>
    <Link href={`/projects/${project.id}`}>
      <motion.div
        whileHover={{ scale: 1.02, y: -2 }}
        transition={{ duration: 0.2 }}
        className="group cursor-pointer"
      >
        <Card className={cn(
          "bg-white/5 border-white/10 p-4 transition-all duration-300 relative overflow-hidden",
          "hover:bg-white/10 hover:shadow-xl hover:shadow-primary/10",
          "hover:border-white/20 h-full"
        )}>
        {/* Background glow effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Header */}
        <div className="mb-4 relative z-10">
          <div className="mb-2">
            <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-primary-200 transition-colors truncate">
              {project.title}
            </h3>
            <div className="text-slate-400 text-xs">
              <span>{project.client?.name || 'No Client'}</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div></div>
            <div className="flex items-center space-x-2">
              {(isUrgent || isOverBudget) && (
                <AlertTriangle className="h-3 w-3 text-red-400" />
              )}
              <Badge className={cn(getStatusColor(getStatusDisplay(project.status)), "text-xs px-2 py-1 whitespace-nowrap")}>
                {getStatusDisplay(project.status)}
              </Badge>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {canManageTeam && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleTeamClick}
                    className="h-6 w-6 p-0 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                    title="Manage team"
                  >
                    <UserPlus className="h-3 w-3" />
                  </Button>
                )}
                {canEditProject && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleEditClick}
                    className="h-6 w-6 p-0 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                    title="Edit project stats"
                  >
                    <Settings className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Progress Section */}
        <div className="grid grid-cols-4 gap-3 mb-4 relative z-10">
          <div className="flex flex-col items-center">
            <ProgressRing 
              progress={project.progress || 0} 
              size={40} 
              strokeWidth={3}
              showValue={false}
              className="mb-1"
            />
            <div className="text-center">
              <p className="text-white font-semibold text-sm">{project.progress || 0}%</p>
              <p className="text-slate-400 text-xs">Progress</p>
            </div>
          </div>
          
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 glass rounded-lg flex items-center justify-center mb-1">
              <DollarSign className="h-3 w-3 text-green-400" />
            </div>
            <div className="text-center">
              <p className="text-white font-semibold text-xs">{formatCurrency(parseFloat(project.budgetUsed || "0"))}</p>
              <p className="text-slate-400 text-xs">of {formatCurrency(parseFloat(project.budget || "0"))}</p>
            </div>
          </div>
          
          <div className="flex flex-col items-center">
            <div className={cn(
              "w-8 h-8 glass rounded-lg flex items-center justify-center mb-1",
              isUrgent && "bg-red-500/20 border border-red-500/30"
            )}>
              <Clock className={cn("h-3 w-3", isUrgent ? "text-red-400" : "text-blue-400")} />
            </div>
            <div className="text-center">
              <p className={cn("font-semibold text-xs", isUrgent ? "text-red-400" : "text-white")}>
                {daysLeft} days
              </p>
              <p className="text-slate-400 text-xs">Left</p>
            </div>
          </div>
          
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 glass rounded-lg flex items-center justify-center mb-1">
              <Users className="h-3 w-3 text-purple-400" />
            </div>
            <div className="text-center">
              <p className="text-white font-semibold text-xs">{teamMembers.length}</p>
              <p className="text-slate-400 text-xs">Team</p>
            </div>
          </div>
        </div>

        {/* Team Members */}
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center space-x-2">
            <span className="text-slate-400 text-xs">Team:</span>
            <div className="flex -space-x-1">
              {teamMembers.slice(0, 3).map((member) => (
                <div
                  key={member.id}
                  className="w-6 h-6 rounded-full border border-slate-800 overflow-hidden"
                  title={`${member.user.name} (${member.role.replace('_', ' ')})`}
                >
                  <img
                    src={member.user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.user.name)}&background=6366f1&color=ffffff`}
                    alt={member.user.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
              {teamMembers.length > 3 && (
                <div 
                  className="w-6 h-6 rounded-full border border-slate-800 bg-primary flex items-center justify-center"
                  title={`${teamMembers.length - 3} more members`}
                >
                  <span className="text-white text-xs font-medium">
                    +{teamMembers.length - 3}
                  </span>
                </div>
              )}
              {teamMembers.length === 0 && (
                <span className="text-slate-500 text-xs">No team assigned</span>
              )}
            </div>
          </div>
          
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <ArrowRight className="h-4 w-4 text-primary-400" />
          </div>
        </div>
        
        {/* Project Tags */}
        {project.tags && project.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-white/10 relative z-10">
            {project.tags.slice(0, 2).map((tag, index) => (
              <Badge 
                key={index}
                variant="secondary" 
                className="bg-white/5 text-slate-300 border-white/10 text-xs px-2 py-0.5"
              >
                {tag}
              </Badge>
            ))}
            {project.tags.length > 2 && (
              <Badge 
                variant="secondary" 
                className="bg-white/5 text-slate-400 border-white/10 text-xs px-2 py-0.5"
              >
                +{project.tags.length - 2}
              </Badge>
            )}
          </div>
        )}
        </Card>
      </motion.div>
    </Link>

    {/* Edit Stats Modal */}
    {canEditProject && (
      <EditProjectStatsModal
        project={project}
        open={showEditModal}
        onOpenChange={setShowEditModal}
        onSave={handleProjectUpdate}
      />
    )}

    {/* Team Management Modal */}
    {canManageTeam && (
      <AssignTeamModal
        isOpen={showTeamModal}
        onClose={() => setShowTeamModal(false)}
        projectId={project.id}
        projectTitle={project.title}
      />
    )}
  </>
  );
}
