import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { storage } from '../storage';
import { authenticateUser, requireOrganizationAccess } from './auth-middleware';
import { 
  requireTeamMemberProjectAccess, 
  requireProjectPermission,
  assignTeamMemberToProject,
  updateTeamMemberPermissions,
  removeTeamMemberFromProject,
  TeamMemberRequest
} from './team-member-middleware';

const router = Router();

// Get organization team members (available for project assignment)
router.get('/team-members',
  authenticateUser,
  requireOrganizationAccess(),
  async (req: any, res) => {
    try {
      const organizationId = parseInt(req.organizationId);

      // Get all active users in the organization
      const supabase = createClient(
        process.env.VITE_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      const { data: members, error } = await supabase
        .from('organization_memberships')
        .select(`
          clerk_user_id,
          role,
          permissions,
          joined_at,
          is_active,
          users!inner (
            id,
            name,
            email,
            avatar,
            specialization,
            company_role
          )
        `)
        .eq('organization_id', organizationId)
        .eq('is_active', true);

      if (error) {
        throw error;
      }

      // Transform for frontend
      const teamMembers = members.map(member => ({
        id: member.users.id,
        clerkUserId: member.clerk_user_id,
        name: member.users.name,
        email: member.users.email,
        avatar: member.users.avatar,
        specialization: member.users.specialization,
        companyRole: member.users.company_role,
        organizationRole: member.role,
        permissions: member.permissions,
        joinedAt: member.joined_at
      }));

      res.json(teamMembers);
    } catch (error) {
      console.error('Error fetching team members:', error);
      res.status(500).json({ error: 'Failed to fetch team members' });
    }
  }
);

// Get project team members with their assignments
router.get('/projects/:projectId/team-members',
  authenticateUser,
  requireOrganizationAccess(),
  requireTeamMemberProjectAccess('projectId'),
  async (req: TeamMemberRequest, res) => {
    try {
      const projectId = parseInt(req.params.projectId);

      const teamMembers = await storage.getProjectTeamMembers(projectId);
      
      // Add access control information
      const enhancedTeamMembers = teamMembers.map(member => ({
        ...member,
        accessLevel: (member as any).accessLevel || 'standard',
        allowedTasks: (member as any).allowedTasks || [],
        canViewAllTasks: (member as any).canViewAllTasks !== false,
        canEditProject: (member as any).canEditProject || false,
        canInviteMembers: (member as any).canInviteMembers || false,
        lastProjectAccess: (member as any).lastProjectAccess,
        notificationPreferences: (member as any).notificationPreferences || {}
      }));

      res.json(enhancedTeamMembers);
    } catch (error) {
      console.error('Error fetching project team members:', error);
      res.status(500).json({ error: 'Failed to fetch project team members' });
    }
  }
);

// Assign team member to project
router.post('/projects/:projectId/team-members',
  authenticateUser,
  requireOrganizationAccess(['manage_projects']),
  requireTeamMemberProjectAccess('projectId'),
  requireProjectPermission(['invite_members']),
  async (req: TeamMemberRequest, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const assignedBy = parseInt(req.userId!);
      const {
        userId,
        role = 'team_member',
        permissions = [],
        accessLevel = 'standard',
        allowedTasks = [],
        canEditProject = false,
        canInviteMembers = false,
        canViewAllTasks = true
      } = req.body;

      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }

      // Verify user belongs to the same organization
      const organizationId = parseInt(req.organizationId!);
      const supabase = createClient(
        process.env.VITE_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      const { data: userMembership } = await supabase
        .from('organization_memberships')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('clerk_user_id', userId)
        .eq('is_active', true)
        .single();

      if (!userMembership) {
        return res.status(400).json({ 
          error: 'User not found in organization',
          hint: 'User must be a member of the organization before being assigned to projects'
        });
      }

      // Check if user is already assigned to this project
      const existingAssignment = await storage.getUserProjectRole(projectId, userId);
      if (existingAssignment && existingAssignment.isActive) {
        return res.status(400).json({ 
          error: 'User is already assigned to this project',
          hint: 'Update their role or permissions instead'
        });
      }

      const assignment = await assignTeamMemberToProject(
        projectId,
        userId,
        assignedBy,
        role,
        {
          permissions,
          accessLevel,
          allowedTasks,
          canEditProject,
          canInviteMembers,
          canViewAllTasks
        }
      );

      res.status(201).json({
        success: true,
        assignment,
        message: 'Team member assigned to project successfully'
      });
    } catch (error) {
      console.error('Error assigning team member to project:', error);
      res.status(500).json({ error: 'Failed to assign team member' });
    }
  }
);

