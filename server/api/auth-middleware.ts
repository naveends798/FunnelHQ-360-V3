import { Request, Response, NextFunction } from 'express';
import { clerkClient } from '@clerk/clerk-sdk-node';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../../shared/supabase-types';

// Server-side Supabase client with service role key
const supabase = createClient<Database>(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

interface AuthenticatedRequest extends Request {
  userId?: string;
  userRole?: string;
  organizationId?: string;
}

// Middleware to verify Clerk session and extract user information
export const authenticateUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    console.log('🔐 Auth middleware - Headers:', {
      authorization: req.headers.authorization ? `Bearer ${req.headers.authorization.substring(7, 20)}...` : 'missing',
      userAgent: req.headers['user-agent']?.substring(0, 50)
    });

    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ Auth middleware - Missing or invalid auth header');
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const sessionToken = authHeader.substring(7);
    console.log('🎫 Auth middleware - Token length:', sessionToken.length);
    
    // Verify the JWT token with Clerk (using newer networkless verification)
    const payload = await clerkClient.verifyToken(sessionToken);

    console.log('✅ Auth middleware - Token verified:', { userId: payload.sub });

    if (!payload || !payload.sub) {
      console.log('❌ Auth middleware - Invalid token payload');
      return res.status(401).json({ error: 'Invalid session token' });
    }

    // Get user organization membership from Supabase
    const { data: membership, error: membershipError } = await supabase
      .from('organization_memberships')
      .select(`
        organization_id,
        role,
        permissions,
        is_active,
        organizations!inner (
          id,
          name,
          plan
        )
      `)
      .eq('clerk_user_id', payload.sub)
      .eq('is_active', true)
      .single();

    if (membershipError && membershipError.code !== 'PGRST116') {
      console.error('Error fetching organization membership:', membershipError);
      return res.status(500).json({ error: 'Failed to verify organization membership' });
    }

    if (!membership) {
      console.log('❌ Auth middleware - User has no active organization membership');
      
      // Provide more helpful error message 
      return res.status(401).json({ 
        error: 'Authentication failed',
        details: 'No active organization membership',
        hint: 'User needs to be added to an organization'
      });
    }

    req.userId = payload.sub;
    req.userRole = membership.role;
    req.organizationId = membership.organization_id.toString();

    console.log('👤 Auth middleware - User authenticated:', { 
      userId: payload.sub, 
      role: req.userRole,
      orgId: req.organizationId,
      orgName: membership.organizations.name,
      orgPlan: membership.organizations.plan
    });

    next();
  } catch (error) {
    console.error('❌ Authentication error:', error);
    
    // In development, provide more detailed error information
    if (process.env.NODE_ENV === 'development') {
      console.error('Auth error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack?.substring(0, 500)
      });
      
      return res.status(401).json({ 
        error: 'Authentication failed',
        details: error.message,
        hint: 'Check if user is signed in to Clerk and has valid session'
      });
    }
    
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

// Middleware to check if user has required role
export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.userRole || !allowedRoles.includes(req.userRole)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: allowedRoles,
        current: req.userRole
      });
    }
    next();
  };
};

// Middleware to check if user is admin
export const requireAdmin = requireRole(['admin']);

// Middleware to check if user is admin or team member
export const requireTeamAccess = requireRole(['admin', 'team_member']);

// Middleware to validate organization membership and permissions
export const requireOrganizationAccess = (requiredPermissions?: string[]) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.userId || !req.organizationId) {
        return res.status(401).json({ error: 'User not authenticated or missing organization context' });
      }

      // Get current membership to verify permissions
      const { data: membership, error } = await supabase
        .from('organization_memberships')
        .select('role, permissions, is_active')
        .eq('clerk_user_id', req.userId)
        .eq('organization_id', req.organizationId)
        .eq('is_active', true)
        .single();

      if (error || !membership) {
        return res.status(403).json({ 
          error: 'Invalid organization membership',
          hint: 'User is not an active member of the requested organization'
        });
      }

      // Check specific permissions if required
      if (requiredPermissions && requiredPermissions.length > 0) {
        const userPermissions = membership.permissions || [];
        const hasRequiredPermissions = requiredPermissions.every(perm => 
          userPermissions.includes(perm) || membership.role === 'admin'
        );

        if (!hasRequiredPermissions) {
          return res.status(403).json({
            error: 'Insufficient permissions',
            required: requiredPermissions,
            current: userPermissions
          });
        }
      }

      next();
    } catch (error) {
      console.error('Error in organization access middleware:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
};

// Helper function to check project access with organization validation
export const checkProjectAccess = async (userId: string, projectId: string, userRole: string, organizationId: string): Promise<boolean> => {
  try {
    // First verify the project belongs to the user's organization
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('organization_id, client_id, owner_id')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      console.log('Project not found or error:', projectError);
      return false;
    }

    // Ensure project belongs to user's organization
    if (project.organization_id.toString() !== organizationId) {
      console.log('Project does not belong to user organization');
      return false;
    }

    // Admins have access to all projects within their organization
    if (userRole === 'admin') {
      return true;
    }

    // Check if user is the project owner
    if (project.owner_id.toString() === userId) {
      return true;
    }

    // Check if user is assigned to the project as team member
    const { data: teamMember } = await supabase
      .from('project_team_members')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (teamMember) {
      return true;
    }

    // For clients, check if they are the project client
    if (userRole === 'client') {
      const { data: client } = await supabase
        .from('clients')
        .select('id')
        .eq('id', project.client_id)
        .eq('organization_id', organizationId)
        .single();

      return !!client;
    }

    return false;
  } catch (error) {
    console.error('Error checking project access:', error);
    return false;
  }
};

// Middleware to check project access
export const requireProjectAccess = (projectIdParam: string = 'projectId') => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const projectId = req.params[projectIdParam];
      
      if (!projectId) {
        return res.status(400).json({ error: 'Project ID is required' });
      }

      if (!req.userId || !req.userRole || !req.organizationId) {
        return res.status(401).json({ error: 'User not authenticated or missing organization context' });
      }

      const hasAccess = await checkProjectAccess(req.userId, projectId, req.userRole, req.organizationId);
      
      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied to this project' });
      }

      next();
    } catch (error) {
      console.error('Error in project access middleware:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
};

// Helper function to get organization data for current user
export const getOrganizationData = async (req: AuthenticatedRequest) => {
  if (!req.userId || !req.organizationId) {
    throw new Error('User not authenticated or missing organization context');
  }

  const { data: orgData, error } = await supabase
    .from('organizations')
    .select(`
      id,
      name,
      plan,
      max_members,
      max_projects,
      max_storage,
      storage_used,
      trial_ends_at,
      subscription_status
    `)
    .eq('id', req.organizationId)
    .single();

  if (error) {
    throw new Error('Failed to fetch organization data');
  }

  return orgData;
};

export { AuthenticatedRequest };