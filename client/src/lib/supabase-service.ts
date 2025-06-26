import { useSupabase } from './supabase'
import { useAuth } from '@clerk/clerk-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// User Management Service
export const useUserService = () => {
  const { getAuthenticatedClient } = useSupabase()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  // Get current user profile
  const useUserProfile = () => {
    return useQuery({
      queryKey: ['user-profile', user?.id],
      queryFn: async () => {
        const client = await getAuthenticatedClient()
        const { data, error } = await client
          .from('users')
          .select('*')
          .eq('email', user?.primaryEmailAddress?.emailAddress)
          .single()

        if (error) throw error
        return data
      },
      enabled: !!user?.primaryEmailAddress?.emailAddress,
    })
  }

  // Create or update user profile
  const useUpsertUserProfile = () => {
    return useMutation({
      mutationFn: async (userData: {
        email: string
        name: string
        avatar?: string
        specialization?: string
        company_name?: string
        company_role?: string
        industry?: string
        company_size?: string
        subscription_plan?: string
      }) => {
        const client = await getAuthenticatedClient()
        const { data, error } = await client
          .from('users')
          .upsert([userData], { onConflict: 'email' })
          .select()
          .single()

        if (error) throw error
        return data
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['user-profile'] })
      },
    })
  }

  // Update user profile
  const useUpdateUserProfile = () => {
    return useMutation({
      mutationFn: async (updates: Partial<{
        name: string
        avatar: string
        specialization: string
        company_name: string
        company_role: string
        industry: string
        company_size: string
        subscription_plan: string
        subscription_status: string
        max_projects: number
      }>) => {
        const client = await getAuthenticatedClient()
        const { data, error } = await client
          .from('users')
          .update(updates)
          .eq('email', user?.primaryEmailAddress?.emailAddress)
          .select()
          .single()

        if (error) throw error
        return data
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['user-profile'] })
      },
    })
  }

  return {
    useUserProfile,
    useUpsertUserProfile,
    useUpdateUserProfile,
  }
}

// Project Management Service
export const useProjectService = () => {
  const { getAuthenticatedClient } = useSupabase()
  const queryClient = useQueryClient()

  // Get user's projects (owned and collaborated)
  const useUserProjects = () => {
    return useQuery({
      queryKey: ['user-projects'],
      queryFn: async () => {
        const client = await getAuthenticatedClient()
        
        // Get owned projects
        const { data: ownedProjects, error: ownedError } = await client
          .from('projects')
          .select(`
            *,
            clients:client_id(*)
          `)
          .order('created_at', { ascending: false })

        if (ownedError) throw ownedError

        // Get collaborated projects
        const { data: collaboratedProjects, error: collabError } = await client
          .from('project_team_members')
          .select(`
            *,
            projects:project_id(*,
              clients:client_id(*)
            )
          `)
          .eq('is_active', true)

        if (collabError) throw collabError

        return {
          owned: ownedProjects || [],
          collaborated: collaboratedProjects?.map(ptm => ptm.projects).filter(Boolean) || [],
        }
      },
    })
  }

  // Get single project with details
  const useProject = (projectId: number) => {
    return useQuery({
      queryKey: ['project', projectId],
      queryFn: async () => {
        const client = await getAuthenticatedClient()
        const { data, error } = await client
          .from('projects')
          .select(`
            *,
            clients:client_id(*),
            milestones(*),
            documents(*),
            project_tasks(*),
            project_comments(*,
              author:author_id(name, avatar)
            ),
            project_team_members(*,
              users:user_id(name, email, avatar, specialization)
            )
          `)
          .eq('id', projectId)
          .single()

        if (error) throw error
        return data
      },
      enabled: !!projectId,
    })
  }

  // Create new project
  const useCreateProject = () => {
    return useMutation({
      mutationFn: async (projectData: {
        title: string
        description?: string
        client_id: number
        budget: number
        priority?: string
        tags?: string[]
      }) => {
        const client = await getAuthenticatedClient()
        const { data, error } = await client
          .from('projects')
          .insert([{
            ...projectData,
            owner_id: 1, // This should be dynamically set based on current user
            created_by: 1, // This should be dynamically set based on current user
          }])
          .select()
          .single()

        if (error) throw error
        return data
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['user-projects'] })
      },
    })
  }

  // Update project
  const useUpdateProject = () => {
    return useMutation({
      mutationFn: async ({ projectId, updates }: {
        projectId: number
        updates: Partial<{
          title: string
          description: string
          status: string
          progress: number
          budget: number
          budget_used: number
          end_date: string
          priority: string
          tags: string[]
        }>
      }) => {
        const client = await getAuthenticatedClient()
        const { data, error } = await client
          .from('projects')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', projectId)
          .select()
          .single()

        if (error) throw error
        return data
      },
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ['project', variables.projectId] })
        queryClient.invalidateQueries({ queryKey: ['user-projects'] })
      },
    })
  }

  return {
    useUserProjects,
    useProject,
    useCreateProject,
    useUpdateProject,
  }
}

