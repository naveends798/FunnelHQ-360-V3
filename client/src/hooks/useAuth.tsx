import { createContext, useContext, useEffect, useState } from 'react'
import { useAuth as useClerkAuthHook, useUser } from '@clerk/clerk-react'
import type { UserWithCollaborations, UserWithBilling } from '@shared/schema'
import { ROLE_PERMISSIONS, groupPermissionsByResource } from '@/lib/permissions'

export type UserRole = 'admin' | 'team_member' | 'client'

export interface Permission {
  resource: string
  actions: string[]
}

export interface AuthUser extends UserWithCollaborations {
  currentRole?: UserRole
  permissions?: Permission[]
}

export interface User {
  id: string
  email?: string
  user_metadata?: {
    full_name?: string
    company_name?: string
  }
}

export type Session = null

interface AuthContextType {
  user: User | null
  authUser: AuthUser | null
  session: Session | null
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { isLoaded: clerkLoaded, userId, signOut: clerkSignOut } = useClerkAuthHook()
  const { user: clerkUser, isLoaded: userLoaded } = useUser()
  
  // Force real Clerk authentication - no mock auth in development
  const useMockAuth = false // Disabled to force real Clerk authentication
  const testRole = (localStorage.getItem('test_role') as UserRole) || 'admin'
  const testUserName = localStorage.getItem('test_user_name') || `Demo ${testRole.charAt(0).toUpperCase() + testRole.slice(1)}`
  
  // Debug logging for auth state
  console.log('🔐 Auth state:', { 
    clerkLoaded, 
    userId: userId ? `${userId.substring(0, 8)}...` : null, 
    useMockAuth,
    nodeEnv: process.env.NODE_ENV 
  });
  
  const [permissions, setPermissions] = useState<Permission[]>([])
  
  // Determine current role from Clerk or fallback to test role
  const determinedRole = useMockAuth ? testRole : (
    (clerkUser?.publicMetadata?.role as UserRole) || 'admin'
  )
  
  const [currentRole, setCurrentRole] = useState<UserRole>(determinedRole)
  
  const mockUser: User = {
    id: "demo-user",
    email: `${testRole}@funnelportals.com`,
    user_metadata: {
      full_name: testUserName,
      company_name: "Funnel Portals Agency"
    }
  }
  
  const mockAuthUser: AuthUser = {
    id: 1,
    supabaseId: "demo-user",
    username: `demo-${testRole}`,
    email: `${testRole}@funnelportals.com`,
    name: testUserName,
    avatar: null,
    companyName: "Funnel Portals Agency",
    companyRole: "founder",
    industry: "marketing",
    companySize: "2-10",
    subscriptionPlan: "pro",
    subscriptionStatus: "active",
    maxProjects: -1,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    createdAt: new Date(),
    lastLoginAt: new Date(),
    isActive: true,
    collaborations: [],
    invitations: [],
    currentRole: testRole
  }
  
  const [supabaseUserData, setSupabaseUserData] = useState<any>(null);
  
  // Fetch user data from Supabase when we have an email
  useEffect(() => {
    if (clerkUser?.emailAddresses?.[0]?.emailAddress) {
      const email = clerkUser.emailAddresses[0].emailAddress;
      fetch(`/api/supabase/users/${encodeURIComponent(email)}`)
        .then(res => res.json())
        .then(data => {
          if (data.user) {
            setSupabaseUserData(data.user);
            console.log('📊 Loaded Supabase user data:', data.user);
          }
        })
        .catch(err => console.error('Failed to load user data from Supabase:', err));
    }
  }, [clerkUser?.emailAddresses?.[0]?.emailAddress]);

  // Use real Clerk user when available
  const realUser: User | null = useMockAuth ? mockUser : (clerkUser ? {
    id: clerkUser.id,
    email: clerkUser.emailAddresses?.[0]?.emailAddress,
    user_metadata: {
      full_name: clerkUser.fullName || '',
      company_name: clerkUser.publicMetadata?.companyName as string || ''
    }
  } : null)

  const realAuthUser: AuthUser | null = useMockAuth ? mockAuthUser : (clerkUser ? {
    id: supabaseUserData?.id || 2, // Use Supabase ID if available
    supabaseId: clerkUser.id,
    username: clerkUser.username || '',
    email: clerkUser.emailAddresses?.[0]?.emailAddress || '',
    name: clerkUser.fullName || '',
    avatar: clerkUser.imageUrl || null,
    companyName: supabaseUserData?.company_name || clerkUser.publicMetadata?.companyName as string || null,
    companyRole: supabaseUserData?.company_role || clerkUser.publicMetadata?.companyRole as string || null,
    industry: supabaseUserData?.industry || clerkUser.publicMetadata?.industry as string || null,
    companySize: supabaseUserData?.company_size || clerkUser.publicMetadata?.companySize as string || null,
    specialization: supabaseUserData?.specialization || null,
    subscriptionPlan: supabaseUserData?.subscription_plan || clerkUser.publicMetadata?.subscriptionPlan as string || 'pro_trial',
    subscriptionStatus: supabaseUserData?.subscription_status || clerkUser.publicMetadata?.subscriptionStatus as string || 'active',
    maxProjects: supabaseUserData?.max_projects ?? (clerkUser.publicMetadata?.maxProjects as number || -1),
    stripeCustomerId: supabaseUserData?.stripe_customer_id || clerkUser.publicMetadata?.stripeCustomerId as string || null,
    stripeSubscriptionId: supabaseUserData?.stripe_subscription_id || clerkUser.publicMetadata?.stripeSubscriptionId as string || null,
    trialStartDate: supabaseUserData?.trial_start_date ? new Date(supabaseUserData.trial_start_date) : (clerkUser.publicMetadata?.trialStartDate ? new Date(clerkUser.publicMetadata.trialStartDate as string) : new Date(clerkUser.createdAt || Date.now())),
    createdAt: supabaseUserData?.created_at ? new Date(supabaseUserData.created_at) : new Date(clerkUser.createdAt || Date.now()),
    lastLoginAt: new Date(),
    isActive: true,
    collaborations: [],
    invitations: [],
    currentRole: (clerkUser.publicMetadata?.role as UserRole) || 'admin'
  } : null)

