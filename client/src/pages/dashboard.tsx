import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import Sidebar from "@/components/sidebar";
import StatsCard from "@/components/stats-card";
import ProjectCard from "@/components/project-card";
import ProjectFilters from "@/components/project-filters";
import ActivityFeed from "@/components/activity-feed";
import QuickActions from "@/components/quick-actions";
// import NotificationTest from "@/components/notification-test";
import NotificationCenter from "@/components/notification-center";
import BetaBanner from "@/components/beta-banner";
import { TrialBanner } from "@/components/trial-banner";
import { RevenueGoalRing } from "@/components/ui/progress-ring";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import ClientDashboard from "@/pages/client-dashboard";
import { Search, Bell, Plus, Target, TrendingUp } from "lucide-react";
import { type Project, type Client, type ActivityWithDetails } from "@shared/schema";
import CreateProjectModal from "@/components/create-project-modal";

type ProjectWithClient = Project & { client: Client };

export default function Dashboard() {
  const { currentRole, isClient, authUser, hasPermission } = useAuth();
  
  // If user is a client, show the client-specific dashboard
  if (isClient) {
    return <ClientDashboard />;
  }

  const [filters, setFilters] = useState({
    search: "",
    status: "",
    priority: "",
    sortBy: "recent",
    viewMode: "grid" as "grid" | "list"
  });
  
  const [showCreateProject, setShowCreateProject] = useState(false);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/stats"],
    staleTime: 0, // Force fresh fetch for stats
  });

  const { data: projects, isLoading: projectsLoading } = useQuery<ProjectWithClient[]>({
    queryKey: ["/api/projects", authUser?.id, authUser?.organizationId],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      // For non-admin users, filter by user access
      if (currentRole !== "admin" && authUser?.id) {
        params.set("userId", authUser.id.toString());
        params.set("organizationId", (authUser.organizationId || 1).toString());
      }
      
      const response = await fetch(`/api/projects?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch projects");
      return response.json();
    },
    staleTime: 0,
  });

  const { data: activities, isLoading: activitiesLoading } = useQuery<ActivityWithDetails[]>({
    queryKey: ["/api/activities"],
    staleTime: 0,
  });

  const { data: clients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    staleTime: 0,
  });

  // Filter and sort projects
  const filteredProjects = useMemo(() => {
    if (!projects) return [];
    
    let filtered = projects.filter(project => {
      // Search filter
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        const matchesSearch = 
          project.title.toLowerCase().includes(searchTerm) ||
          project.client.name.toLowerCase().includes(searchTerm) ||
          project.description?.toLowerCase().includes(searchTerm);
        if (!matchesSearch) return false;
      }
      
      // Status filter
      if (filters.status && project.status !== filters.status) return false;
      
      // Priority filter  
      if (filters.priority && project.priority !== filters.priority) return false;
      
      return true;
    });

    // Sort projects
    switch (filters.sortBy) {
      case "name":
        filtered.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "progress":
        filtered.sort((a, b) => (b.progress || 0) - (a.progress || 0));
        break;
      case "deadline":
        filtered.sort((a, b) => {
          if (!a.endDate || !b.endDate) return 0;
          return new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
        });
        break;
      case "budget":
        filtered.sort((a, b) => parseFloat(b.budget) - parseFloat(a.budget));
        break;
      default: // recent
        filtered.sort((a, b) => {
          if (!a.startDate || !b.startDate) return 0;
          return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
        });
    }

    return filtered;
  }, [projects, filters]);

  const activeProjects = filteredProjects.filter(p => p.status === "active");

  return (
    <div className="min-h-screen gradient-bg relative overflow-hidden">
      <BetaBanner />
      
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 gradient-primary rounded-full opacity-20 blur-3xl animate-float"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 gradient-secondary rounded-full opacity-15 blur-3xl animate-pulse-slow"></div>
        <div className="absolute top-1/2 left-1/3 w-64 h-64 gradient-accent rounded-full opacity-10 blur-3xl animate-float" style={{ animationDelay: "2s" }}></div>
      </div>

      <Sidebar />

      {/* Main Content */}
      <main className="lg:ml-64 p-4 lg:p-8 pt-20 lg:pt-16">
        {/* Trial Banner */}
        <TrialBanner />
        
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <h1 className="text-3xl font-bold text-white">Dashboard</h1>
            </div>
            <p className="text-slate-400">Manage your clients and track project progress in real-time</p>
          </div>
          <div className="flex items-center space-x-4">
            <NotificationCenter />
          </div>
        </header>

        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Active Projects"
            value={stats?.activeProjects || 0}
            change="+12%"
            icon="rocket"
            gradient="gradient-primary"
            loading={statsLoading}
          />
          <StatsCard
            title="Total Clients"
            value={stats?.totalClients || 0}
            change="+8%"
            icon="users"
            gradient="gradient-secondary"
            loading={statsLoading}
          />
          <StatsCard
            title="Monthly Revenue"
            value={stats?.monthlyRevenue || 0}
            change="+24%"
            icon="dollar-sign"
            gradient="gradient-accent"
            isCurrency
            target={15000}
            showProgress={true}
            loading={statsLoading}
          />
          <StatsCard
            title="Urgent Tasks"
            value={3}
            change="+2"
            icon="alert-triangle"
            gradient="bg-gradient-to-r from-red-500 to-orange-500"
            urgent={true}
            loading={statsLoading}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Active Projects */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="lg:col-span-2"
          >
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">
                  Projects
                  <span className="ml-2 text-sm text-slate-400 font-normal">
                    ({activeProjects.length} active)
                  </span>
                </h2>
              </div>

              {/* Project Filters */}
              <div className="mb-6">
                <ProjectFilters
                  filters={filters}
                  onFiltersChange={setFilters}
                  totalCount={projects?.length || 0}
                  filteredCount={filteredProjects.length}
                />
              </div>

              {/* Projects Grid/List */}
              <div className={
                filters.viewMode === "grid" 
                  ? "grid grid-cols-1 xl:grid-cols-2 gap-4" 
                  : "space-y-4"
              }>
                {projectsLoading ? (
                  // Loading skeletons
                  Array.from({ length: 4 }, (_, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1, duration: 0.5 }}
                      className="bg-white/5 rounded-xl p-6 animate-pulse"
                    >
                      <div className="h-4 bg-white/10 rounded w-1/3 mb-4"></div>
                      <div className="h-3 bg-white/10 rounded w-1/2 mb-2"></div>
                      <div className="h-3 bg-white/10 rounded w-1/4"></div>
                    </motion.div>
                  ))
                ) : filteredProjects.length > 0 ? (
                  // Project cards
                  filteredProjects.map((project, index) => (
                    <motion.div
                      key={project.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + index * 0.05, duration: 0.5 }}
                      layout
                    >
                      <ProjectCard project={project} />
                    </motion.div>
                  ))
                ) : (
                  // Empty state
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="col-span-full text-center py-12"
                  >
                    <div className="w-16 h-16 glass rounded-full flex items-center justify-center mx-auto mb-4">
                      <Search className="h-6 w-6 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-medium text-white mb-2">No projects found</h3>
                    <p className="text-slate-400 mb-4">
                      {filters.search || filters.status || filters.priority
                        ? "Try adjusting your filters to see more results."
                        : "Create your first project to get started."
                      }
                    </p>
                    <Button
                      onClick={() => {
                        if (filters.search || filters.status || filters.priority) {
                          setFilters(prev => ({ ...prev, search: "", status: "", priority: "" }));
                        } else if (hasPermission("projects", "create") || currentRole === "admin") {
                          setShowCreateProject(true);
                        }
                      }}
                      variant="outline"
                      className="glass border-white/10 text-white hover:bg-white/10"
                      disabled={!(hasPermission("projects", "create") || currentRole === "admin") && !(filters.search || filters.status || filters.priority)}
                    >
                      {filters.search || filters.status || filters.priority ? "Clear Filters" : "Create Project"}
                    </Button>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Sidebar Content */}
          <div className="space-y-6">
            {/* Revenue Goal Progress */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.6 }}
              className="glass rounded-2xl p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white flex items-center">
                  <Target className="mr-2 h-5 w-5 text-primary" />
                  Monthly Goal
                </h3>
                <TrendingUp className="h-4 w-4 text-green-400" />
              </div>
              
              <div className="flex items-center justify-center mb-4">
                <RevenueGoalRing 
                  current={stats?.monthlyRevenue || 0}
                  target={15000}
                  className="mx-auto"
                />
              </div>
              
              <div className="text-center">
                <p className="text-sm text-slate-400">
                  {((stats?.monthlyRevenue || 0) / 15000 * 100).toFixed(1)}% to goal
                </p>
                <div className="flex justify-between text-xs text-slate-500 mt-2">
                  <span>Start: $0</span>
                  <span>Goal: $15K</span>
                </div>
              </div>
            </motion.div>

            <ActivityFeed activities={activities || []} loading={activitiesLoading} />
            <QuickActions />
          </div>
        </div>
      </main>

      {/* Enhanced Floating Action Button */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: 1.5, duration: 0.6, type: "spring" }}
        className="fixed bottom-8 right-8 z-50"
      >
        <motion.div
          whileHover={{ scale: 1.1, rotate: 5 }}
          whileTap={{ scale: 0.95 }}
          className="relative"
        >
          <Button 
            size="icon"
            className="w-16 h-16 gradient-primary rounded-full shadow-2xl hover:shadow-primary/50 transition-shadow duration-300 group"
          >
            <motion.svg 
              className="w-6 h-6 group-hover:scale-110 transition-transform duration-200" 
              fill="currentColor" 
              viewBox="0 0 20 20"
              whileHover={{ rotate: 90 }}
              transition={{ duration: 0.2 }}
            >
              <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
              <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
            </motion.svg>
          </Button>
          
          {/* Pulse ring effect */}
          <motion.div
            className="absolute inset-0 gradient-primary rounded-full opacity-30"
            animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
          />
        </motion.div>
      </motion.div>
      
      {/* Test notification button for development */}
      {/* <NotificationTest /> */}
      
      {/* Create Project Modal */}
      {(hasPermission("projects", "create") || currentRole === "admin") && (
        <CreateProjectModal 
          open={showCreateProject} 
          onOpenChange={setShowCreateProject}
        />
      )}
    </div>
  );
}
