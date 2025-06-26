import type { UserRole, Permission } from '@/hooks/useAuth'

// Define all possible permissions
export const PERMISSIONS = {
  // Users and Team Management
  USERS: {
    VIEW: 'users:view',
    CREATE: 'users:create',
    UPDATE: 'users:update',
    DELETE: 'users:delete',
    INVITE: 'users:invite',
    MANAGE_ROLES: 'users:manage_roles',
  },
  
  // Organization Management
  ORGANIZATION: {
    VIEW: 'organization:view',
    UPDATE: 'organization:update',
    DELETE: 'organization:delete',
    MANAGE_SETTINGS: 'organization:manage_settings',
    MANAGE_BILLING: 'organization:manage_billing',
  },
  
  // Projects
  PROJECTS: {
    VIEW_ALL: 'projects:view_all',
    VIEW_ASSIGNED: 'projects:view_assigned',
    CREATE: 'projects:create',
    UPDATE: 'projects:update',
    DELETE: 'projects:delete',
    MANAGE_TASKS: 'projects:manage_tasks',
    MANAGE_MILESTONES: 'projects:manage_milestones',
    MANAGE_TEAM: 'projects:manage_team',
    ASSIGN_MEMBERS: 'projects:assign_members',
    REMOVE_MEMBERS: 'projects:remove_members',
  },
  
  // Clients
  CLIENTS: {
    VIEW_ALL: 'clients:view_all',
    VIEW_ASSIGNED: 'clients:view_assigned',
    CREATE: 'clients:create',
    UPDATE: 'clients:update',
    DELETE: 'clients:delete',
    MANAGE_ACCESS: 'clients:manage_access',
  },
  
  // Documents and Assets
  DOCUMENTS: {
    VIEW: 'documents:view',
    UPLOAD: 'documents:upload',
    DELETE: 'documents:delete',
    MANAGE: 'documents:manage',
  },
  
  // Analytics and Reports
  ANALYTICS: {
    VIEW_BASIC: 'analytics:view_basic',
    VIEW_ADVANCED: 'analytics:view_advanced',
    EXPORT: 'analytics:export',
  },
  
  // Support
  SUPPORT: {
    VIEW_TICKETS: 'support:view_tickets',
    CREATE_TICKETS: 'support:create_tickets',
    MANAGE_TICKETS: 'support:manage_tickets',
  },
  
  // Billing and Subscriptions
  BILLING: {
    VIEW: 'billing:view',
    MANAGE: 'billing:manage',
  },
} as const

// Role-based permission mapping
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  admin: [
    // Full access to everything
    PERMISSIONS.USERS.VIEW,
    PERMISSIONS.USERS.CREATE,
    PERMISSIONS.USERS.UPDATE,
    PERMISSIONS.USERS.DELETE,
    PERMISSIONS.USERS.INVITE,
    PERMISSIONS.USERS.MANAGE_ROLES,
    
    PERMISSIONS.ORGANIZATION.VIEW,
    PERMISSIONS.ORGANIZATION.UPDATE,
    PERMISSIONS.ORGANIZATION.DELETE,
    PERMISSIONS.ORGANIZATION.MANAGE_SETTINGS,
    PERMISSIONS.ORGANIZATION.MANAGE_BILLING,
    
    PERMISSIONS.PROJECTS.VIEW_ALL,
    PERMISSIONS.PROJECTS.CREATE,
    PERMISSIONS.PROJECTS.UPDATE,
    PERMISSIONS.PROJECTS.DELETE,
    PERMISSIONS.PROJECTS.MANAGE_TASKS,
    PERMISSIONS.PROJECTS.MANAGE_MILESTONES,
    PERMISSIONS.PROJECTS.MANAGE_TEAM,
    PERMISSIONS.PROJECTS.ASSIGN_MEMBERS,
    PERMISSIONS.PROJECTS.REMOVE_MEMBERS,
    
    PERMISSIONS.CLIENTS.VIEW_ALL,
    PERMISSIONS.CLIENTS.CREATE,
    PERMISSIONS.CLIENTS.UPDATE,
    PERMISSIONS.CLIENTS.DELETE,
    PERMISSIONS.CLIENTS.MANAGE_ACCESS,
    
    PERMISSIONS.DOCUMENTS.VIEW,
    PERMISSIONS.DOCUMENTS.UPLOAD,
    PERMISSIONS.DOCUMENTS.DELETE,
    PERMISSIONS.DOCUMENTS.MANAGE,
    
    PERMISSIONS.ANALYTICS.VIEW_BASIC,
    PERMISSIONS.ANALYTICS.VIEW_ADVANCED,
    PERMISSIONS.ANALYTICS.EXPORT,
    
    PERMISSIONS.SUPPORT.VIEW_TICKETS,
    PERMISSIONS.SUPPORT.CREATE_TICKETS,
    PERMISSIONS.SUPPORT.MANAGE_TICKETS,
    
    PERMISSIONS.BILLING.VIEW,
    PERMISSIONS.BILLING.MANAGE,
  ],
  
  team_member: [
    // Restricted access - only assigned projects and admin messaging
    PERMISSIONS.PROJECTS.VIEW_ASSIGNED, // Only assigned projects
    PERMISSIONS.PROJECTS.UPDATE, // Can update projects they're assigned to
    PERMISSIONS.PROJECTS.MANAGE_TASKS,
    PERMISSIONS.PROJECTS.MANAGE_MILESTONES,
    
    // Can upload documents to their assigned projects only
    PERMISSIONS.DOCUMENTS.VIEW,
    PERMISSIONS.DOCUMENTS.UPLOAD,
    
    // Can view billing information
    PERMISSIONS.BILLING.VIEW,
    
    // Can create and view support tickets
    PERMISSIONS.SUPPORT.CREATE_TICKETS,
    PERMISSIONS.SUPPORT.VIEW_TICKETS,
  ],
  
  client: [
    // Very limited access - only their own projects
    PERMISSIONS.PROJECTS.VIEW_ASSIGNED, // Only their projects
    PERMISSIONS.CLIENTS.VIEW_ASSIGNED, // Only their own info
    
    PERMISSIONS.DOCUMENTS.VIEW, // Can view project documents
    PERMISSIONS.DOCUMENTS.UPLOAD, // Can upload documents to their projects
    
    PERMISSIONS.SUPPORT.CREATE_TICKETS, // Can create support tickets
    PERMISSIONS.SUPPORT.VIEW_TICKETS, // Can view their own tickets
    
    PERMISSIONS.BILLING.VIEW, // Can view billing information
  ],
}

