import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter, Grid, List, Crown, Zap } from "lucide-react";
import { useLocation, Link } from "wouter";
import Sidebar from "@/components/sidebar";
import ProjectCard from "@/components/project-card";
import ProjectFilters from "@/components/project-filters";
import CreateProjectModal from "@/components/create-project-modal";
import CreateClientModal from "@/components/create-client-modal";
import { UpgradeProjectCard, ProjectSlotCard } from "@/components/upgrade-project-card";
import { useAuth } from "@/hooks/useAuth";
import { type Project, type Client, BILLING_PLANS, type BillingPlan } from "@shared/schema";

type ProjectWithClient = Project & { client: Client };

export default function ProjectsPage() {
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showCreateClient, setShowCreateClient] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { hasPermission, currentRole, authUser, isAdmin, isTeamMember } = useAuth();
  
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    priority: "all",
    sortBy: "recent",
    viewMode: "grid" as "grid" | "list"
  });

  const { data: projects, isLoading: projectsLoading } = useQuery<ProjectWithClient[]>({
    queryKey: ["/api/projects", { 
      userId: currentRole === 'team_member' ? authUser?.id : undefined,
      organizationId: authUser?.organizationId || 1 
    }],
    queryFn: async () => {
      let url = "/api/projects";
      const params = new URLSearchParams();
      
      // For team members, filter by user ID to only show assigned projects
      if (currentRole === 'team_member' && authUser?.id) {
        params.append('userId', authUser.id.toString());
      }
      
      if (authUser?.organizationId) {
        params.append('organizationId', authUser.organizationId.toString());
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }
      return response.json();
    }
  });

  // Fetch organization billing data to check project limits
  const { data: billingData } = useQuery({
    queryKey: [`/api/billing/${authUser?.organizationId || 1}`],
    queryFn: async () => {
      const response = await fetch(`/api/billing/${authUser?.organizationId || 1}`);
      if (!response.ok) throw new Error('Failed to fetch billing data');
      return response.json();
    },
    enabled: !!authUser?.organizationId
  });

  // Check if organization can create more projects
  const canCreateProject = () => {
    return true; // Always allow project creation
  };

  const handleProjectUpdate = async (projectId: number, updates: Partial<Project>) => {
    try {
      // Update project via API
      await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });

      // Invalidate queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    } catch (error) {
      console.error("Failed to update project:", error);
    }
  };

  const filteredProjects = (projects || []).filter(project => {
    // Search filter
    const searchMatch = !filters.search || 
      project.title.toLowerCase().includes(filters.search.toLowerCase()) ||
      project.description?.toLowerCase().includes(filters.search.toLowerCase()) ||
      project.client.name.toLowerCase().includes(filters.search.toLowerCase());
    
    // Status filter
    const statusMatch = !filters.status || filters.status === "all" || project.status === filters.status;
    
    // Priority filter
    const priorityMatch = !filters.priority || filters.priority === "all" || project.priority === filters.priority;
    
    return searchMatch && statusMatch && priorityMatch;
  });

  return (
    <div className="min-h-screen gradient-bg relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 gradient-primary rounded-full opacity-20 blur-3xl animate-float"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 gradient-secondary rounded-full opacity-15 blur-3xl animate-pulse-slow"></div>
        <div className="absolute top-1/2 left-1/3 w-64 h-64 gradient-accent rounded-full opacity-10 blur-3xl animate-float" style={{ animationDelay: "2s" }}></div>
      </div>

      <Sidebar />

      {/* Main Content */}
      <main className="lg:ml-64 p-4 lg:p-8 pt-20 lg:pt-8">
        {/* Admin Plan Switcher for Testing */}
        {isAdmin && (
          <div>
          </div>
        )}
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-4 mb-3">
                <h1 className="text-4xl font-bold text-white">Projects</h1>
                {/* Hide plan info for team members since they don't pay */}
                {!isTeamMember && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-slate-400">
                      {projects?.length || 0} Projects
                    </span>
                    <span className="px-2 py-1 rounded text-xs font-medium bg-purple-900/30 text-purple-400 border border-purple-600">
                      Active Projects
                    </span>
                  </div>
                )}
              </div>
              <p className="text-slate-300 text-lg">Manage your projects, team members, and clients</p>
            </div>
            <div className="mt-6 lg:mt-0 flex gap-3">
              {(hasPermission("clients", "create") || currentRole === "admin") && (
                <Button
                  onClick={() => setShowCreateClient(true)}
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Client
                </Button>
              )}
              
              {(hasPermission("projects", "create") || currentRole === "admin") && (
                <Button
                  onClick={() => setShowCreateProject(true)}
                  disabled={!canCreateProject()}
                  className="bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={!canCreateProject() ? "You've reached your project limit for this plan" : ""}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Project
                </Button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Search and Filters Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-2xl p-8 mb-10"
        >
          <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 flex-1 max-w-2xl">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input
                  placeholder="Search projects by name, client, or tag..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-12 pr-4 py-3 bg-white/5 border-white/10 text-white placeholder:text-slate-400 rounded-xl text-base"
                />
              </div>

              {/* Filters Toggle */}
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="border-white/20 text-white hover:bg-white/10 px-6 py-3 rounded-xl"
              >
                <Filter className="h-5 w-5 mr-2" />
                {showFilters ? 'Hide Filters' : 'Show Filters'}
              </Button>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                className="bg-primary hover:bg-primary/90"
                onClick={() => setLocation("/tasks")}
              >
                <List className="h-5 w-5 mr-2" />
                My Tasks
              </Button>
            </div>
          </div>

          {/* Filters */}
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-8 pt-6 border-t border-white/10"
            >
              <ProjectFilters 
                filters={filters}
                onFiltersChange={setFilters}
                totalCount={projects?.length || 0}
                filteredCount={filteredProjects.length}
              />
            </motion.div>
          )}
        </motion.div>


        {/* Projects Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-12"
        >
          {projectsLoading ? (
            <div className="glass rounded-2xl p-16 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <p className="text-slate-400">Loading projects...</p>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="glass rounded-2xl p-16 text-center">
              <div className="max-w-md mx-auto">
                <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Plus className="h-10 w-10 text-white/60" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">
                  {filters.search || (filters.status && filters.status !== "all") || (filters.priority && filters.priority !== "all") ? "No projects found" : "No projects yet"}
                </h3>
                <p className="text-slate-400 mb-8">
                  {filters.search || (filters.status && filters.status !== "all") || (filters.priority && filters.priority !== "all")
                    ? "Try adjusting your search terms or filters to find what you're looking for." 
                    : "Get started by creating your first project and building something amazing."}
                </p>
                <Button
                  onClick={() => setShowCreateProject(true)}
                  disabled={!canCreateProject()}
                  size="lg"
                  className="bg-primary hover:bg-primary/90 px-8 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={!canCreateProject() ? "You've reached your project limit for this plan" : ""}
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Create Your First Project
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {/* Render existing projects */}
              {filteredProjects.map((project, index) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <ProjectCard project={project} onProjectUpdate={handleProjectUpdate} />
                </motion.div>
              ))}
              
              {/* For Solo plan users, show project slots and upgrade card */}
              {false && (
                <>
                  {/* Show empty slots up to the Solo limit */}
                  {Array.from({ length: Math.max(0, BILLING_PLANS.solo.limits.projects - (filteredProjects.length || 0)) }).map((_, index) => (
                    <ProjectSlotCard 
                      key={`slot-${index}`}
                      slotNumber={(filteredProjects.length || 0) + index + 1}
                    />
                  ))}
                  
                  {/* Show upgrade card if at or over the limit - Hidden for team members */}
                  {(filteredProjects.length || 0) >= BILLING_PLANS.solo.limits.projects && !isTeamMember && (
                    <UpgradeProjectCard />
                  )}
                </>
              )}
            </div>
          )}
        </motion.div>
      </main>

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
    </div>
  );
}