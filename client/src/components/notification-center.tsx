import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { 
  Bell, 
  Check, 
  CheckCheck, 
  MessageSquare, 
  FileText, 
  UserPlus, 
  CreditCard,
  AlertCircle,
  Calendar,
  X,
  Settings
} from "lucide-react";
import { Notification } from "@shared/schema";

interface NotificationCenterProps {
  className?: string;
}

// Helper function to format time ago
const formatTimeAgo = (date: Date) => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
};

const getNotificationIcon = (type: string) => {
  switch (type) {
    case "comment":
      return MessageSquare;
    case "mention":
      return MessageSquare;
    case "project_update":
      return FileText;
    case "form_submission":
      return UserPlus;
    case "billing":
      return CreditCard;
    case "urgent":
      return AlertCircle;
    case "deadline":
      return Calendar;
    default:
      return Bell;
  }
};

const getNotificationColor = (type: string) => {
  switch (type) {
    case "comment":
      return "text-blue-400";
    case "mention":
      return "text-purple-400";
    case "project_update":
      return "text-green-400";
    case "form_submission":
      return "text-yellow-400";
    case "billing":
      return "text-emerald-400";
    case "urgent":
      return "text-red-400";
    case "deadline":
      return "text-orange-400";
    default:
      return "text-slate-400";
  }
};

export default function NotificationCenter({ className }: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const { authUser, loading: authLoading } = useAuth();

  // Only load notifications when we have a valid authenticated user
  const shouldLoadNotifications = !authLoading && authUser?.id;
  
  // Use real notifications hook - only when user is authenticated
  const {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refetch
  } = useNotifications({
    userId: authUser?.id || 1,
    filter,
    limit: 50,
    pollingInterval: shouldLoadNotifications ? 30000 : 0
  });

  const filteredNotifications = filter === "unread" 
    ? notifications.filter(n => !n.isRead)
    : notifications;

  const clearNotification = (notificationId: number) => {
    deleteNotification(notificationId);
  };

  return (
    <div className={cn("relative", className)}>
      {/* Notification Bell Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="relative text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </motion.div>
        )}
      </Button>

      {/* Notification Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            
            {/* Dropdown */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="absolute right-0 top-12 w-96 z-50 glass-dark border border-white/10 rounded-xl shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="p-4 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white">Notifications</h3>
                    <p className="text-sm text-slate-400">
                      {unreadCount} unread notifications
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={markAllAsRead}
                      className="text-slate-400 hover:text-white"
                      disabled={unreadCount === 0}
                    >
                      <CheckCheck className="h-4 w-4 mr-1" />
                      Mark all read
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsOpen(false)}
                      className="text-slate-400 hover:text-white h-8 w-8"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Filter Tabs */}
                <div className="flex mt-3 space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFilter("all")}
                    className={cn(
                      "text-xs px-3 py-1 h-7",
                      filter === "all"
                        ? "bg-white/20 text-white"
                        : "text-slate-400 hover:text-white"
                    )}
                  >
                    All ({notifications.length})
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFilter("unread")}
                    className={cn(
                      "text-xs px-3 py-1 h-7",
                      filter === "unread"
                        ? "bg-white/20 text-white"
                        : "text-slate-400 hover:text-white"
                    )}
                  >
                    Unread ({unreadCount})
                  </Button>
                </div>
              </div>

              {/* Notifications List */}
              <ScrollArea className="h-96">
                <div className="p-2">
                  {filteredNotifications.length === 0 ? (
                    <div className="text-center py-8">
                      <Bell className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                      <p className="text-slate-400 font-medium">
                        {filter === "unread" ? "No unread notifications" : "No notifications"}
                      </p>
                      <p className="text-slate-500 text-sm mt-1">
                        {filter === "unread" 
                          ? "You're all caught up!" 
                          : "New notifications will appear here"
                        }
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {filteredNotifications.map((notification, index) => {
                        const Icon = getNotificationIcon(notification.type);
                        const iconColor = getNotificationColor(notification.type);
                        const timeAgo = formatTimeAgo(new Date(notification.createdAt));
                        
                        return (
                          <motion.div
                            key={notification.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className={cn(
                              "group relative p-3 rounded-lg transition-all duration-200 cursor-pointer",
                              notification.isRead
                                ? "hover:bg-white/5"
                                : "bg-white/10 hover:bg-white/15"
                            )}
                            onClick={() => {
                              if (!notification.isRead) {
                                markAsRead(notification.id);
                              }
                              // TODO: Navigate to actionUrl
                              console.log("Navigate to:", notification.actionUrl);
                            }}
                          >
                            <div className="flex items-start space-x-3">
                              {/* Avatar or Icon */}
                              <div className="flex-shrink-0">
                                <div className={cn(
                                  "w-8 h-8 rounded-full flex items-center justify-center",
                                  notification.isRead ? "bg-slate-700" : "bg-slate-600"
                                )}>
                                  <Icon className={cn("h-4 w-4", iconColor)} />
                                </div>
                              </div>

                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1 min-w-0">
                                    <p className={cn(
                                      "text-sm font-medium truncate",
                                      notification.isRead ? "text-slate-300" : "text-white"
                                    )}>
                                      {notification.title}
                                    </p>
                                    <p className={cn(
                                      "text-sm mt-1 line-clamp-2",
                                      notification.isRead ? "text-slate-500" : "text-slate-400"
                                    )}>
                                      {notification.message}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-2">
                                      {timeAgo}
                                    </p>
                                  </div>
                                  
                                  {/* Actions */}
                                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {!notification.isRead && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          markAsRead(notification.id);
                                        }}
                                        className="h-6 w-6 text-slate-400 hover:text-white"
                                      >
                                        <Check className="h-3 w-3" />
                                      </Button>
                                    )}
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        clearNotification(notification.id);
                                      }}
                                      className="h-6 w-6 text-slate-400 hover:text-red-400"
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>

                                {/* Unread indicator */}
                                {!notification.isRead && (
                                  <div className="absolute left-1 top-4 w-2 h-2 bg-blue-500 rounded-full"></div>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Footer */}
              <div className="p-3 border-t border-white/10">
                <Button
                  variant="ghost"
                  className="w-full text-slate-400 hover:text-white justify-center"
                  onClick={() => {
                    setIsOpen(false);
                    // TODO: Navigate to notifications page
                  }}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  View all notifications
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}