// Helper function to get permissions for a role
export function getPermissionsForRole(role: UserRole): string[] {
  return ROLE_PERMISSIONS[role] || []
}

// Helper function to check if a role has a specific permission
export function roleHasPermission(role: UserRole, permission: string): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) || false
}

// Helper function to group permissions by resource
export function groupPermissionsByResource(permissions: string[]): Record<string, string[]> {
  const grouped: Record<string, string[]> = {}
  
  permissions.forEach(permission => {
    const [resource, action] = permission.split(':')
    if (!grouped[resource]) {
      grouped[resource] = []
    }
    grouped[resource].push(action)
  })
  
  return grouped
}

// Navigation access control
export const NAVIGATION_ACCESS: Record<string, string[]> = {
  '/dashboard': [PERMISSIONS.PROJECTS.VIEW_ALL, PERMISSIONS.PROJECTS.VIEW_ASSIGNED], // All users can access dashboard
  '/projects': [PERMISSIONS.PROJECTS.VIEW_ALL, PERMISSIONS.PROJECTS.VIEW_ASSIGNED],
  '/clients': [PERMISSIONS.CLIENTS.VIEW_ALL], // Only admins can access clients
  '/team': [PERMISSIONS.USERS.VIEW], // Only admins can access team management
  '/onboarding': [PERMISSIONS.ORGANIZATION.MANAGE_SETTINGS], // Only admins can access onboarding
  '/assets': [PERMISSIONS.DOCUMENTS.VIEW], // All users can access assets
  '/brand-kit': [PERMISSIONS.DOCUMENTS.VIEW], // All users can access brand kit
  '/billing': [PERMISSIONS.BILLING.VIEW], // All users can view billing
  '/analytics': [PERMISSIONS.ANALYTICS.VIEW_BASIC, PERMISSIONS.ANALYTICS.VIEW_ADVANCED],
  '/support': [PERMISSIONS.SUPPORT.VIEW_TICKETS, PERMISSIONS.SUPPORT.CREATE_TICKETS], // All users can access support
  '/messages': [PERMISSIONS.PROJECTS.VIEW_ALL, PERMISSIONS.PROJECTS.VIEW_ASSIGNED], // Both admins and team members can access messages
  '/settings': [PERMISSIONS.ORGANIZATION.VIEW],
  '/admin': [PERMISSIONS.USERS.MANAGE_ROLES, PERMISSIONS.ORGANIZATION.MANAGE_SETTINGS],
}

// Check if user can access a route
export function canAccessRoute(route: string, userPermissions: string[]): boolean {
  const requiredPermissions = NAVIGATION_ACCESS[route]
  if (!requiredPermissions) return true // No restrictions
  
  return requiredPermissions.some(permission => 
    userPermissions.includes(permission)
  )
}

// Project-specific role permissions
export const PROJECT_ROLE_PERMISSIONS = {
  project_manager: [
    'project:view',
    'project:update',
    'project:manage_tasks',
    'project:manage_milestones',
    'project:assign_members',
    'project:view_analytics',
    'project:manage_comments',
    'project:upload_documents'
  ],
  developer: [
    'project:view',
    'project:manage_tasks',
    'project:upload_documents',
    'project:comment'
  ],
  designer: [
    'project:view',
    'project:manage_tasks',
    'project:upload_documents',
    'project:comment',
    'project:manage_designs'
  ],
  reviewer: [
    'project:view',
    'project:comment',
    'project:review'
  ],
  client: [
    'project:view',
    'project:comment'
  ]
} as const

// Check if user has project-specific permission
export function hasProjectPermission(
  userRole: string,
  projectRole: string,
  permission: string
): boolean {
  // Organization-level permissions (admin can do anything)
  if (userRole === 'admin') return true
  
  // Project-level permissions
  const projectPermissions = PROJECT_ROLE_PERMISSIONS[projectRole as keyof typeof PROJECT_ROLE_PERMISSIONS]
  return projectPermissions?.includes(permission) || false
}