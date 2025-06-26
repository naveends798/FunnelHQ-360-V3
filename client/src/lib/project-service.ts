import { useSupabaseContext } from '@/contexts/supabase-context'
import { useAuth } from '@clerk/clerk-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// Project Management Service
export const useProjectService = () => {
  const { supabase } = useSupabaseContext()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  // Get user's projects (owned and collaborated)
  const useUserProjects = () => {
    return useQuery({
      queryKey: ['user-projects', user?.id],
      queryFn: async () => {
        if (!supabase || !user?.primaryEmailAddress?.emailAddress) {
          throw new Error('Not authenticated')
        }

        // Get user ID first
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('email', user.primaryEmailAddress.emailAddress)
          .single()

        if (userError) throw userError

        // Get owned projects
        const { data: ownedProjects, error: ownedError } = await supabase
          .from('projects')
          .select(`
            *,
            clients:client_id(*),
            project_team_members!inner(
              user_id,
              role,
              users:user_id(name, email, avatar)
            )
          `)
          .eq('owner_id', userData.id)
          .order('created_at', { ascending: false })

        if (ownedError) throw ownedError

        // Get collaborated projects
        const { data: collaboratedProjects, error: collabError } = await supabase
          .from('project_team_members')
          .select(`
            role,
            projects:project_id(*,
              clients:client_id(*),
              project_team_members(
                user_id,
                role,
                users:user_id(name, email, avatar)
              )
            )
          `)
          .eq('user_id', userData.id)
          .eq('is_active', true)

        if (collabError) throw collabError

        return {
          owned: ownedProjects || [],
          collaborated: collaboratedProjects?.map(ptm => ({
            ...ptm.projects,
            userRole: ptm.role
          })).filter(Boolean) || [],
        }
      },
      enabled: !!supabase && !!user?.primaryEmailAddress?.emailAddress,
    })
  }

  // Get single project with details
  const useProject = (projectId: number) => {
    return useQuery({
      queryKey: ['project', projectId],
      queryFn: async () => {
        if (!supabase) throw new Error('Not authenticated')

        const { data, error } = await supabase
          .from('projects')
          .select(`
            *,
            clients:client_id(*),
            milestones(*),
            documents(*),
            project_tasks(*,
              assigned_user:assigned_to(name, email, avatar)
            ),
            project_comments(*,
              author:author_id(name, avatar),
              replies:project_comments!parent_id(
                *,
                author:author_id(name, avatar)
              )
            ),
            project_team_members(*,
              users:user_id(name, email, avatar, specialization)
            ),
            assets:assets!project_id(*),
            project_designs(*)
          `)
          .eq('id', projectId)
          .single()

        if (error) throw error
        return data
      },
      enabled: !!projectId && !!supabase,
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
        if (!supabase || !user?.primaryEmailAddress?.emailAddress) {
          throw new Error('Not authenticated')
        }

        // Get current user ID
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('email', user.primaryEmailAddress.emailAddress)
          .single()

        if (userError) throw userError

        const { data, error } = await supabase
          .from('projects')
          .insert([{
            ...projectData,
            owner_id: userData.id,
            created_by: userData.id,
          }])
          .select(`
            *,
            clients:client_id(*)
          `)
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
        if (!supabase) throw new Error('Not authenticated')

        const { data, error } = await supabase
          .from('projects')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', projectId)
          .select(`
            *,
            clients:client_id(*)
          `)
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

  // Delete project
  const useDeleteProject = () => {
    return useMutation({
      mutationFn: async (projectId: number) => {
        if (!supabase) throw new Error('Not authenticated')

        const { error } = await supabase
          .from('projects')
          .delete()
          .eq('id', projectId)

        if (error) throw error
        return true
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['user-projects'] })
      },
    })
  }

  return {
    useUserProjects,
    useProject,
    useCreateProject,
    useUpdateProject,
    useDeleteProject,
  }
}

// Client Management Service
export const useClientService = () => {
  const { supabase } = useSupabaseContext()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  // Get user's clients
  const useUserClients = () => {
    return useQuery({
      queryKey: ['user-clients', user?.id],
      queryFn: async () => {
        if (!supabase || !user?.primaryEmailAddress?.emailAddress) {
          throw new Error('Not authenticated')
        }

        // Get current user ID
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('email', user.primaryEmailAddress.emailAddress)
          .single()

        if (userError) throw userError

        const { data, error } = await supabase
          .from('clients')
          .select(`
            *,
            projects:projects!client_id(
              id,
              title,
              status,
              progress,
              created_at
            )
          `)
          .eq('created_by', userData.id)
          .order('joined_at', { ascending: false })

        if (error) throw error
        return data || []
      },
      enabled: !!supabase && !!user?.primaryEmailAddress?.emailAddress,
    })
  }

  // Get single client with projects
  const useClient = (clientId: number) => {
    return useQuery({
      queryKey: ['client', clientId],
      queryFn: async () => {
        if (!supabase) throw new Error('Not authenticated')

        const { data, error } = await supabase
          .from('clients')
          .select(`
            *,
            projects:projects!client_id(
              *,
              project_team_members(
                user_id,
                role,
                users:user_id(name, email, avatar)
              )
            )
          `)
          .eq('id', clientId)
          .single()

        if (error) throw error
        return data
      },
      enabled: !!clientId && !!supabase,
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
        if (!supabase || !user?.primaryEmailAddress?.emailAddress) {
          throw new Error('Not authenticated')
        }

        // Get current user ID
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('email', user.primaryEmailAddress.emailAddress)
          .single()

        if (userError) throw userError

        const { data, error } = await supabase
          .from('clients')
          .insert([{
            ...clientData,
            created_by: userData.id,
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
        if (!supabase) throw new Error('Not authenticated')

        const { data, error } = await supabase
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

  // Delete client
  const useDeleteClient = () => {
    return useMutation({
      mutationFn: async (clientId: number) => {
        if (!supabase) throw new Error('Not authenticated')

        const { error } = await supabase
          .from('clients')
          .delete()
          .eq('id', clientId)

        if (error) throw error
        return true
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['user-clients'] })
      },
    })
  }

  return {
    useUserClients,
    useClient,
    useCreateClient,
    useUpdateClient,
    useDeleteClient,
  }
}

// Collaboration Service
export const useCollaborationService = () => {
  const { supabase } = useSupabaseContext()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  // Get user's collaborations
  const useUserCollaborations = () => {
    return useQuery({
      queryKey: ['user-collaborations', user?.id],
      queryFn: async () => {
        if (!supabase || !user?.primaryEmailAddress?.emailAddress) {
          throw new Error('Not authenticated')
        }

        // Get current user ID
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('email', user.primaryEmailAddress.emailAddress)
          .single()

        if (userError) throw userError

        const { data, error } = await supabase
          .from('user_collaborations')
          .select(`
            *,
            collaborator:collaborator_id(
              id,
              name,
              email,
              avatar,
              specialization,
              company_name
            )
          `)
          .eq('user_id', userData.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false })

        if (error) throw error
        return data || []
      },
      enabled: !!supabase && !!user?.primaryEmailAddress?.emailAddress,
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
        if (!supabase || !user?.primaryEmailAddress?.emailAddress) {
          throw new Error('Not authenticated')
        }

        // Get current user ID
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('email', user.primaryEmailAddress.emailAddress)
          .single()

        if (userError) throw userError

        // Generate invitation token
        const token = crypto.randomUUID()
        const expiresAt = new Date()
        expiresAt.setHours(expiresAt.getHours() + 48) // 48 hours from now

        const { data, error } = await supabase
          .from('user_invitations')
          .insert([{
            ...invitationData,
            invited_by: userData.id,
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
      queryKey: ['user-invitations', user?.id],
      queryFn: async () => {
        if (!supabase || !user?.primaryEmailAddress?.emailAddress) {
          throw new Error('Not authenticated')
        }

        // Get current user ID
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('email', user.primaryEmailAddress.emailAddress)
          .single()

        if (userError) throw userError

        const { data, error } = await supabase
          .from('user_invitations')
          .select(`
            *,
            project:project_id(title, description)
          `)
          .eq('invited_by', userData.id)
          .is('accepted_at', null)
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false })

        if (error) throw error
        return data || []
      },
      enabled: !!supabase && !!user?.primaryEmailAddress?.emailAddress,
    })
  }

  // Cancel invitation
  const useCancelInvitation = () => {
    return useMutation({
      mutationFn: async (invitationId: number) => {
        if (!supabase) throw new Error('Not authenticated')

        const { error } = await supabase
          .from('user_invitations')
          .delete()
          .eq('id', invitationId)

        if (error) throw error
        return true
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['user-invitations'] })
      },
    })
  }

  // Remove collaborator
  const useRemoveCollaborator = () => {
    return useMutation({
      mutationFn: async (collaborationId: number) => {
        if (!supabase) throw new Error('Not authenticated')

        const { error } = await supabase
          .from('user_collaborations')
          .update({ status: 'removed' })
          .eq('id', collaborationId)

        if (error) throw error
        return true
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['user-collaborations'] })
      },
    })
  }

  return {
    useUserCollaborations,
    useInviteCollaborator,
    useUserInvitations,
    useCancelInvitation,
    useRemoveCollaborator,
  }
}

// Project Team Management Service
export const useProjectTeamService = () => {
  const { supabase } = useSupabaseContext()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  // Get project team members
  const useProjectTeamMembers = (projectId: number) => {
    return useQuery({
      queryKey: ['project-team-members', projectId],
      queryFn: async () => {
        if (!supabase) throw new Error('Not authenticated')

        const { data, error } = await supabase
          .from('project_team_members')
          .select(`
            *,
            users:user_id(
              id,
              name,
              email,
              avatar,
              specialization,
              company_name
            ),
            assigned_by_user:assigned_by(name, email)
          `)
          .eq('project_id', projectId)
          .eq('is_active', true)
          .order('assigned_at', { ascending: false })

        if (error) throw error
        return data || []
      },
      enabled: !!projectId && !!supabase,
    })
  }

  // Add team member to project
  const useAddTeamMember = () => {
    return useMutation({
      mutationFn: async (memberData: {
        project_id: number
        user_id: number
        role: string
        permissions?: string[]
      }) => {
        if (!supabase || !user?.primaryEmailAddress?.emailAddress) {
          throw new Error('Not authenticated')
        }

        // Get current user ID
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('email', user.primaryEmailAddress.emailAddress)
          .single()

        if (userError) throw userError

        const { data, error } = await supabase
          .from('project_team_members')
          .insert([{
            ...memberData,
            assigned_by: userData.id,
            permissions: memberData.permissions || [],
          }])
          .select(`
            *,
            users:user_id(name, email, avatar)
          `)
          .single()

        if (error) throw error
        return data
      },
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ['project-team-members', variables.project_id] })
        queryClient.invalidateQueries({ queryKey: ['project', variables.project_id] })
      },
    })
  }

  // Update team member role/permissions
  const useUpdateTeamMember = () => {
    return useMutation({
      mutationFn: async ({ memberId, updates }: {
        memberId: number
        updates: Partial<{
          role: string
          permissions: string[]
          is_active: boolean
        }>
      }) => {
        if (!supabase) throw new Error('Not authenticated')

        const { data, error } = await supabase
          .from('project_team_members')
          .update(updates)
          .eq('id', memberId)
          .select(`
            *,
            users:user_id(name, email, avatar)
          `)
          .single()

        if (error) throw error
        return data
      },
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: ['project-team-members', data.project_id] })
        queryClient.invalidateQueries({ queryKey: ['project', data.project_id] })
      },
    })
  }

  // Remove team member from project
  const useRemoveTeamMember = () => {
    return useMutation({
      mutationFn: async (memberId: number) => {
        if (!supabase) throw new Error('Not authenticated')

        // Get the member data first to know which project to invalidate
        const { data: memberData } = await supabase
          .from('project_team_members')
          .select('project_id')
          .eq('id', memberId)
          .single()

        const { error } = await supabase
          .from('project_team_members')
          .update({ is_active: false })
          .eq('id', memberId)

        if (error) throw error

        return memberData?.project_id
      },
      onSuccess: (projectId) => {
        if (projectId) {
          queryClient.invalidateQueries({ queryKey: ['project-team-members', projectId] })
          queryClient.invalidateQueries({ queryKey: ['project', projectId] })
        }
      },
    })
  }

  return {
    useProjectTeamMembers,
    useAddTeamMember,
    useUpdateTeamMember,
    useRemoveTeamMember,
  }
}