import { Router } from 'express';
import { storage } from '../storage';
import { authenticateUser, requireOrganizationAccess } from './auth-middleware';
import { grantClientPortalAccess, revokeClientPortalAccess } from './client-portal-middleware';

const router = Router();

// Admin endpoint to manage client portal access
router.post('/clients/:clientId/portal-access',
  authenticateUser,
  requireOrganizationAccess(['manage_clients']),
  async (req: any, res) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const organizationId = parseInt(req.organizationId);
      const { grant, projectIds, permissions } = req.body;

      // Verify client belongs to organization
      const client = await storage.getClient(clientId, organizationId);
      if (!client) {
        return res.status(404).json({ error: 'Client not found or access denied' });
      }

      if (grant) {
        // Grant portal access
        if (!Array.isArray(projectIds) || projectIds.length === 0) {
          return res.status(400).json({ error: 'Project IDs are required when granting access' });
        }

        // Verify all projects belong to organization
        const projectPromises = projectIds.map(pid => storage.getProject(pid, organizationId));
        const projects = await Promise.all(projectPromises);
        
        const invalidProjects = projects.some(p => !p);
        if (invalidProjects) {
          return res.status(400).json({ error: 'One or more projects not found or access denied' });
        }

        const defaultPermissions = [
          'view_projects',
          'view_documents', 
          'view_milestones',
          'post_comments',
          'view_comments'
        ];

        const updatedClient = await grantClientPortalAccess(
          clientId, 
          projectIds, 
          permissions || defaultPermissions
        );

        res.json({
          success: true,
          client: updatedClient,
          message: `Portal access granted for ${projectIds.length} projects`
        });
      } else {
        // Revoke portal access
        const updatedClient = await revokeClientPortalAccess(clientId);
        
        res.json({
          success: true,
          client: updatedClient,
          message: 'Portal access revoked'
        });
      }
    } catch (error) {
      console.error('Error managing client portal access:', error);
      res.status(500).json({ error: 'Failed to manage portal access' });
    }
  }
);

// Get client portal status
router.get('/clients/:clientId/portal-status',
  authenticateUser,
  requireOrganizationAccess(),
  async (req: any, res) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const organizationId = parseInt(req.organizationId);

      const client = await storage.getClient(clientId, organizationId);
      if (!client) {
        return res.status(404).json({ error: 'Client not found or access denied' });
      }

      // Get allowed projects with details
      const allowedProjectIds = (client as any).allowedProjects || [];
      const allowedProjects = [];
      
      if (allowedProjectIds.length > 0) {
        const projectPromises = allowedProjectIds.map(pid => storage.getProject(pid, organizationId));
        const projects = await Promise.all(projectPromises);
        allowedProjects.push(...projects.filter(Boolean));
      }

      res.json({
        clientId: client.id,
        name: client.name,
        email: client.email,
        portalAccess: (client as any).portalAccess || false,
        portalPermissions: (client as any).portalPermissions || [],
        allowedProjects: allowedProjects.map(p => ({
          id: p.id,
          title: p.title,
          status: p.status
        })),
        lastPortalAccess: (client as any).lastPortalAccess,
        portalNotifications: (client as any).portalNotifications !== false
      });
    } catch (error) {
      console.error('Error fetching client portal status:', error);
      res.status(500).json({ error: 'Failed to fetch portal status' });
    }
  }
);

// Update client portal permissions
router.patch('/clients/:clientId/portal-permissions',
  authenticateUser,
  requireOrganizationAccess(['manage_clients']),
  async (req: any, res) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const organizationId = parseInt(req.organizationId);
      const { permissions, notifications } = req.body;

      // Verify client belongs to organization
      const client = await storage.getClient(clientId, organizationId);
      if (!client) {
        return res.status(404).json({ error: 'Client not found or access denied' });
      }

      // Update permissions and notification settings
      const updateData: any = {};
      
      if (Array.isArray(permissions)) {
        updateData.portalPermissions = permissions;
      }
      
      if (typeof notifications === 'boolean') {
        updateData.portalNotifications = notifications;
      }

      const updatedClient = await storage.updateClient(clientId, updateData);
      
      res.json({
        success: true,
        client: updatedClient,
        message: 'Portal settings updated'
      });
    } catch (error) {
      console.error('Error updating client portal permissions:', error);
      res.status(500).json({ error: 'Failed to update portal permissions' });
    }
  }
);

// Bulk grant portal access to multiple clients
router.post('/clients/bulk-portal-access',
  authenticateUser,
  requireOrganizationAccess(['manage_clients']),
  async (req: any, res) => {
    try {
      const organizationId = parseInt(req.organizationId);
      const { clientIds, projectIds, permissions } = req.body;

      if (!Array.isArray(clientIds) || clientIds.length === 0) {
        return res.status(400).json({ error: 'Client IDs are required' });
      }

      if (!Array.isArray(projectIds) || projectIds.length === 0) {
        return res.status(400).json({ error: 'Project IDs are required' });
      }

      // Verify all clients and projects belong to organization
      const clientPromises = clientIds.map(cid => storage.getClient(cid, organizationId));
      const projectPromises = projectIds.map(pid => storage.getProject(pid, organizationId));
      
      const [clients, projects] = await Promise.all([
        Promise.all(clientPromises),
        Promise.all(projectPromises)
      ]);

      const invalidClients = clients.some(c => !c);
      const invalidProjects = projects.some(p => !p);
      
      if (invalidClients || invalidProjects) {
        return res.status(400).json({ error: 'One or more clients or projects not found' });
      }

      const defaultPermissions = [
        'view_projects',
        'view_documents',
        'view_milestones', 
        'post_comments',
        'view_comments'
      ];

      // Grant access to all clients
      const results = await Promise.all(
        clientIds.map(clientId => 
          grantClientPortalAccess(clientId, projectIds, permissions || defaultPermissions)
        )
      );

      res.json({
        success: true,
        updated: results.length,
        message: `Portal access granted to ${results.length} clients for ${projectIds.length} projects`
      });
    } catch (error) {
      console.error('Error bulk granting portal access:', error);
      res.status(500).json({ error: 'Failed to bulk grant portal access' });
    }
  }
);

export default router;