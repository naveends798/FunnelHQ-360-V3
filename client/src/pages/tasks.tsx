import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  ArrowLeft,
  Search,
  Filter,
  MoreHorizontal,
  Calendar,
  Clock,
  CheckCircle2,
  Circle,
  Timer,
  AlertCircle,
  Folder,
  User,
  Plus,
  Users,
  GripVertical
} from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

// Types
interface Task {
  id: number;
  projectId: number;
  projectTitle: string;
  title: string;
  description?: string;
  status: "todo" | "in_progress" | "review" | "done";
  priority: "low" | "medium" | "high" | "urgent";
  assignedTo?: number;
  estimatedHours?: string;
  actualHours?: string;
  dueDate?: string;
  completedAt?: string;
  position: number;
  labels: string[];
  checklist: { id: string; text: string; completed: boolean }[];
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  assignee?: {
    id: number;
    name: string;
    avatar?: string;
  };
  assignedBy?: {
    id: number;
    name: string;
    role: string;
  };
}

interface Project {
  id: number;
  title: string;
  description?: string;
  status: string;
  priority: string;
}

interface BoardColumn {
  id: string;
  title: string;
  status: Task["status"];
  color: string;
  tasks: Task[];
}

const priorityColors = {
  low: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  urgent: "bg-red-500/20 text-red-400 border-red-500/30"
};

const statusIcons = {
  todo: Circle,
  in_progress: Timer,
  review: AlertCircle,
  done: CheckCircle2
};

