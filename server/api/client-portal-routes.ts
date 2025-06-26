import { Router } from 'express';
import { storage } from '../storage';
import { 
  authenticateClientPortal, 
  requireClientPortalPermission, 
  requireClientProjectAccess,
  ClientPortalRequest,
  grantClientPortalAccess,
  revokeClientPortalAccess
} from './client-portal-middleware';

const router = Router();

// Client portal authentication endpoint
router.get('/auth/verify', authenticateClientPortal, async (req: ClientPortalRequest, res) => {
  try {
    const clientId = parseInt(req.clientId!);
    const organizationId = parseInt(req.organizationId!);
    
    // Get client details
    const client = await storage.getClient(clientId, organizationId);
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    res.json({
      client: {
        id: client.id,
        name: client.name,
        email: client.email,
        avatar: client.avatar
      },
      permissions: req.portalPermissions,
      allowedProjects: req.allowedProjects,
      organizationId: req.organizationId
    });
  } catch (error) {
    console.error('Error verifying client portal auth:', error);
    res.status(500).json({ error: 'Failed to verify authentication' });
  }
});

// Get client's accessible projects
router.get('/projects', 
  authenticateClientPortal, 
  requireClientPortalPermission(['view_projects']),
  async (req: ClientPortalRequest, res) => {
    try {
      const clientId = parseInt(req.clientId!);
      const organizationId = parseInt(req.organizationId!);
      const allowedProjectIds = req.allowedProjects!;

      if (allowedProjectIds.length === 0) {
        return res.json([]);
      }

      // Get projects client has access to
      const allProjects = await storage.getProjects(organizationId);
      const accessibleProjects = allProjects.filter(project => 
        allowedProjectIds.includes(project.id)
      );

      // Add client details to each project
      const projectsWithDetails = await Promise.all(
        accessibleProjects.map(async (project) => {
          const projectWithClient = await storage.getProjectWithClient(project.id, organizationId);
          return projectWithClient;
        })
      );

      res.json(projectsWithDetails.filter(Boolean));
    } catch (error) {
      console.error('Error fetching client projects:', error);
      res.status(500).json({ error: 'Failed to fetch projects' });
    }
  }
);

// Get specific project details
router.get('/projects/:projectId',
  authenticateClientPortal,
  requireClientPortalPermission(['view_projects']),
  requireClientProjectAccess('projectId'),
  async (req: ClientPortalRequest, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const organizationId = parseInt(req.organizationId!);

      const project = await storage.getProjectWithClient(projectId, organizationId);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      res.json(project);
    } catch (error) {
      console.error('Error fetching project details:', error);
      res.status(500).json({ error: 'Failed to fetch project details' });
    }
  }
);

// Get project documents
router.get('/projects/:projectId/documents',
  authenticateClientPortal,
  requireClientPortalPermission(['view_documents']),
  requireClientProjectAccess('projectId'),
  async (req: ClientPortalRequest, res) => {
    try {
      const projectId = parseInt(req.params.projectId);

      const documents = await storage.getDocumentsByProject(projectId);
      res.json(documents);
    } catch (error) {
      console.error('Error fetching project documents:', error);
      res.status(500).json({ error: 'Failed to fetch documents' });
    }
  }
);

// Get project milestones
router.get('/projects/:projectId/milestones',
  authenticateClientPortal,
  requireClientPortalPermission(['view_projects']),
  requireClientProjectAccess('projectId'),
  async (req: ClientPortalRequest, res) => {
    try {
      const projectId = parseInt(req.params.projectId);

      const milestones = await storage.getMilestonesByProject(projectId);
      res.json(milestones);
    } catch (error) {
      console.error('Error fetching project milestones:', error);
      res.status(500).json({ error: 'Failed to fetch milestones' });
    }
  }
);

// Get project comments
router.get('/projects/:projectId/comments',
  authenticateClientPortal,
  requireClientPortalPermission(['view_comments']),
  requireClientProjectAccess('projectId'),
  async (req: ClientPortalRequest, res) => {
    try {
      const projectId = parseInt(req.params.projectId);

      const comments = await storage.getProjectComments(projectId);
      res.json(comments);
    } catch (error) {
      console.error('Error fetching project comments:', error);
      res.status(500).json({ error: 'Failed to fetch comments' });
    }
  }
);

// Post project comment
router.post('/projects/:projectId/comments',
  authenticateClientPortal,
  requireClientPortalPermission(['post_comments']),
  requireClientProjectAccess('projectId'),
  async (req: ClientPortalRequest, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const clientId = parseInt(req.clientId!);
      const { content, mentions, attachments } = req.body;

      if (!content || content.trim().length === 0) {
        return res.status(400).json({ error: 'Comment content is required' });
      }

      const commentData = {
        projectId,
        authorId: clientId,
        authorType: 'client' as const,
        content: content.trim(),
        mentions: mentions || [],
        attachments: attachments || [],
        status: 'open' as const,
        priority: 'normal' as const,
        tags: []
      };

      const comment = await storage.createProjectComment(commentData);
      res.status(201).json(comment);
    } catch (error) {
      console.error('Error creating project comment:', error);
      res.status(500).json({ error: 'Failed to create comment' });
    }
  }
);

// Get project messages (if client has messaging permission)
router.get('/projects/:projectId/messages',
  authenticateClientPortal,
  requireClientPortalPermission(['view_messages']),
  requireClientProjectAccess('projectId'),
  async (req: ClientPortalRequest, res) => {
    try {
      const projectId = parseInt(req.params.projectId);

      const messages = await storage.getMessagesByProject(projectId);
      res.json(messages);
    } catch (error) {
      console.error('Error fetching project messages:', error);
      res.status(500).json({ error: 'Failed to fetch messages' });
    }
  }
);

// Administrative endpoints for managing client portal access (admin only)

// Grant portal access to client
router.post('/admin/clients/:clientId/grant-access',
  // Note: This would need admin authentication middleware
  async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const { projectIds, permissions } = req.body;

      if (!Array.isArray(projectIds) || projectIds.length === 0) {
        return res.status(400).json({ error: 'Project IDs are required' });
      }

      const client = await grantClientPortalAccess(clientId, projectIds, permissions);
      res.json({ 
        success: true, 
        client,
        message: `Portal access granted for ${projectIds.length} projects`
      });
    } catch (error) {
      console.error('Error granting portal access:', error);
      res.status(500).json({ error: 'Failed to grant portal access' });
    }
  }
);

// Revoke portal access from client
router.post('/admin/clients/:clientId/revoke-access',
  // Note: This would need admin authentication middleware
  async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);

      const client = await revokeClientPortalAccess(clientId);
      res.json({ 
        success: true, 
        client,
        message: 'Portal access revoked'
      });
    } catch (error) {
      console.error('Error revoking portal access:', error);
      res.status(500).json({ error: 'Failed to revoke portal access' });
    }
  }
);

export default router;