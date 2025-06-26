import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { clerkClient } from '@clerk/clerk-sdk-node';

// Server-side Supabase client with service role key
const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

interface ClientPortalRequest extends Request {
  clientId?: string;
  organizationId?: string;
  portalPermissions?: string[];
  allowedProjects?: number[];
}

// Middleware to authenticate and validate client portal access
export const authenticateClientPortal = async (req: ClientPortalRequest, res: Response, next: NextFunction) => {
  try {
    console.log('🏛️ Client portal auth - Headers:', {
      authorization: req.headers.authorization ? `Bearer ${req.headers.authorization.substring(7, 20)}...` : 'missing',
      userAgent: req.headers['user-agent']?.substring(0, 50)
    });

    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ Client portal auth - Missing or invalid auth header');
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const sessionToken = authHeader.substring(7);
    
    // Verify the session token with Clerk
    const session = await clerkClient.sessions.verifySession(sessionToken);

    if (!session || !session.userId) {
      console.log('❌ Client portal auth - Invalid session');
      return res.status(401).json({ error: 'Invalid session token' });
    }

    // Get user metadata from Clerk to check if they are a client
    const user = await clerkClient.users.getUser(session.userId);
    const publicMetadata = user.publicMetadata as any;

    if (publicMetadata?.role !== 'client') {
      console.log('❌ Client portal auth - User is not a client');
      return res.status(403).json({ 
        error: 'Access denied',
        hint: 'Only clients can access the client portal'
      });
    }

    // Find client record in database using Clerk user ID
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select(`
        id,
        name,
        email,
        organization_id,
        portal_access,
        allowed_projects,
        portal_permissions,
        portal_notifications
      `)
      .eq('email', user.emailAddresses[0]?.emailAddress)
      .eq('portal_access', true)
      .single();

    if (clientError || !clientData) {
      console.log('❌ Client portal auth - Client not found or portal access disabled');
      return res.status(403).json({ 
        error: 'Portal access denied',
        hint: 'Your portal access may be disabled. Contact your project manager.'
      });
    }

    // Update last portal access timestamp
    await supabase
      .from('clients')
      .update({ last_portal_access: new Date().toISOString() })
      .eq('id', clientData.id);

    req.clientId = clientData.id.toString();
    req.organizationId = clientData.organization_id.toString();
    req.portalPermissions = clientData.portal_permissions || [];
    req.allowedProjects = clientData.allowed_projects || [];

    console.log('👤 Client portal auth - Client authenticated:', { 
      clientId: clientData.id,
      email: clientData.email,
      orgId: clientData.organization_id,
      allowedProjects: req.allowedProjects.length,
      permissions: req.portalPermissions.length
    });

    next();
  } catch (error) {
    console.error('❌ Client portal authentication error:', error);
    
    if (process.env.NODE_ENV === 'development') {
      return res.status(401).json({ 
        error: 'Client portal authentication failed',
        details: error.message,
        hint: 'Check if client is signed in and has portal access enabled'
      });
    }
    
    return res.status(401).json({ error: 'Client portal authentication failed' });
  }
};

// Middleware to check if client has specific portal permissions
export const requireClientPortalPermission = (requiredPermissions: string[]) => {
  return (req: ClientPortalRequest, res: Response, next: NextFunction) => {
    const userPermissions = req.portalPermissions || [];
    
    const hasRequiredPermissions = requiredPermissions.every(perm => 
      userPermissions.includes(perm)
    );

    if (!hasRequiredPermissions) {
      return res.status(403).json({
        error: 'Insufficient portal permissions',
        required: requiredPermissions,
        current: userPermissions
      });
    }
    
    next();
  };
};

// Middleware to check if client has access to specific project
export const requireClientProjectAccess = (projectIdParam: string = 'projectId') => {
  return async (req: ClientPortalRequest, res: Response, next: NextFunction) => {
    try {
      const projectId = parseInt(req.params[projectIdParam]);
      
      if (!projectId) {
        return res.status(400).json({ error: 'Project ID is required' });
      }

      if (!req.clientId || !req.allowedProjects) {
        return res.status(401).json({ error: 'Client not authenticated' });
      }

      // Check if client is explicitly allowed to access this project
      if (!req.allowedProjects.includes(projectId)) {
        return res.status(403).json({ 
          error: 'Project access denied',
          hint: 'You do not have access to this project'
        });
      }

      // Verify project belongs to client's organization
      const { data: project, error } = await supabase
        .from('projects')
        .select('organization_id, client_id')
        .eq('id', projectId)
        .single();

      if (error || !project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      if (project.organization_id.toString() !== req.organizationId) {
        return res.status(403).json({ error: 'Project access denied' });
      }

      // Optional: Verify client is the project client
      if (project.client_id.toString() !== req.clientId) {
        console.log('⚠️  Client accessing project they are not assigned to, but is in allowed list');
      }

      next();
    } catch (error) {
      console.error('Error in client project access middleware:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
};

// Helper function to grant client portal access
export const grantClientPortalAccess = async (
  clientId: number,
  projectIds: number[],
  permissions: string[] = ['view_projects', 'view_documents', 'post_comments']
) => {
  try {
    const { data, error } = await supabase
      .from('clients')
      .update({
        portal_access: true,
        allowed_projects: projectIds,
        portal_permissions: permissions
      })
      .eq('id', clientId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    console.log(`✅ Portal access granted to client ${clientId} for projects: ${projectIds.join(', ')}`);
    return data;
  } catch (error) {
    console.error('Error granting portal access:', error);
    throw error;
  }
};

// Helper function to revoke client portal access
export const revokeClientPortalAccess = async (clientId: number) => {
  try {
    const { data, error } = await supabase
      .from('clients')
      .update({
        portal_access: false,
        allowed_projects: [],
        portal_permissions: []
      })
      .eq('id', clientId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    console.log(`🚫 Portal access revoked for client ${clientId}`);
    return data;
  } catch (error) {
    console.error('Error revoking portal access:', error);
    throw error;
  }
};

export { ClientPortalRequest };