// Update team member project permissions
router.patch('/projects/:projectId/team-members/:teamMemberId',
  authenticateUser,
  requireOrganizationAccess(['manage_projects']),
  requireTeamMemberProjectAccess('projectId'),
  requireProjectPermission(['manage_team']),
  async (req: TeamMemberRequest, res) => {
    try {
      const teamMemberId = parseInt(req.params.teamMemberId);
      const {
        permissions,
        accessLevel,
        allowedTasks,
        canEditProject,
        canInviteMembers,
        canViewAllTasks,
        role
      } = req.body;

      // If role is being updated, we need to use the project team member update method
      let updatedMember;
      if (role) {
        updatedMember = await storage.updateProjectTeamMember(teamMemberId, {
          role,
          permissions,
          accessLevel,
          allowedTasks,
          canEditProject,
          canInviteMembers,
          canViewAllTasks
        });
      } else {
        updatedMember = await updateTeamMemberPermissions(teamMemberId, {
          permissions,
          accessLevel,
          allowedTasks,
          canEditProject,
          canInviteMembers,
          canViewAllTasks
        });
      }

      if (!updatedMember) {
        return res.status(404).json({ error: 'Team member assignment not found' });
      }

      res.json({
        success: true,
        teamMember: updatedMember,
        message: 'Team member permissions updated successfully'
      });
    } catch (error) {
      console.error('Error updating team member permissions:', error);
      res.status(500).json({ error: 'Failed to update team member permissions' });
    }
  }
);

// Remove team member from project
router.delete('/projects/:projectId/team-members/:teamMemberId',
  authenticateUser,
  requireOrganizationAccess(['manage_projects']),
  requireTeamMemberProjectAccess('projectId'),
  requireProjectPermission(['manage_team']),
  async (req: TeamMemberRequest, res) => {
    try {
      const teamMemberId = parseInt(req.params.teamMemberId);
      const removedBy = parseInt(req.userId!);

      const result = await removeTeamMemberFromProject(teamMemberId, removedBy);
      
      if (!result) {
        return res.status(404).json({ error: 'Team member assignment not found' });
      }

      res.json({
        success: true,
        message: 'Team member removed from project successfully'
      });
    } catch (error) {
      console.error('Error removing team member from project:', error);
      res.status(500).json({ error: 'Failed to remove team member' });
    }
  }
);

// Get team member's project assignments
router.get('/team-members/:userId/assignments',
  authenticateUser,
  requireOrganizationAccess(),
  async (req: any, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const organizationId = parseInt(req.organizationId);

      // Check if current user can view this information
      if (req.userRole !== 'admin' && parseInt(req.userId) !== userId) {
        return res.status(403).json({ 
          error: 'Access denied',
          hint: 'You can only view your own assignments unless you are an admin'
        });
      }

      const assignments = await storage.getProjectsForUser(userId, organizationId);
      
      res.json(assignments);
    } catch (error) {
      console.error('Error fetching user assignments:', error);
      res.status(500).json({ error: 'Failed to fetch assignments' });
    }
  }
);

// Bulk assign team members to project
router.post('/projects/:projectId/team-members/bulk',
  authenticateUser,
  requireOrganizationAccess(['manage_projects']),
  requireTeamMemberProjectAccess('projectId'),
  requireProjectPermission(['invite_members']),
  async (req: TeamMemberRequest, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const assignedBy = parseInt(req.userId!);
      const { userIds, role = 'team_member', permissions = [] } = req.body;

      if (!Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({ error: 'User IDs array is required' });
      }

      const organizationId = parseInt(req.organizationId!);
      
      // Verify all users belong to the same organization
      const supabase = createClient(
        process.env.VITE_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      const { data: userMemberships } = await supabase
        .from('organization_memberships')
        .select('clerk_user_id')
        .eq('organization_id', organizationId)
        .in('clerk_user_id', userIds)
        .eq('is_active', true);

      const validUserIds = userMemberships?.map(m => m.clerk_user_id) || [];
      const invalidUserIds = userIds.filter(uid => !validUserIds.includes(uid));

      if (invalidUserIds.length > 0) {
        return res.status(400).json({
          error: 'Some users not found in organization',
          invalidUsers: invalidUserIds
        });
      }

      // Assign all users
      const assignments = await Promise.all(
        userIds.map(userId => 
          assignTeamMemberToProject(projectId, userId, assignedBy, role, { permissions })
        )
      );

      res.status(201).json({
        success: true,
        assignments,
        assigned: assignments.length,
        message: `${assignments.length} team members assigned to project successfully`
      });
    } catch (error) {
      console.error('Error bulk assigning team members:', error);
      res.status(500).json({ error: 'Failed to bulk assign team members' });
    }
  }
);

// Update team member notification preferences
router.patch('/projects/:projectId/team-members/:teamMemberId/notifications',
  authenticateUser,
  requireOrganizationAccess(),
  requireTeamMemberProjectAccess('projectId'),
  async (req: TeamMemberRequest, res) => {
    try {
      const teamMemberId = parseInt(req.params.teamMemberId);
      const { notificationPreferences } = req.body;

      // Users can only update their own notifications unless they're admin
      if (req.userRole !== 'admin') {
        const supabase = createClient(
          process.env.VITE_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        const { data: teamMember } = await supabase
          .from('project_team_members')
          .select('user_id')
          .eq('id', teamMemberId)
          .single();

        if (!teamMember || teamMember.user_id.toString() !== req.userId) {
          return res.status(403).json({ 
            error: 'Access denied',
            hint: 'You can only update your own notification preferences'
          });
        }
      }

      const supabase = createClient(
        process.env.VITE_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      const { data, error } = await supabase
        .from('project_team_members')
        .update({ notification_preferences: notificationPreferences })
        .eq('id', teamMemberId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      res.json({
        success: true,
        teamMember: data,
        message: 'Notification preferences updated successfully'
      });
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      res.status(500).json({ error: 'Failed to update notification preferences' });
    }
  }
);

export default router;