  const [user, setUser] = useState<User | null>(realUser)
  const [authUser, setAuthUser] = useState<AuthUser | null>(realAuthUser)
  const [session] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  // Update user state when Clerk data changes
  useEffect(() => {
    console.log('🔍 Auth state:', { clerkLoaded, userLoaded, userId, useMockAuth, supabaseUserData })
    if (clerkLoaded) {
      setUser(realUser)
      setAuthUser(realAuthUser)
      setLoading(false)
      console.log('✅ Auth loaded:', { user: realUser, authUser: realAuthUser })
    }
  }, [clerkLoaded, userLoaded, realUser, realAuthUser, supabaseUserData])

  const signIn = async (email: string, password: string) => {
    return { data: null, error: null }
  }

  const signUp = async (email: string, password: string, metadata: any = {}) => {
    return { data: null, error: null }
  }

  const signOut = async () => {
    if (!useMockAuth && clerkSignOut) {
      return clerkSignOut()
    }
    return { error: null }
  }

  const signInWithGoogle = async () => {
    return { data: null, error: null }
  }

  // Switch between available roles (for demo/testing purposes)
  const switchRole = (role: UserRole) => {
    setCurrentRole(role)
    // Update permissions based on new role
    updatePermissions(role)
    // Store in localStorage for demo mode
    localStorage.setItem('test_role', role)
  }

  // Update permissions based on current role
  const updatePermissions = (role: UserRole) => {
    if (!role || !ROLE_PERMISSIONS[role]) {
      setPermissions([])
      return
    }

    // Convert string array to Permission objects
    const rolePermissions = ROLE_PERMISSIONS[role]
    const groupedPermissions = groupPermissionsByResource(rolePermissions)
    const permissionObjects: Permission[] = Object.entries(groupedPermissions).map(([resource, actions]) => ({
      resource,
      actions
    }))

    setPermissions(permissionObjects)
  }

  // Check if user has specific permission
  const hasPermission = (resource: string, action: string): boolean => {
    if (!currentRole) return false
    
    const resourcePermissions = permissions.find(p => p.resource === resource)
    return resourcePermissions?.actions.includes(action) || false
  }

  // Check if user can perform action based on billing limits
  const canPerformAction = async (action: 'create_project' | 'invite_member' | 'upload_file', resourceSize?: number): Promise<{ allowed: boolean; reason?: string }> => {
    try {
      if (!authUser?.id) {
        return { allowed: false, reason: "No user found" };
      }

      const response = await fetch(`/api/users/${authUser.id}/billing`);
      if (!response.ok) {
        return { allowed: false, reason: "Unable to check limits" };
      }
      
      const userBilling: UserWithBilling = await response.json();
      const plan = userBilling.currentPlan;
      const usage = userBilling.usage;

      switch (action) {
        case 'create_project':
          if (plan.limits.projects === -1) return { allowed: true };
          if (usage.projects >= plan.limits.projects) {
            return { allowed: false, reason: `Project limit reached (${plan.limits.projects}). Upgrade to Pro for unlimited projects.` };
          }
          return { allowed: true };

        case 'invite_member':
          if (plan.limits.collaborators === -1) return { allowed: true };
          if (usage.collaborators >= plan.limits.collaborators) {
            return { allowed: false, reason: `Collaborator limit reached (${plan.limits.collaborators}). Upgrade to Pro for more collaborators.` };
          }
          return { allowed: true };

        case 'upload_file':
          if (plan.limits.storage === -1) return { allowed: true };
          const newStorageUsage = usage.storage + (resourceSize || 0);
          if (newStorageUsage > plan.limits.storage) {
            return { allowed: false, reason: `Storage limit would be exceeded. Upgrade to Pro for more storage.` };
          }
          return { allowed: true };

        default:
          return { allowed: true };
      }
    } catch (error) {
      console.error('Error checking action limits:', error);
      return { allowed: true };
    }
  }

  // Update role and permissions when Clerk data changes
  useEffect(() => {
    if (clerkLoaded && userLoaded) {
      const newRole = determinedRole
      setCurrentRole(newRole)
      if (newRole) {
        updatePermissions(newRole)
      }
    }
  }, [clerkLoaded, userLoaded, determinedRole])

  // Update permissions when role changes
  useEffect(() => {
    if (currentRole) {
      updatePermissions(currentRole)
    }
  }, [currentRole])

  // Role helper properties
  const isAdmin = currentRole === 'admin'
  const isTeamMember = currentRole === 'team_member'
  const isClient = currentRole === 'client'

  const value = {
    user,
    authUser,
    session,
    loading,
    currentRole,
    permissions,
    signIn,
    signUp,
    signOut,
    signInWithGoogle,
    switchRole,
    hasPermission,
    canPerformAction,
    isAdmin,
    isTeamMember,
    isClient,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}