export default function TasksPage() {
  const [columns, setColumns] = useState<BoardColumn[]>([
    { id: "todo", title: "To Do", status: "todo", color: "bg-slate-500/20 border-slate-500/30", tasks: [] },
    { id: "in_progress", title: "In Progress", status: "in_progress", color: "bg-blue-500/20 border-blue-500/30", tasks: [] },
    { id: "review", title: "Under Review", status: "review", color: "bg-amber-500/20 border-amber-500/30", tasks: [] },
    { id: "done", title: "Completed", status: "done", color: "bg-green-500/20 border-green-500/30", tasks: [] }
  ]);
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterProject, setFilterProject] = useState<string>("all");
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isViewingDetails, setIsViewingDetails] = useState(false);
  const [isEditingTask, setIsEditingTask] = useState(false);

  // Team members state
  const [teamMembers, setTeamMembers] = useState([
    { id: 1, name: "You", email: "you@company.com", avatar: "", role: "admin" }
  ]);
  const [currentUser, setCurrentUser] = useState({ id: 1, name: "You", role: "admin" });
  const [currentProject, setCurrentProject] = useState<Project | null>(null);

  // New task form state
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    priority: "medium" as Task["priority"],
    assignedTo: 1,
    estimatedHours: "",
    dueDate: "",
    projectId: 1, // Will be auto-set from current project
    labels: [] as string[]
  });

  useEffect(() => {
    fetchTasks();
    fetchTeamMembers();
    fetchCurrentProject();
  }, []);

  const fetchTeamMembers = async () => {
    try {
      // TODO: Replace with actual API call to fetch team members
      // For now, using mock data
      const mockTeamMembers = [
        { id: 1, name: "You", email: "admin@company.com", avatar: "", role: "admin" },
        { id: 2, name: "John Developer", email: "john@company.com", avatar: "", role: "team_member" },
        { id: 3, name: "Jane Designer", email: "jane@company.com", avatar: "", role: "team_member" },
        { id: 4, name: "Mike Manager", email: "mike@company.com", avatar: "", role: "team_member" },
      ];
      setTeamMembers(mockTeamMembers);
    } catch (error) {
      console.error("Failed to fetch team members:", error);
    }
  };

  const fetchCurrentProject = async () => {
    try {
      // TODO: Get current project from context or URL params
      // For now, using mock data
      const mockProject = {
        id: 1,
        title: "FunnelHQ 360 Project",
        description: "Main project for FunnelHQ 360",
        status: "active",
        priority: "high"
      };
      setCurrentProject(mockProject);
      setProjects([mockProject]);
      
      // Auto-set project in new task form
      setNewTask(prev => ({ ...prev, projectId: mockProject.id }));
    } catch (error) {
      console.error("Failed to fetch current project:", error);
    }
  };

  const fetchTasks = async () => {
    try {
      setLoading(true);
      
      // TODO: Replace with actual API calls to fetch tasks and projects
      setProjects([]);
      
      // Start with empty data for production - replace with actual API call
      const emptyTasks: Task[] = [];

      // Organize tasks by status
      const newColumns = columns.map(column => ({
        ...column,
        tasks: emptyTasks.filter(task => task.status === column.status)
      }));

      setColumns(newColumns);
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskStatusUpdate = async (taskId: number, newStatus: Task["status"]) => {
    try {
      // Update task status in backend
      await fetch(`/api/tasks/${taskId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });

      // Update local state
      setColumns(prev => {
        const updatedColumns = prev.map(column => ({
          ...column,
          tasks: column.tasks.filter(task => task.id !== taskId)
        }));

        // Find the task and move it to the new column
        const task = prev.flatMap(col => col.tasks).find(t => t.id === taskId);
        if (task) {
          const targetColumn = updatedColumns.find(col => col.status === newStatus);
          if (targetColumn) {
            targetColumn.tasks.push({ ...task, status: newStatus });
          }
        }

        return updatedColumns;
      });
    } catch (error) {
      console.error("Failed to update task status:", error);
    }
  };

  const handleViewTaskDetails = (task: Task) => {
    setSelectedTask(task);
    setIsViewingDetails(true);
  };

  const handleEditTask = (task: Task) => {
    setSelectedTask(task);
    setNewTask({
      title: task.title,
      description: task.description || "",
      priority: task.priority,
      assignedTo: task.assignedTo || 1,
      estimatedHours: task.estimatedHours || "",
      dueDate: task.dueDate || "",
      projectId: task.projectId,
      labels: task.labels
    });
    setIsEditingTask(true);
  };

  const handleDeleteTask = (taskId: number) => {
    if (confirm("Are you sure you want to delete this task?")) {
      setColumns(prev => prev.map(col => ({
        ...col,
        tasks: col.tasks.filter(task => task.id !== taskId)
      })));
    }
  };

  const handleUpdateTask = async () => {
    if (!newTask.title.trim() || !selectedTask) return;

    try {
      const assignee = teamMembers.find(member => member.id === newTask.assignedTo);
      const selectedProject = projects.find(p => p.id === newTask.projectId);
      
      const updatedTask: Task = {
        ...selectedTask,
        title: newTask.title,
        description: newTask.description,
        priority: newTask.priority,
        assignedTo: newTask.assignedTo,
        estimatedHours: newTask.estimatedHours,
        dueDate: newTask.dueDate,
        projectId: newTask.projectId,
        projectTitle: selectedProject?.title || "Unknown Project",
        labels: newTask.labels,
        updatedAt: new Date().toISOString(),
        assignee: assignee ? {
          id: assignee.id,
          name: assignee.name,
          avatar: assignee.avatar
        } : undefined
      };

      // Update the task in the columns
      setColumns(prev => prev.map(col => ({
        ...col,
        tasks: col.tasks.map(task => 
          task.id === selectedTask.id ? updatedTask : task
        )
      })));

      // Reset form and close modal
      setNewTask({
        title: "",
        description: "",
        priority: "medium",
        assignedTo: currentUser.id,
        estimatedHours: "",
        dueDate: "",
        projectId: currentProject?.id || 1,
        labels: []
      });
      
      setSelectedTask(null);
      setIsEditingTask(false);
    } catch (error) {
      console.error("Failed to update task:", error);
    }
  };

  const handleDragStart = (task: Task, e: React.DragEvent) => {
    setDraggedTask(task);
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
    setDragOverColumn(null);
    setIsDragging(false);
  };

  const handleDragOver = (columnId: string, e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(columnId);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (columnId: string, e: React.DragEvent) => {
    e.preventDefault();
    setDragOverColumn(null);
    
    if (!draggedTask) return;
    
    const newStatus = columns.find(col => col.id === columnId)?.status;
    if (!newStatus || newStatus === draggedTask.status) return;
    
    await handleTaskStatusUpdate(draggedTask.id, newStatus);
    setDraggedTask(null);
  };

  const handleCreateTask = async () => {
    if (!newTask.title.trim()) return;

    try {
      const assignee = teamMembers.find(member => member.id === newTask.assignedTo);
      const selectedProject = projects.find(p => p.id === newTask.projectId) || currentProject;
      
      const task: Task = {
        id: Date.now(), // Mock ID generation
        projectId: newTask.projectId,
        projectTitle: selectedProject?.title || "Unknown Project",
        title: newTask.title,
        description: newTask.description,
        status: "todo",
        priority: newTask.priority,
        assignedTo: newTask.assignedTo,
        estimatedHours: newTask.estimatedHours,
        dueDate: newTask.dueDate,
        position: 0,
        labels: newTask.labels,
        checklist: [],
        createdBy: currentUser.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        assignee: assignee ? {
          id: assignee.id,
          name: assignee.name,
          avatar: assignee.avatar
        } : undefined,
        assignedBy: {
          id: currentUser.id,
          name: currentUser.name,
          role: currentUser.role === "admin" ? "Admin" : "Project Manager"
        }
      };

      // Create task via API
      const response = await fetch(`/api/projects/${newTask.projectId}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: newTask.title,
          description: newTask.description,
          priority: newTask.priority,
          assignedTo: newTask.assignedTo,
          estimatedHours: newTask.estimatedHours ? parseFloat(newTask.estimatedHours) : null,
          dueDate: newTask.dueDate ? new Date(newTask.dueDate) : null,
          createdBy: currentUser.id,
          status: 'todo',
          position: 0,
          labels: newTask.labels
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create task');
      }

      const createdTask = await response.json();

      // Send notification if task is assigned to someone else
      if (newTask.assignedTo !== currentUser.id && assignee) {
        await sendTaskAssignmentNotification(createdTask, assignee);
      }

      // Update the task object with response data
      const updatedTask = {
        ...task,
        id: createdTask.id,
        createdAt: createdTask.createdAt,
        updatedAt: createdTask.updatedAt
      };

      // Add task to the todo column
      setColumns(prev => prev.map(col => 
        col.id === "todo" 
          ? { ...col, tasks: [updatedTask, ...col.tasks] }
          : col
      ));

      // Reset form but keep project selection
      setNewTask({
        title: "",
        description: "",
        priority: "medium",
        assignedTo: currentUser.id, // Default to assigning to admin/current user
        estimatedHours: "",
        dueDate: "",
        projectId: currentProject?.id || 1,
        labels: []
      });
      
      setIsCreatingTask(false);
    } catch (error) {
      console.error("Failed to create task:", error);
    }
  };

  const sendTaskAssignmentNotification = async (task: Task, assignee: any) => {
    try {
      // Use the dedicated task assignment endpoint
      await fetch(`/api/tasks/${task.id}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assignedTo: assignee.id,
          assignedBy: currentUser.id
        })
      });
    } catch (error) {
      console.error('Failed to send task assignment notification:', error);
    }
  };

  const filteredColumns = columns.map(column => ({
    ...column,
    tasks: column.tasks.filter(task => {
      const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          task.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          task.projectTitle.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPriority = !filterPriority || filterPriority === "all" || task.priority === filterPriority;
      const matchesProject = !filterProject || filterProject === "all" || task.projectId.toString() === filterProject;
      
      return matchesSearch && matchesPriority && matchesProject;
    })
  }));

  const TaskCard = ({ task, columnId }: { task: Task; columnId: string }) => {
    const StatusIcon = statusIcons[task.status];
    const completedChecklist = task.checklist.filter(item => item.completed).length;
    const totalChecklist = task.checklist.length;
    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';
    const isBeingDragged = draggedTask?.id === task.id;

    return (
      <div
        draggable
        onDragStart={(e) => handleDragStart(task, e)}
        onDragEnd={handleDragEnd}
        className={cn(
          "group glass rounded-xl p-4 cursor-grab active:cursor-grabbing",
          "border border-white/10 hover:border-white/20",
          isBeingDragged && "opacity-50"
        )}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-2 flex-1">
            <div className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-white transition-colors opacity-0 group-hover:opacity-100 mt-1">
              <GripVertical className="h-3 w-3" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-sm text-white line-clamp-2 mb-1">
                {task.title}
              </h4>
              <div className="flex items-center gap-2 mb-2">
                <Folder className="h-3 w-3 text-slate-400" />
                <span className="text-xs text-slate-400">{task.projectTitle}</span>
              </div>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-white">
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 glass border-white/10">
              <DropdownMenuItem 
                className="text-white hover:bg-white/10 cursor-pointer"
                onClick={() => handleViewTaskDetails(task)}
              >
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="text-white hover:bg-white/10 cursor-pointer"
                onClick={() => handleEditTask(task)}
              >
                Edit Task
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="text-red-400 hover:bg-red-500/10 cursor-pointer"
                onClick={() => handleDeleteTask(task.id)}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {task.description && (
          <p className="text-xs text-slate-400 mb-3 line-clamp-2">
            {task.description}
          </p>
        )}

        {/* Labels */}
        {task.labels.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {task.labels.slice(0, 2).map((label, index) => (
              <Badge key={index} variant="secondary" className="text-xs px-1.5 py-0.5 bg-white/10 text-slate-300 border-white/20">
                {label}
              </Badge>
            ))}
            {task.labels.length > 2 && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0.5 bg-white/10 text-slate-300 border-white/20">
                +{task.labels.length - 2}
              </Badge>
            )}
          </div>
        )}

        {/* Progress indicators */}
        <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
          {totalChecklist > 0 && (
            <div className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              <span>{completedChecklist}/{totalChecklist}</span>
            </div>
          )}
          
          {task.estimatedHours && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{task.estimatedHours}h</span>
            </div>
          )}
          
          {task.dueDate && (
            <div className={cn("flex items-center gap-1", isOverdue && "text-red-400")}>
              <Calendar className="h-3 w-3" />
              <span>{new Date(task.dueDate).toLocaleDateString()}</span>
            </div>
          )}
        </div>

        {/* Assigned by info */}
        {task.assignedBy && (
          <div className="flex items-center gap-2 mb-3 p-2 bg-white/5 rounded-lg border border-white/10">
            <User className="h-3 w-3 text-slate-400" />
            <span className="text-xs text-slate-400">
              Assigned by <span className="text-slate-300 font-medium">{task.assignedBy.name}</span>
            </span>
          </div>
        )}

        {/* Bottom row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge className={cn("text-xs px-2 py-0.5", priorityColors[task.priority])}>
              {task.priority}
            </Badge>
            <StatusIcon className="h-3 w-3 text-slate-400" />
          </div>
          
          {task.assignee && (
            <Avatar className="h-6 w-6">
              <AvatarImage src={task.assignee.avatar} />
              <AvatarFallback className="text-xs bg-white/10 text-white">
                {task.assignee.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
          )}
        </div>

        {/* Overdue indicator */}
        {isOverdue && (
          <div className="mt-2 flex items-center gap-1 text-xs text-red-400">
            <AlertCircle className="h-3 w-3" />
            <span>Overdue</span>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const totalTasks = filteredColumns.reduce((sum, col) => sum + col.tasks.length, 0);
  const completedTasks = filteredColumns.find(col => col.id === 'done')?.tasks.length || 0;

  return (
    <div className="min-h-screen gradient-bg">

      {/* Header */}
      <div className="p-6 border-b border-white/10">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon"
                className="text-white hover:bg-white/10 border border-white/20 rounded-xl"
                onClick={() => window.history.back()}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-white">My Tasks</h1>
                <p className="text-slate-400">Tasks assigned to you across all projects</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Button
                onClick={() => setIsCreatingTask(true)}
                className="bg-primary hover:bg-primary/90"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Task
              </Button>
              <div className="text-right">
                <div className="text-2xl font-bold text-white">{completedTasks}/{totalTasks}</div>
                <div className="text-xs text-slate-400">Completed</div>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 flex-1 max-w-2xl">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input
                  placeholder="Search tasks, projects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 pr-4 py-3 bg-white/5 border-white/10 text-white placeholder:text-slate-400 rounded-xl text-base"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex gap-3">
              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger className="w-40 bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="All priorities" />
                </SelectTrigger>
                <SelectContent className="glass border-white/10">
                  <SelectItem value="all">All priorities</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterProject} onValueChange={setFilterProject}>
                <SelectTrigger className="w-48 bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="All projects" />
                </SelectTrigger>
                <SelectContent className="glass border-white/10">
                  <SelectItem value="all">All projects</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id.toString()}>
                      {project.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="p-6">
        <div className="max-w-[1400px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredColumns.map((column) => (
              <div 
                key={column.id} 
                onDragOver={(e) => handleDragOver(column.id, e)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(column.id, e)}
                className={cn(
                  "glass rounded-xl p-4",
                  column.color,
                  dragOverColumn === column.id && "bg-primary/5 border-primary/30"
                )}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-white">{column.title}</h3>
                    <Badge variant="secondary" className="text-xs bg-white/10 text-white border-white/20">
                      {column.tasks.length}
                    </Badge>
                  </div>
                </div>

                {/* Tasks */}
                <div className="space-y-3 min-h-[300px]">
                  {column.tasks.map((task) => (
                    <TaskCard key={task.id} task={task} columnId={column.id} />
                  ))}
                </div>

                {/* Empty state */}
                {column.tasks.length === 0 && (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
                      {React.createElement(statusIcons[column.status], { className: "h-6 w-6 text-slate-500" })}
                    </div>
                    <p className="text-slate-500 text-sm">No tasks in {column.title.toLowerCase()}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Create Task Modal */}
      <Dialog open={isCreatingTask} onOpenChange={setIsCreatingTask}>
        <DialogContent className="sm:max-w-[600px] glass border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Create New Task</DialogTitle>
            <DialogDescription className="text-slate-400">
              {currentUser.role === "admin" 
                ? "Add a new task and assign it to any team member." 
                : "Add a new task for yourself."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="title" className="text-white">Task Title</Label>
              <Input
                id="title"
                placeholder="Enter task title..."
                value={newTask.title}
                onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                className="glass border-white/10 text-white placeholder:text-slate-400"
              />
            </div>
            
            <div>
              <Label htmlFor="description" className="text-white">Description</Label>
              <Textarea
                id="description"
                placeholder="Enter task description..."
                value={newTask.description}
                onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="glass border-white/10 text-white placeholder:text-slate-400"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="priority" className="text-white">Priority</Label>
                <Select 
                  value={newTask.priority} 
                  onValueChange={(value: Task["priority"]) => 
                    setNewTask(prev => ({ ...prev, priority: value }))
                  }
                >
                  <SelectTrigger className="glass border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass border-white/10">
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="estimatedHours" className="text-white">Estimated Hours</Label>
                <Input
                  id="estimatedHours"
                  type="number"
                  placeholder="8"
                  value={newTask.estimatedHours}
                  onChange={(e) => setNewTask(prev => ({ ...prev, estimatedHours: e.target.value }))}
                  className="glass border-white/10 text-white placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="assignee" className="text-white">Assign To</Label>
                <Select 
                  value={newTask.assignedTo.toString()} 
                  onValueChange={(value) => 
                    setNewTask(prev => ({ ...prev, assignedTo: parseInt(value) }))
                  }
                >
                  <SelectTrigger className="glass border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass border-white/10">
                    {currentUser.role === "admin" ? (
                      // Admin sees all team members including themselves
                      teamMembers.map((member) => (
                        <SelectItem key={member.id} value={member.id.toString()}>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={member.avatar} />
                              <AvatarFallback className="text-xs bg-white/10 text-white">
                                {member.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <span>{member.name} {member.id === currentUser.id ? "(You)" : ""}</span>
                            {member.role === "admin" && <Badge className="text-xs bg-purple-500/20 text-purple-300">Admin</Badge>}
                          </div>
                        </SelectItem>
                      ))
                    ) : (
                      // Non-admin users only see themselves
                      teamMembers.filter(member => member.id === currentUser.id).map((member) => (
                        <SelectItem key={member.id} value={member.id.toString()}>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={member.avatar} />
                              <AvatarFallback className="text-xs bg-white/10 text-white">
                                {member.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <span>{member.name} (You)</span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="project" className="text-white">Project</Label>
                <div className="glass border-white/10 text-white p-3 rounded-lg bg-white/5">
                  <div className="flex items-center gap-2">
                    <Folder className="h-4 w-4 text-slate-400" />
                    <span className="text-white font-medium">
                      {currentProject?.title || "FunnelHQ 360 Project"}
                    </span>
                    <Badge className="text-xs bg-green-500/20 text-green-300 border-green-500/30">
                      Current Project
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Tasks will be assigned to this project
                  </p>
                </div>
              </div>
            </div>
            
            <div>
              <Label htmlFor="dueDate" className="text-white">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={newTask.dueDate}
                onChange={(e) => setNewTask(prev => ({ ...prev, dueDate: e.target.value }))}
                className="glass border-white/10 text-white"
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <Button 
              variant="outline" 
              onClick={() => setIsCreatingTask(false)}
              className="border-white/20 text-white hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateTask} 
              disabled={!newTask.title.trim()}
              className="bg-primary hover:bg-primary/90"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Task
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Task Details Modal */}
      <Dialog open={isViewingDetails} onOpenChange={setIsViewingDetails}>
        <DialogContent className="sm:max-w-[600px] glass border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Task Details</DialogTitle>
            <DialogDescription className="text-slate-400">
              View task information and progress.
            </DialogDescription>
          </DialogHeader>
          
          {selectedTask && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">{selectedTask.title}</h3>
                {selectedTask.description && (
                  <p className="text-slate-300 text-sm">{selectedTask.description}</p>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-400">Project</Label>
                  <p className="text-white">{selectedTask.projectTitle}</p>
                </div>
                <div>
                  <Label className="text-slate-400">Status</Label>
                  <p className="text-white capitalize">{selectedTask.status.replace('_', ' ')}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-400">Priority</Label>
                  <Badge className={cn("text-xs px-2 py-0.5", priorityColors[selectedTask.priority])}>
                    {selectedTask.priority}
                  </Badge>
                </div>
                <div>
                  <Label className="text-slate-400">Assigned To</Label>
                  <p className="text-white">{selectedTask.assignee?.name || 'Unassigned'}</p>
                </div>
              </div>
              
              {selectedTask.dueDate && (
                <div>
                  <Label className="text-slate-400">Due Date</Label>
                  <p className="text-white">{new Date(selectedTask.dueDate).toLocaleDateString()}</p>
                </div>
              )}
              
              {selectedTask.labels.length > 0 && (
                <div>
                  <Label className="text-slate-400">Labels</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedTask.labels.map((label, index) => (
                      <Badge key={index} variant="secondary" className="text-xs px-2 py-0.5 bg-white/10 text-slate-300 border-white/20">
                        {label}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {selectedTask.checklist.length > 0 && (
                <div>
                  <Label className="text-slate-400">Checklist</Label>
                  <div className="space-y-2 mt-2">
                    {selectedTask.checklist.map((item) => (
                      <div key={item.id} className="flex items-center gap-2">
                        <div className={cn("w-4 h-4 rounded border", item.completed ? "bg-green-500 border-green-500" : "border-white/20")}>
                          {item.completed && <CheckCircle2 className="w-3 h-3 text-white" />}
                        </div>
                        <span className={cn("text-sm", item.completed ? "text-slate-400 line-through" : "text-white")}>
                          {item.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          <div className="flex justify-end gap-3 pt-4">
            <Button 
              variant="outline" 
              onClick={() => setIsViewingDetails(false)}
              className="border-white/20 text-white hover:bg-white/10"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Task Modal */}
      <Dialog open={isEditingTask} onOpenChange={setIsEditingTask}>
        <DialogContent className="sm:max-w-[600px] glass border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Task</DialogTitle>
            <DialogDescription className="text-slate-400">
              Update task information and settings.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-title" className="text-white">Task Title</Label>
              <Input
                id="edit-title"
                placeholder="Enter task title..."
                value={newTask.title}
                onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                className="glass border-white/10 text-white placeholder:text-slate-400"
              />
            </div>
            
            <div>
              <Label htmlFor="edit-description" className="text-white">Description</Label>
              <Textarea
                id="edit-description"
                placeholder="Enter task description..."
                value={newTask.description}
                onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="glass border-white/10 text-white placeholder:text-slate-400"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-priority" className="text-white">Priority</Label>
                <Select 
                  value={newTask.priority} 
                  onValueChange={(value: Task["priority"]) => 
                    setNewTask(prev => ({ ...prev, priority: value }))
                  }
                >
                  <SelectTrigger className="glass border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass border-white/10">
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="edit-estimatedHours" className="text-white">Estimated Hours</Label>
                <Input
                  id="edit-estimatedHours"
                  type="number"
                  placeholder="8"
                  value={newTask.estimatedHours}
                  onChange={(e) => setNewTask(prev => ({ ...prev, estimatedHours: e.target.value }))}
                  className="glass border-white/10 text-white placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-assignee" className="text-white">Assign To</Label>
                <Select 
                  value={newTask.assignedTo.toString()} 
                  onValueChange={(value) => 
                    setNewTask(prev => ({ ...prev, assignedTo: parseInt(value) }))
                  }
                >
                  <SelectTrigger className="glass border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass border-white/10">
                    {teamMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id.toString()}>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={member.avatar} />
                            <AvatarFallback className="text-xs bg-white/10 text-white">
                              {member.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <span>{member.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="edit-project" className="text-white">Project</Label>
                <Select 
                  value={newTask.projectId.toString()} 
                  onValueChange={(value) => 
                    setNewTask(prev => ({ ...prev, projectId: parseInt(value) }))
                  }
                >
                  <SelectTrigger className="glass border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass border-white/10">
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id.toString()}>
                        {project.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="edit-dueDate" className="text-white">Due Date</Label>
              <Input
                id="edit-dueDate"
                type="date"
                value={newTask.dueDate}
                onChange={(e) => setNewTask(prev => ({ ...prev, dueDate: e.target.value }))}
                className="glass border-white/10 text-white"
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <Button 
              variant="outline" 
              onClick={() => setIsEditingTask(false)}
              className="border-white/20 text-white hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateTask} 
              disabled={!newTask.title.trim()}
              className="bg-primary hover:bg-primary/90"
            >
              Update Task
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}