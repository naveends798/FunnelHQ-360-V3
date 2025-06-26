import { createContext, useContext, useEffect, useState } from 'react'
import { useAuth as useClerkAuthHook, useOrganization, useUser } from '@clerk/clerk-react'
import type { UserRole, Permission } from './useAuth'
import { rolePermissions } from '@/lib/permissions'

interface ClerkAuthContextType {
  user: any | null
  authUser: any | null
  session: any | null
  loading: boolean
  currentRole: UserRole | null
  permissions: Permission[]
  signIn: (email: string, password: string) => Promise<any>
  signUp: (email: string, password: string, metadata?: any) => Promise<any>
  signOut: () => Promise<any>
  signInWithGoogle: () => Promise<any>
  switchRole: (role: UserRole) => void
  hasPermission: (resource: string, action: string) => boolean
  canPerformAction: (action: 'create_project' | 'invite_member' | 'upload_file', resourceSize?: number) => Promise<{ allowed: boolean; reason?: string }>
  isAdmin: boolean
  isTeamMember: boolean
  isClient: boolean
  updateUserRole: (role: UserRole) => Promise<void>
  updateOrganizationPlan: (plan: string, trialEndsAt?: string) => Promise<void>
}

const ClerkAuthContext = createContext<ClerkAuthContextType | undefined>(undefined)

export const ClerkAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { isLoaded: clerkLoaded, userId, signOut: clerkSignOut } = useClerkAuthHook()
  const { user: clerkUser, isLoaded: userLoaded } = useUser()
  const { organization, membership, isLoaded: orgLoaded } = useOrganization()
  
  const [currentRole, setCurrentRole] = useState<UserRole | null>(null)
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)

  // Load role from organization membership or user metadata
  useEffect(() => {
    if (!clerkLoaded || !userLoaded || !orgLoaded) {
      setLoading(true)
      return
    }

    // Get role from organization membership first
    let role: UserRole | null = null
    
    if (membership) {
      // Map Clerk organization roles to app roles
      switch (membership.role) {
        case 'admin':
          role = 'admin'
          break
        case 'member':
        case 'team_member':
          role = 'team_member'
          break
        case 'client':
          role = 'client'
          break
        default:
          role = 'team_member' // Default role
      }
    } else if (clerkUser) {
      // Fallback to user metadata if not in an organization
      role = (clerkUser.publicMetadata?.role as UserRole) || 'admin'
    }

    setCurrentRole(role)
    
    // Set permissions based on role
    if (role && rolePermissions[role]) {
      setPermissions(rolePermissions[role])
    }

    setLoading(false)
  }, [clerkLoaded, userLoaded, orgLoaded, membership, clerkUser])

  // Update user role in metadata
  const updateUserRole = async (role: UserRole) => {
    if (!clerkUser) return

    try {
      await clerkUser.update({
        publicMetadata: {
          ...clerkUser.publicMetadata,
          role
        }
      })
      setCurrentRole(role)
      setPermissions(rolePermissions[role] || [])
    } catch (error) {
      console.error('Error updating user role:', error)
      throw error
    }
  }

  // Update organization plan metadata
  const updateOrganizationPlan = async (plan: string, trialEndsAt?: string) => {
    if (!organization) return

    try {
      await organization.update({
        publicMetadata: {
          ...organization.publicMetadata,
          plan,
          ...(trialEndsAt && { trialEndsAt })
        }
      })
    } catch (error) {
      console.error('Error updating organization plan:', error)
      throw error
    }
  }

  const hasPermission = (resource: string, action: string): boolean => {
    return permissions.some(p => 
      p.resource === resource && p.actions.includes(action)
    )
  }

  const canPerformAction = async (
    action: 'create_project' | 'invite_member' | 'upload_file', 
    resourceSize?: number
  ): Promise<{ allowed: boolean; reason?: string }> => {
    // Get current plan from organization metadata
    const plan = organization?.publicMetadata?.plan || 'pro_trial'
    
    // Check plan limits based on action
    switch (action) {
      case 'create_project':
        if (plan === 'solo') {
          // Check project count limit for Solo plan (3 projects)
          // This would need to query the actual project count
          return { allowed: true } // Simplified for now
        }
        return { allowed: true }
        
      case 'invite_member':
        if (plan === 'solo') {
          return { allowed: false, reason: 'Solo plan does not allow team members' }
        }
        return { allowed: true }
        
      case 'upload_file':
        // Check storage limits based on plan
        // This would need to check actual storage usage
        return { allowed: true }
        
      default:
        return { allowed: true }
    }
  }

  const value: ClerkAuthContextType = {
    user: clerkUser,
    authUser: clerkUser ? {
      id: clerkUser.id,
      email: clerkUser.emailAddresses?.[0]?.emailAddress,
      role: currentRole,
      permissions,
      currentRole,
    } : null,
    session: userId ? { userId } : null,
    loading,
    currentRole,
    permissions,
    signIn: async () => { throw new Error('Use Clerk SignIn component') },
    signUp: async () => { throw new Error('Use Clerk SignUp component') },
    signOut: clerkSignOut,
    signInWithGoogle: async () => { throw new Error('Use Clerk SignIn component') },
    switchRole: setCurrentRole, // For testing purposes
    hasPermission,
    canPerformAction,
    isAdmin: currentRole === 'admin',
    isTeamMember: currentRole === 'team_member',
    isClient: currentRole === 'client',
    updateUserRole,
    updateOrganizationPlan,
  }

  return (
    <ClerkAuthContext.Provider value={value}>
      {children}
    </ClerkAuthContext.Provider>
  )
}

export const useClerkAuth = () => {
  const context = useContext(ClerkAuthContext)
  if (context === undefined) {
    throw new Error('useClerkAuth must be used within a ClerkAuthProvider')
  }
  return context
}