// Client Management Service
export const useClientService = () => {
  const { getAuthenticatedClient } = useSupabase()
  const queryClient = useQueryClient()

  // Get user's clients
  const useUserClients = () => {
    return useQuery({
      queryKey: ['user-clients'],
      queryFn: async () => {
        const client = await getAuthenticatedClient()
        const { data, error } = await client
          .from('clients')
          .select('*')
          .order('joined_at', { ascending: false })

        if (error) throw error
        return data || []
      },
    })
  }

  // Create new client
  const useCreateClient = () => {
    return useMutation({
      mutationFn: async (clientData: {
        name: string
        email: string
        avatar?: string
        notes?: string
      }) => {
        const client = await getAuthenticatedClient()
        const { data, error } = await client
          .from('clients')
          .insert([{
            ...clientData,
            created_by: 1, // This should be dynamically set based on current user
          }])
          .select()
          .single()

        if (error) throw error
        return data
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['user-clients'] })
      },
    })
  }

  // Update client
  const useUpdateClient = () => {
    return useMutation({
      mutationFn: async ({ clientId, updates }: {
        clientId: number
        updates: Partial<{
          name: string
          email: string
          avatar: string
          notes: string
        }>
      }) => {
        const client = await getAuthenticatedClient()
        const { data, error } = await client
          .from('clients')
          .update(updates)
          .eq('id', clientId)
          .select()
          .single()

        if (error) throw error
        return data
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['user-clients'] })
      },
    })
  }

  return {
    useUserClients,
    useCreateClient,
    useUpdateClient,
  }
}

// Collaboration Service
export const useCollaborationService = () => {
  const { getAuthenticatedClient } = useSupabase()
  const queryClient = useQueryClient()

  // Get user's collaborations
  const useUserCollaborations = () => {
    return useQuery({
      queryKey: ['user-collaborations'],
      queryFn: async () => {
        const client = await getAuthenticatedClient()
        const { data, error } = await client
          .from('user_collaborations')
          .select(`
            *,
            collaborator:collaborator_id(name, email, avatar, specialization)
          `)
          .eq('status', 'active')

        if (error) throw error
        return data || []
      },
    })
  }

  // Send invitation to collaborate
  const useInviteCollaborator = () => {
    return useMutation({
      mutationFn: async (invitationData: {
        email: string
        name: string
        role: 'team_member' | 'client'
        specialization?: string
        project_id?: number
      }) => {
        const client = await getAuthenticatedClient()
        
        // Generate invitation token
        const token = crypto.randomUUID()
        const expiresAt = new Date()
        expiresAt.setHours(expiresAt.getHours() + 48) // 48 hours from now

        const { data, error } = await client
          .from('user_invitations')
          .insert([{
            ...invitationData,
            invited_by: 1, // This should be dynamically set based on current user
            token,
            expires_at: expiresAt.toISOString(),
          }])
          .select()
          .single()

        if (error) throw error
        return data
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['user-invitations'] })
      },
    })
  }

  // Get pending invitations
  const useUserInvitations = () => {
    return useQuery({
      queryKey: ['user-invitations'],
      queryFn: async () => {
        const client = await getAuthenticatedClient()
        const { data, error } = await client
          .from('user_invitations')
          .select('*')
          .is('accepted_at', null)
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false })

        if (error) throw error
        return data || []
      },
    })
  }

  return {
    useUserCollaborations,
    useInviteCollaborator,
    useUserInvitations,
  }
}