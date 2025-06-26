import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string): string {
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numAmount);
}

export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) return "Just now";
  if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? "s" : ""} ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? "s" : ""} ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? "s" : ""} ago`;
  
  return date.toLocaleDateString();
}

export function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case "active":
    case "on track":
    case "completed":
      return "bg-green-500/20 text-green-400";
    case "in progress":
    case "pending":
      return "bg-blue-500/20 text-blue-400";
    case "in review":
    case "paused":
      return "bg-yellow-500/20 text-yellow-400";
    case "cancelled":
    case "overdue":
      return "bg-red-500/20 text-red-400";
    default:
      return "bg-gray-500/20 text-gray-400";
  }
}

export function getPriorityColor(priority: string): string {
  switch (priority.toLowerCase()) {
    case "high":
      return "bg-red-500/20 text-red-400";
    case "medium":
      return "bg-yellow-500/20 text-yellow-400";
    case "low":
      return "bg-green-500/20 text-green-400";
    default:
      return "bg-gray-500/20 text-gray-400";
  }
}

export function calculateDaysLeft(endDate: Date | string | null): number {
  if (!endDate) return 0;
  const targetDate = typeof endDate === 'string' ? new Date(endDate) : endDate;
  if (isNaN(targetDate.getTime())) return 0;
  const now = new Date();
  const diffInTime = targetDate.getTime() - now.getTime();
  const diffInDays = Math.ceil(diffInTime / (1000 * 3600 * 24));
  return Math.max(0, diffInDays);
}

export function getProgressColor(progress: number): string {
  if (progress >= 75) return "rgb(34 197 94)"; // green
  if (progress >= 50) return "rgb(234 179 8)"; // yellow
  if (progress >= 25) return "rgb(59 130 246)"; // blue
  return "rgb(239 68 68)"; // red
}

// Project calculation utilities
export interface Task {
  id: number;
  status: "todo" | "in_progress" | "review" | "done";
  dueDate?: string;
  completedAt?: string;
}

export function calculateProgressFromTasks(tasks: Task[]): number {
  if (!tasks || tasks.length === 0) return 0;
  
  const completedTasks = tasks.filter(task => task.status === "done");
  const progress = Math.round((completedTasks.length / tasks.length) * 100);
  
  return Math.min(100, Math.max(0, progress));
}

export function calculateEndDateFromTasks(tasks: Task[]): Date | null {
  if (!tasks || tasks.length === 0) return null;
  
  // Find the latest due date from all tasks
  const dueDates = tasks
    .map(task => task.dueDate)
    .filter(date => date !== null && date !== undefined)
    .map(date => new Date(date!))
    .filter(date => !isNaN(date.getTime()));
  
  if (dueDates.length === 0) return null;
  
  // Return the latest due date
  return new Date(Math.max(...dueDates.map(date => date.getTime())));
}

export function calculateDaysLeftFromTasks(tasks: Task[]): number {
  const endDate = calculateEndDateFromTasks(tasks);
  return calculateDaysLeft(endDate);
}

export function getTaskCompletionSummary(tasks: Task[]): {
  total: number;
  completed: number;
  inProgress: number;
  todo: number;
  review: number;
  progressPercentage: number;
} {
  if (!tasks || tasks.length === 0) {
    return {
      total: 0,
      completed: 0,
      inProgress: 0,
      todo: 0,
      review: 0,
      progressPercentage: 0
    };
  }

  const total = tasks.length;
  const completed = tasks.filter(task => task.status === "done").length;
  const inProgress = tasks.filter(task => task.status === "in_progress").length;
  const todo = tasks.filter(task => task.status === "todo").length;
  const review = tasks.filter(task => task.status === "review").length;
  const progressPercentage = Math.round((completed / total) * 100);

  return {
    total,
    completed,
    inProgress,
    todo,
    review,
    progressPercentage
  };
}
