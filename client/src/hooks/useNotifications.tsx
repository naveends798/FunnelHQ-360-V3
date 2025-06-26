import { useState, useEffect, useCallback } from "react";
import { Notification } from "@shared/schema";
import { useWebSocket } from "./useWebSocket";

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: number) => Promise<void>;
  refetch: () => Promise<void>;
}

interface UseNotificationsOptions {
  userId: number;
  filter?: "all" | "unread";
  limit?: number;
  pollingInterval?: number; // in milliseconds
}

export function useNotifications({
  userId,
  filter = "all",
  limit = 50,
  pollingInterval = 30000 // 30 seconds
}: UseNotificationsOptions): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    // Don't fetch if userId is invalid
    if (!userId || userId <= 0) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const params = new URLSearchParams({
        userId: userId.toString(),
        limit: limit.toString(),
      });

      if (filter === "unread") {
        params.append("isRead", "false");
      }

      const response = await fetch(`/api/notifications?${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch notifications");
      }

      const data = await response.json();
      setNotifications(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [userId, filter, limit]);

  const fetchUnreadCount = useCallback(async () => {
    // Don't fetch if userId is invalid
    if (!userId || userId <= 0) {
      setUnreadCount(0);
      return;
    }

    try {
      const response = await fetch(`/api/notifications/unread-count?userId=${userId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch unread count");
      }

      const data = await response.json();
      setUnreadCount(data.count);
    } catch (err) {
      console.error("Failed to fetch unread count:", err);
    }
  }, [userId]);

  const markAsRead = useCallback(async (id: number) => {
    try {
      const response = await fetch(`/api/notifications/${id}/read`, {
        method: "PATCH",
      });

      if (!response.ok) {
        throw new Error("Failed to mark notification as read");
      }

      // Update local state
      setNotifications(prev =>
        prev.map(n =>
          n.id === id
            ? { ...n, isRead: true, readAt: new Date() }
            : n
        )
      );

      // Update unread count
      await fetchUnreadCount();
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  }, [fetchUnreadCount]);

  const markAllAsRead = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications/mark-all-read", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        throw new Error("Failed to mark all notifications as read");
      }

      // Update local state
      setNotifications(prev =>
        prev.map(n => ({
          ...n,
          isRead: true,
          readAt: new Date(),
        }))
      );

      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);
    }
  }, [userId]);

  const deleteNotification = useCallback(async (id: number) => {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete notification");
      }

      // Update local state
      setNotifications(prev => prev.filter(n => n.id !== id));

      // Update unread count
      await fetchUnreadCount();
    } catch (err) {
      console.error("Failed to delete notification:", err);
    }
  }, [fetchUnreadCount]);

  const refetch = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchNotifications(), fetchUnreadCount()]);
  }, [fetchNotifications, fetchUnreadCount]);

  // Handle real-time notifications via WebSocket
  const handleNewNotification = useCallback((notification: Notification) => {
    // Add the new notification to the list if it's for this filter
    if (filter === "all" || (filter === "unread" && !notification.isRead)) {
      setNotifications(prev => {
        // Avoid duplicates
        const exists = prev.some(n => n.id === notification.id);
        if (exists) return prev;
        
        // Add new notification at the beginning and sort by date
        return [notification, ...prev].sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });
    }
    
    // Update unread count if notification is unread
    if (!notification.isRead) {
      setUnreadCount(prev => prev + 1);
    }
  }, [filter]);

  // Set up WebSocket connection for real-time updates
  useWebSocket({
    userId,
    onNotification: handleNewNotification,
    onConnect: () => {
      console.log('Connected to notification WebSocket');
    },
    onDisconnect: () => {
      console.log('Disconnected from notification WebSocket');
    }
  });

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();
  }, [fetchNotifications, fetchUnreadCount]);

  // Polling as fallback (reduced frequency when WebSocket is available)
  useEffect(() => {
    if (pollingInterval > 0) {
      const interval = setInterval(() => {
        fetchNotifications();
        fetchUnreadCount();
      }, pollingInterval);

      return () => clearInterval(interval);
    }
  }, [fetchNotifications, fetchUnreadCount, pollingInterval]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refetch,
  };
}