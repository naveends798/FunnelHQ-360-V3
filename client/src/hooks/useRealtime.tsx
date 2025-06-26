import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useQueryClient } from '@tanstack/react-query'

export const useRealtimeProjects = (organizationId: number) => {
  const queryClient = useQueryClient()
  
  useEffect(() => {
    const channel = supabase
      .channel('projects-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'projects',
          filter: `organization_id=eq.${organizationId}`
        },
        () => {
          // Invalidate projects query to refetch
          queryClient.invalidateQueries({ queryKey: ['projects'] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [organizationId, queryClient])
}

export const useRealtimeNotifications = (userId: number) => {
  const queryClient = useQueryClient()
  const [newNotification, setNewNotification] = useState<any>(null)
  
  useEffect(() => {
    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public', 
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          setNewNotification(payload.new)
          queryClient.invalidateQueries({ queryKey: ['notifications'] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, queryClient])
  
  return newNotification
}

export const useRealtimeMessages = (projectId: number) => {
  const queryClient = useQueryClient()
  
  useEffect(() => {
    const channel = supabase
      .channel(`messages-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages', 
          filter: `project_id=eq.${projectId}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['messages', projectId] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [projectId, queryClient])
}