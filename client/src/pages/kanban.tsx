import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCorners,
  rectIntersection
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Plus,
  MoreHorizontal,
  Calendar,
  Clock,
  User,
  AlertCircle,
  CheckCircle2,
  Circle,
  Timer,
  ArrowLeft,
  Filter,
  Search,
  Settings
} from "lucide-react";
import { cn } from "@/lib/utils";

// Types
interface Task {
  id: number;
  projectId: number;
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
}

interface Project {
  id: number;
  title: string;
  description: string;
  status: string;
  client: {
    name: string;
    company: string;
  };
}

interface BoardColumn {
  id: string;
  title: string;
  status: Task["status"];
  color: string;
  tasks: Task[];
}

const priorityColors = {
  low: "bg-blue-100 text-blue-800 border-blue-200",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
  high: "bg-orange-100 text-orange-800 border-orange-200",
  urgent: "bg-red-100 text-red-800 border-red-200"
};

const statusIcons = {
  todo: Circle,
  in_progress: Timer,
  review: AlertCircle,
  done: CheckCircle2
};

interface KanbanBoardProps {
  projectId?: string;
}

export default function KanbanBoard({ projectId: propProjectId }: KanbanBoardProps) {
  const [project, setProject] = useState<Project | null>(null);
  const [columns, setColumns] = useState<BoardColumn[]>([
    { id: "todo", title: "To Do", status: "todo", color: "glass border-white/10", tasks: [] },
    { id: "in_progress", title: "In Progress", status: "in_progress", color: "glass border-blue-500/20", tasks: [] },
    { id: "review", title: "Review", status: "review", color: "glass border-amber-500/20", tasks: [] },
    { id: "done", title: "Done", status: "done", color: "glass border-green-500/20", tasks: [] }
  ]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [selectedColumn, setSelectedColumn] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPriority, setFilterPriority] = useState<string>("");
  const [filterAssignee, setFilterAssignee] = useState<string>("");

  // Get projectId from URL params or set default
  const projectId = propProjectId ? parseInt(propProjectId) : 1;

  // Drag and drop sensors - more sensitive
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 1, // Reduced from 3 to 1 for instant activation
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 50, // Reduced from 100 to 50
        tolerance: 2, // Reduced from 5 to 2
      },
    })
  );

  // New task form state
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    priority: "medium" as Task["priority"],
    assignedTo: "",
    estimatedHours: "",
    dueDate: "",
    labels: [] as string[]
  });

  useEffect(() => {
    fetchProjectAndTasks();
  }, [projectId]);

  const fetchProjectAndTasks = async () => {
    try {
      setLoading(true);
      
      // Mock project data
      const projectData: Project = {
        id: 1,
        title: "My Tasks",
        description: "Personal task management",
        status: "active",
        client: {
          name: "Personal",
          company: "Self"
        }
      };
      setProject(projectData);

      // Empty tasks array for production use
      const mockTasks: Task[] = [];

      // Organize tasks by status
      const newColumns = columns.map(column => ({
        ...column,
        tasks: mockTasks.filter(task => task.status === column.status)
      }));

      setColumns(newColumns);
    } catch (error) {
      console.error("Failed to fetch project and tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const taskId = active.id as number;
    
    setActiveId(taskId);
    
    // Find the task being dragged
    const task = columns.flatMap(col => col.tasks).find(t => t.id === taskId);
    setDraggedTask(task || null);
  };

  const handleTaskMove = async (taskId: number) => {
    try {
      // Find the current task to get its new status
      const currentTask = columns.flatMap(col => col.tasks).find(task => task.id === taskId);
      if (!currentTask) return;

      await fetch(`/api/tasks/${taskId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: currentTask.status })
      });

      // Refresh the data to get updated project progress
      fetchProjectAndTasks();
    } catch (error) {
      console.error("Failed to update task status:", error);
      // Optionally revert the UI change on error
      fetchProjectAndTasks();
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as number;
    const overId = over.id;

    // Find the columns
    const activeColumn = columns.find(col => col.tasks.some(task => task.id === activeId));
    const overColumn = columns.find(col => col.id === overId || col.tasks.some(task => task.id === overId));

    if (!activeColumn || !overColumn) return;
    if (activeColumn.id === overColumn.id) return;

    // Move task between columns instantly
    setColumns(prevColumns => {
      const activeItems = activeColumn.tasks;
      const overItems = overColumn.tasks;

      const activeIndex = activeItems.findIndex(item => item.id === activeId);
      const overIndex = typeof overId === 'number' ? overItems.findIndex(item => item.id === overId) : 0;

      const [movedTask] = activeItems.splice(activeIndex, 1);
      movedTask.status = overColumn.status;
      overItems.splice(overIndex, 0, movedTask);

      return prevColumns.map(col => {
        if (col.id === activeColumn.id) {
          return { ...col, tasks: activeItems };
        }
        if (col.id === overColumn.id) {
          return { ...col, tasks: overItems };
        }
        return col;
      });
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveId(null);
    setDraggedTask(null);
    
    if (!over) return;

    const activeId = active.id as number;
    const overId = over.id;

    // Handle reordering within same column
    const activeColumn = columns.find(col => col.tasks.some(task => task.id === activeId));
    if (activeColumn && typeof overId === 'number') {
      const oldIndex = activeColumn.tasks.findIndex(task => task.id === activeId);
      const newIndex = activeColumn.tasks.findIndex(task => task.id === overId);
      
      if (oldIndex !== newIndex) {
        setColumns(prevColumns => 
          prevColumns.map(col => 
            col.id === activeColumn.id 
              ? { ...col, tasks: arrayMove(col.tasks, oldIndex, newIndex) }
              : col
          )
        );
      }
    }

    // Persist the changes to the backend
    handleTaskMove(activeId);
  };

  const handleAddTask = async () => {
    if (!newTask.title.trim()) return;

    try {
      const taskData = {
        ...newTask,
        projectId,
        status: selectedColumn,
        assignedTo: newTask.assignedTo ? parseInt(newTask.assignedTo) : null,
        estimatedHours: newTask.estimatedHours || null,
        position: columns.find(col => col.id === selectedColumn)?.tasks.length || 0,
        checklist: [],
        createdBy: 1 // This would come from auth context
      };

      await fetch(`/api/projects/${projectId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskData)
      });

      // Reset form
      setNewTask({
        title: "",
        description: "",
        priority: "medium",
        assignedTo: "",
        estimatedHours: "",
        dueDate: "",
        labels: []
      });
      setIsAddingTask(false);
      setSelectedColumn("");

      // Refresh tasks
      fetchProjectAndTasks();
    } catch (error) {
      console.error("Failed to create task:", error);
    }
  };

  const filteredColumns = columns.map(column => ({
    ...column,
    tasks: column.tasks.filter(task => {
      const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          task.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPriority = !filterPriority || task.priority === filterPriority;
      const matchesAssignee = !filterAssignee || task.assignedTo?.toString() === filterAssignee;
      
      return matchesSearch && matchesPriority && matchesAssignee;
    })
  }));

  const SortableTaskCard = ({ task, columnId }: { task: Task; columnId: string }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: task.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition: isDragging ? 'none' : transition, // Remove transition while dragging for instant response
      zIndex: isDragging ? 1000 : 'auto',
    };

    return (
      <motion.div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className={cn(
          "touch-none select-none cursor-grab active:cursor-grabbing",
          isDragging && "opacity-70 rotate-3 scale-105"
        )}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
      >
        <TaskCard task={task} columnId={columnId} isDragging={isDragging} />
      </motion.div>
    );
  };

  const TaskCard = ({ task, columnId, isDragging = false }: { task: Task; columnId: string; isDragging?: boolean }) => {
    const StatusIcon = statusIcons[task.status];
    const completedChecklist = task.checklist.filter(item => item.completed).length;
    const totalChecklist = task.checklist.length;
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const [isHovered, setIsHovered] = useState(false);

    const handleMouseMove = (e: React.MouseEvent) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = (e.clientX - rect.left - rect.width / 2) / rect.width;
      const y = (e.clientY - rect.top - rect.height / 2) / rect.height;
      setMousePosition({ x, y });
    };

    const handleMouseEnter = () => {
      setIsHovered(true);
    };

    const handleMouseLeave = () => {
      setIsHovered(false);
      setMousePosition({ x: 0, y: 0 });
    };

    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 20, rotateX: -10, scale: 0.95 }}
        animate={{ 
          opacity: 1, 
          y: 0, 
          rotateX: 0,
          scale: isDragging ? 1.08 : 1,
          rotateY: isHovered ? mousePosition.x * 15 : 0,
          rotateZ: isDragging ? 5 : 0
        }}
        exit={{ opacity: 0, y: -20, rotateX: 10, scale: 0.95 }}
        whileHover={{ 
          y: -12, 
          rotateX: 8,
          scale: 1.03,
          transition: { type: "spring", stiffness: 400, damping: 25 }
        }}
        transition={{ 
          type: "spring", 
          stiffness: 260, 
          damping: 20
        }}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={cn(
          "bg-gradient-to-br from-white/95 to-white/85 backdrop-blur-lg border border-white/30 rounded-2xl p-5",
          "shadow-lg hover:shadow-2xl transition-all duration-300",
          "transform-gpu group relative overflow-hidden",
          "before:absolute before:inset-0 before:bg-gradient-to-br before:from-blue-500/5 before:via-purple-500/5 before:to-pink-500/5 before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-500",
          "after:absolute after:inset-0 after:bg-gradient-to-t after:from-black/5 after:to-transparent after:opacity-0 hover:after:opacity-100 after:transition-opacity after:duration-300",
          isDragging && "shadow-3xl ring-2 ring-blue-400/50 bg-gradient-to-br from-blue-50/95 to-white/90"
        )}
        style={{
          transformStyle: "preserve-3d",
          perspective: "1000px",
          filter: isDragging ? "brightness(1.1) saturate(1.2)" : "none",
          boxShadow: isHovered 
            ? `${mousePosition.x * 10}px ${mousePosition.y * 10}px 40px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.2)` 
            : undefined
        }}
      >
        {/* Enhanced glassmorphism overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-blue-500/5 to-purple-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-500" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-300" />
        
        {/* Animated shimmer effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent rounded-2xl translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-out" />
        
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-4">
            <h4 className="font-semibold text-sm text-slate-800 line-clamp-2 flex-1 leading-tight">
              {task.title}
            </h4>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-white/50 rounded-full">
                    <MoreHorizontal className="h-3.5 w-3.5 text-slate-600" />
                  </Button>
                </motion.div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 glass backdrop-blur-lg border-white/20">
                <DropdownMenuItem className="hover:bg-white/10">Edit Task</DropdownMenuItem>
                <DropdownMenuItem className="hover:bg-white/10">Duplicate</DropdownMenuItem>
                <DropdownMenuItem className="text-red-600 hover:bg-red-500/10">Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {task.description && (
            <p className="text-xs text-slate-600 mb-4 line-clamp-2 leading-relaxed">
              {task.description}
            </p>
          )}

          {/* Labels */}
          {task.labels.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {task.labels.slice(0, 3).map((label, index) => (
                <motion.div
                  key={index}
                  whileHover={{ scale: 1.05, y: -1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  <Badge variant="secondary" className="text-xs px-2 py-1 bg-gradient-to-r from-blue-100/80 to-purple-100/80 backdrop-blur-sm border border-white/30 text-slate-700 font-medium">
                    {label}
                  </Badge>
                </motion.div>
              ))}
              {task.labels.length > 3 && (
                <motion.div
                  whileHover={{ scale: 1.05, y: -1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  <Badge variant="secondary" className="text-xs px-2 py-1 bg-gradient-to-r from-slate-100/80 to-gray-100/80 backdrop-blur-sm border border-white/30 text-slate-700 font-medium">
                    +{task.labels.length - 3}
                  </Badge>
                </motion.div>
              )}
            </div>
          )}

          {/* Progress indicators */}
          <div className="flex items-center justify-between text-xs text-slate-500 mb-4 gap-2">
            {totalChecklist > 0 && (
              <motion.div 
                className="flex items-center gap-1.5 px-2 py-1 bg-green-50/50 rounded-full"
                whileHover={{ scale: 1.05 }}
              >
                <CheckCircle2 className="h-3 w-3 text-green-600" />
                <span className="font-medium">{completedChecklist}/{totalChecklist}</span>
              </motion.div>
            )}
            
            {task.estimatedHours && (
              <motion.div 
                className="flex items-center gap-1.5 px-2 py-1 bg-blue-50/50 rounded-full"
                whileHover={{ scale: 1.05 }}
              >
                <Clock className="h-3 w-3 text-blue-600" />
                <span className="font-medium">{task.estimatedHours}h</span>
              </motion.div>
            )}
            
            {task.dueDate && (
              <motion.div 
                className="flex items-center gap-1.5 px-2 py-1 bg-orange-50/50 rounded-full"
                whileHover={{ scale: 1.05 }}
              >
                <Calendar className="h-3 w-3 text-orange-600" />
                <span className="font-medium">{new Date(task.dueDate).toLocaleDateString()}</span>
              </motion.div>
            )}
          </div>

          {/* Bottom row */}
          <div className="flex items-center justify-between pt-2 border-t border-white/20">
            <div className="flex items-center gap-2">
              <motion.div
                whileHover={{ scale: 1.05, y: -1 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              >
                <Badge className={cn("text-xs px-2.5 py-1 font-semibold shadow-sm", priorityColors[task.priority])}>
                  {task.priority}
                </Badge>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.2, rotate: 90 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              >
                <StatusIcon className="h-3.5 w-3.5 text-slate-500" />
              </motion.div>
            </div>
            
            {task.assignee && (
              <motion.div
                whileHover={{ scale: 1.1, y: -2 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              >
                <Avatar className="h-7 w-7 ring-2 ring-white/30 shadow-lg">
                  <AvatarImage src={task.assignee.avatar} />
                  <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 text-white font-semibold">
                    {task.assignee.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="rounded-full h-8 w-8 border-b-2 border-indigo-600"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg">
      {/* Header */}
      <div className="glass border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => window.history.back()} className="text-white hover:bg-white/10 border border-white/20 rounded-xl">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-lg font-semibold text-white">
                  {project?.title} - Kanban Board
                </h1>
                <p className="text-sm text-slate-300">
                  {project?.client.name} • {project?.description}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search tasks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-64 glass border-white/10 text-white placeholder:text-slate-400"
                />
              </div>
              
              {/* Filters */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10">
                    <Filter className="h-4 w-4 mr-2" />
                    Filter
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="p-2">
                    <Label className="text-xs font-medium">Priority</Label>
                    <Select value={filterPriority} onValueChange={setFilterPriority}>
                      <SelectTrigger className="h-8 mt-1">
                        <SelectValue placeholder="All priorities" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All priorities</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <Button variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <DndContext
          sensors={sensors}
          collisionDetection={rectIntersection}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredColumns.map((column) => (
              <motion.div 
                key={column.id} 
                className={cn(
                  "rounded-xl border-2 border-dashed p-4 transition-all duration-300",
                  column.color,
                  "hover:scale-[1.02] hover:shadow-lg"
                )}
                whileHover={{ y: -2 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-white">{column.title}</h3>
                    <Badge variant="secondary" className="text-xs bg-white/10 text-white border-white/20">
                      {column.tasks.length}
                    </Badge>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-white hover:bg-white/10 hover:scale-110 transition-all duration-200"
                    onClick={() => {
                      setSelectedColumn(column.id);
                      setIsAddingTask(true);
                    }}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>

                {/* Droppable area */}
                <SortableContext items={column.tasks.map(task => task.id)} strategy={verticalListSortingStrategy}>
                  <motion.div 
                    className="space-y-4 min-h-[200px] relative p-2 rounded-xl"
                    animate={{
                      backgroundColor: activeId && !column.tasks.find(t => t.id === activeId) 
                        ? 'rgba(59, 130, 246, 0.1)' 
                        : 'transparent',
                      scale: activeId && !column.tasks.find(t => t.id === activeId) ? 1.02 : 1,
                      boxShadow: activeId && !column.tasks.find(t => t.id === activeId) 
                        ? '0 0 20px rgba(59, 130, 246, 0.3)' 
                        : '0 0 0 rgba(0,0,0,0)'
                    }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  >
                    <AnimatePresence>
                      {column.tasks.map((task) => (
                        <SortableTaskCard key={task.id} task={task} columnId={column.id} />
                      ))}
                    </AnimatePresence>
                    
                    {/* Enhanced drop indicator */}
                    {column.tasks.length === 0 && (
                      <motion.div 
                        className="flex items-center justify-center h-40 text-white/30 text-sm border-2 border-dashed border-white/20 rounded-xl"
                        animate={{
                          borderColor: activeId ? 'rgba(59, 130, 246, 0.5)' : 'rgba(255, 255, 255, 0.2)',
                          backgroundColor: activeId ? 'rgba(59, 130, 246, 0.05)' : 'transparent'
                        }}
                        transition={{ duration: 0.3 }}
                      >
                        <div className="text-center">
                          <div className="text-lg mb-1">✨</div>
                          <div>Drop tasks here</div>
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                </SortableContext>
              </motion.div>
            ))}
          </div>
          
          {/* Enhanced Drag Overlay */}
          <DragOverlay adjustScale={false}>
            {activeId && draggedTask ? (
              <motion.div
                initial={{ rotate: 0, scale: 1 }}
                animate={{ 
                  rotate: 12, 
                  scale: 1.15,
                  rotateX: 15,
                  rotateY: 5
                }}
                className="transform-gpu cursor-grabbing"
                style={{
                  transformStyle: "preserve-3d",
                  perspective: "1000px",
                  filter: "drop-shadow(0 30px 60px rgba(0,0,0,0.3)) brightness(1.1) saturate(1.3)",
                  zIndex: 9999
                }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <div className="relative">
                  {/* Glow effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-400/30 via-purple-400/30 to-pink-400/30 rounded-2xl blur-xl" />
                  <TaskCard task={draggedTask} columnId="" isDragging={true} />
                </div>
              </motion.div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Add Task Dialog */}
      <Dialog open={isAddingTask} onOpenChange={setIsAddingTask}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Task</DialogTitle>
            <DialogDescription>
              Create a new task in the {columns.find(col => col.id === selectedColumn)?.title} column.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Task Title</Label>
              <Input
                id="title"
                placeholder="Enter task title..."
                value={newTask.title}
                onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Enter task description..."
                value={newTask.description}
                onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select value={newTask.priority} onValueChange={(value: Task["priority"]) => 
                  setNewTask(prev => ({ ...prev, priority: value }))
                }>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="estimatedHours">Estimated Hours</Label>
                <Input
                  id="estimatedHours"
                  type="number"
                  placeholder="8"
                  value={newTask.estimatedHours}
                  onChange={(e) => setNewTask(prev => ({ ...prev, estimatedHours: e.target.value }))}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={newTask.dueDate}
                onChange={(e) => setNewTask(prev => ({ ...prev, dueDate: e.target.value }))}
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setIsAddingTask(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddTask} disabled={!newTask.title.trim()}>
              Add Task
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}