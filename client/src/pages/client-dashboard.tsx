import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import Sidebar from "@/components/sidebar";
import ProjectCard from "@/components/project-card";
import ActivityFeed from "@/components/activity-feed";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { 
  Search, 
  FolderOpen, 
  Calendar, 
  MessageCircle, 
  FileText, 
  Clock,
  CheckCircle,
  AlertCircle,
  Plus
} from "lucide-react";
import { type Project, type Client, type ActivityWithDetails } from "@shared/schema";

type ProjectWithClient = Project & { client: Client };

export default function ClientDashboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const { user, currentRole } = useAuth();

  const { data: projects, isLoading: projectsLoading } = useQuery<ProjectWithClient[]>({
    queryKey: ["/api/projects", user?.id, user?.organizationId],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      // Clients should only see their own projects - filter by userId
      if (user?.id) {
        params.set("userId", user.id.toString());
        params.set("organizationId", (user.organizationId || 1).toString());
      }
      
      const response = await fetch(`/api/projects?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch projects");
      return response.json();
    },
    staleTime: 0,
  });

  const { data: activities, isLoading: activitiesLoading } = useQuery<ActivityWithDetails[]>({
    queryKey: ["/api/activities"],
  });

  // Filter projects by search term (backend already filtered by user access)
  const clientProjects = useMemo(() => {
    if (!projects) return [];
    
    // Backend already filters projects by user access, just apply search filter
    return projects.filter(project => {
      const matchesSearch = project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           project.description?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
  }, [projects, searchTerm]);

  // Calculate client-specific stats
  const clientStats = useMemo(() => {
    if (!clientProjects) return null;
    
    const totalProjects = clientProjects.length;
    const activeProjects = clientProjects.filter(p => p.status === 'active').length;
    const completedProjects = clientProjects.filter(p => p.status === 'completed').length;
    const totalBudget = clientProjects.reduce((sum, p) => sum + parseFloat(p.budget.toString()), 0);
    const avgProgress = totalProjects > 0 
      ? Math.round(clientProjects.reduce((sum, p) => sum + p.progress, 0) / totalProjects)
      : 0;

    return {
      totalProjects,
      activeProjects,
      completedProjects,
      totalBudget,
      avgProgress
    };
  }, [clientProjects]);

  // Filter activities for client projects
  const clientActivities = useMemo(() => {
    if (!activities || !clientProjects) return [];
    
    const projectIds = clientProjects.map(p => p.id);
    return activities.filter(activity => 
      activity.projectId && projectIds.includes(activity.projectId)
    ).slice(0, 10);
  }, [activities, clientProjects]);

  const statsCards = [
    {
      title: "My Projects",
      value: clientStats?.totalProjects || 0,
      change: "",
      icon: FolderOpen,
      color: "text-blue-400"
    },
    {
      title: "Active Projects", 
      value: clientStats?.activeProjects || 0,
      change: "",
      icon: Clock,
      color: "text-green-400"
    },
    {
      title: "Completed",
      value: clientStats?.completedProjects || 0,
      change: "",
      icon: CheckCircle,
      color: "text-purple-400"
    },
    {
      title: "Average Progress",
      value: `${clientStats?.avgProgress || 0}%`,
      change: "",
      icon: AlertCircle,
      color: "text-orange-400"
    }
  ];

  return (
    <div className="min-h-screen gradient-bg">
      <Sidebar />
      
      <main className="ml-64 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-3xl font-bold text-white mb-2">My Project Portal</h1>
            <p className="text-slate-400">
              Track your project progress and collaborate with our team
            </p>
          </motion.div>

          {/* Client Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
          >
            {statsCards.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + index * 0.1 }}
                >
                  <Card className="glass-dark border-white/10">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-400">{stat.title}</p>
                          <p className="text-2xl font-bold text-white">{stat.value}</p>
                        </div>
                        <Icon className={`h-8 w-8 ${stat.color}`} />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* My Projects */}
            <div className="lg:col-span-2">
              <Card className="glass-dark border-white/10">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-white flex items-center">
                        <FolderOpen className="h-5 w-5 mr-2" />
                        My Projects
                      </CardTitle>
                      <CardDescription className="text-slate-400">
                        Projects you're currently involved in
                      </CardDescription>
                    </div>
                    <Button variant="outline" className="glass border-white/20 text-white hover:bg-white/10">
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Get Support
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Search */}
                  <div className="relative mb-6">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Search your projects..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-white/5 border-white/10 text-white"
                    />
                  </div>

                  {/* Project Grid */}
                  {projectsLoading ? (
                    <div className="text-center py-8">
                      <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                      <p className="text-slate-400">Loading your projects...</p>
                    </div>
                  ) : clientProjects.length === 0 ? (
                    <div className="text-center py-12">
                      <FolderOpen className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-white mb-2">No projects found</h3>
                      <p className="text-slate-400 mb-4">
                        {searchTerm ? "No projects match your search" : "You don't have any projects yet"}
                      </p>
                      {searchTerm && (
                        <Button
                          variant="ghost"
                          onClick={() => setSearchTerm("")}
                          className="text-slate-400 hover:text-white"
                        >
                          Clear search
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                      {clientProjects.map((project, index) => (
                        <motion.div
                          key={project.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          <ProjectCard project={project} />
                        </motion.div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <div>
              <Card className="glass-dark border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Calendar className="h-5 w-5 mr-2" />
                    Recent Activity
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Latest updates on your projects
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {activitiesLoading ? (
                    <div className="text-center py-4">
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                      <p className="text-slate-400 text-sm">Loading activity...</p>
                    </div>
                  ) : clientActivities.length === 0 ? (
                    <div className="text-center py-8">
                      <Calendar className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                      <p className="text-slate-400 text-sm">No recent activity</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {clientActivities.slice(0, 6).map((activity, index) => (
                        <motion.div
                          key={activity.id}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="flex items-start space-x-3 p-3 glass rounded-lg hover:bg-white/5 transition-colors"
                        >
                          <div className="flex-shrink-0 w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                            <FileText className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">
                              {activity.title}
                            </p>
                            <p className="text-xs text-slate-400 mt-1">
                              {activity.description}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              {new Date(activity.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </motion.div>
                      ))}
                      
                      {clientActivities.length > 6 && (
                        <Button variant="ghost" className="w-full text-slate-400 hover:text-white">
                          View all activity
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Actions for Clients */}
              <Card className="glass-dark border-white/10 mt-6">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Plus className="h-5 w-5 mr-2" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="ghost" className="w-full justify-start text-slate-300 hover:text-white hover:bg-white/10">
                    <MessageCircle className="h-4 w-4 mr-3" />
                    Contact Support
                  </Button>
                  <Button variant="ghost" className="w-full justify-start text-slate-300 hover:text-white hover:bg-white/10">
                    <FileText className="h-4 w-4 mr-3" />
                    Upload Documents
                  </Button>
                  <Button variant="ghost" className="w-full justify-start text-slate-300 hover:text-white hover:bg-white/10">
                    <Calendar className="h-4 w-4 mr-3" />
                    Schedule Meeting
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}