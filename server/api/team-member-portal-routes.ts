import { Router } from 'express';
import { storage } from '../storage';
import { authenticateUser, requireOrganizationAccess } from './auth-middleware';
import { 
  requireTeamMemberProjectAccess, 
  requireProjectPermission,
  requireTaskAccess,
  TeamMemberRequest
} from './team-member-middleware';

const router = Router();

// Team member dashboard - get assigned projects
router.get('/dashboard',
  authenticateUser,
  requireOrganizationAccess(),
  async (req: any, res) => {
    try {
      const userId = parseInt(req.userId);
      const organizationId = parseInt(req.organizationId);

      const projects = await storage.getProjectsForUser(userId, organizationId);
      res.json(projects);
    } catch (error) {
      console.error('Error fetching team member dashboard:', error);
      res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
  }
);

// Get project details for team member
router.get('/projects/:projectId',
  authenticateUser,
  requireOrganizationAccess(),
  requireTeamMemberProjectAccess('projectId'),
  async (req: TeamMemberRequest, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const organizationId = parseInt(req.organizationId!);

      const project = await storage.getProjectWithClient(projectId, organizationId);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Add team member's access information
      const response = {
        ...project,
        teamMemberAccess: req.projectAccess
      };

      res.json(response);
    } catch (error) {
      console.error('Error fetching project details:', error);
      res.status(500).json({ error: 'Failed to fetch project details' });
    }
  }
);

// Get project tasks (with access control)
router.get('/projects/:projectId/tasks',
  authenticateUser,
  requireOrganizationAccess(),
  requireTeamMemberProjectAccess('projectId'),
  async (req: TeamMemberRequest, res) => {
    try {
      const projectId = parseInt(req.params.projectId);

      let tasks = await storage.getProjectTasks(projectId);

      // Filter tasks based on access level
      if (!req.projectAccess?.canViewAllTasks && req.projectAccess?.allowedTasks) {
        tasks = tasks.filter(task => 
          req.projectAccess!.allowedTasks.includes(task.id) ||
          task.assignedTo === parseInt(req.userId!)
        );
      }

      res.json(tasks);
    } catch (error) {
      console.error('Error fetching project tasks:', error);
      res.status(500).json({ error: 'Failed to fetch tasks' });
    }
  }
);

// Get specific task details
router.get('/projects/:projectId/tasks/:taskId',
  authenticateUser,
  requireOrganizationAccess(),
  requireTeamMemberProjectAccess('projectId'),
  requireTaskAccess('taskId'),
  async (req: TeamMemberRequest, res) => {
    try {
      const taskId = parseInt(req.params.taskId);

      const task = await storage.getProjectTask(taskId);
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }

      res.json(task);
    } catch (error) {
      console.error('Error fetching task details:', error);
      res.status(500).json({ error: 'Failed to fetch task details' });
    }
  }
);

// Update task status (if assigned or has permission)
router.patch('/projects/:projectId/tasks/:taskId/status',
  authenticateUser,
  requireOrganizationAccess(),
  requireTeamMemberProjectAccess('projectId'),
  requireTaskAccess('taskId'),
  async (req: TeamMemberRequest, res) => {
    try {
      const taskId = parseInt(req.params.taskId);
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({ error: 'Status is required' });
      }

      // Check if user can update this task
      const task = await storage.getProjectTask(taskId);
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }

      // Allow if user is assigned to the task or has edit permissions
      const canUpdate = task.assignedTo === parseInt(req.userId!) || 
                       req.projectAccess?.canEditProject;

      if (!canUpdate) {
        return res.status(403).json({ 
          error: 'Task update denied',
          hint: 'You can only update tasks assigned to you or if you have edit permissions'
        });
      }

      const updatedTask = await storage.updateTaskStatus(taskId, status);
      res.json(updatedTask);
    } catch (error) {
      console.error('Error updating task status:', error);
      res.status(500).json({ error: 'Failed to update task status' });
    }
  }
);

// Get project milestones
router.get('/projects/:projectId/milestones',
  authenticateUser,
  requireOrganizationAccess(),
  requireTeamMemberProjectAccess('projectId'),
  async (req: TeamMemberRequest, res) => {
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

// Get project documents (if has permission)
router.get('/projects/:projectId/documents',
  authenticateUser,
  requireOrganizationAccess(),
  requireTeamMemberProjectAccess('projectId'),
  requireProjectPermission(['view_documents']),
  async (req: TeamMemberRequest, res) => {
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

// Get project comments
router.get('/projects/:projectId/comments',
  authenticateUser,
  requireOrganizationAccess(),
  requireTeamMemberProjectAccess('projectId'),
  requireProjectPermission(['view_comments']),
  async (req: TeamMemberRequest, res) => {
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
  authenticateUser,
  requireOrganizationAccess(),
  requireTeamMemberProjectAccess('projectId'),
  requireProjectPermission(['post_comments']),
  async (req: TeamMemberRequest, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const authorId = parseInt(req.userId!);
      const { content, mentions, attachments } = req.body;

      if (!content || content.trim().length === 0) {
        return res.status(400).json({ error: 'Comment content is required' });
      }

      const commentData = {
        projectId,
        authorId,
        authorType: 'team_member' as const,
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

// Get team member's assignments across all projects
router.get('/assignments',
  authenticateUser,
  requireOrganizationAccess(),
  async (req: any, res) => {
    try {
      const userId = parseInt(req.userId);
      const organizationId = parseInt(req.organizationId);

      const assignments = await storage.getProjectsForUser(userId, organizationId);
      res.json(assignments);
    } catch (error) {
      console.error('Error fetching team member assignments:', error);
      res.status(500).json({ error: 'Failed to fetch assignments' });
    }
  }
);

// Update team member's own notification preferences
router.patch('/projects/:projectId/notifications',
  authenticateUser,
  requireOrganizationAccess(),
  requireTeamMemberProjectAccess('projectId'),
  async (req: TeamMemberRequest, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const userId = parseInt(req.userId!);
      const { notificationPreferences } = req.body;

      // Get team member record for this project
      const teamMember = await storage.getUserProjectRole(projectId, userId);
      if (!teamMember) {
        return res.status(404).json({ error: 'Team member assignment not found' });
      }

      const updatedMember = await storage.updateProjectTeamMember(teamMember.id, {
        notificationPreferences
      });

      res.json({
        success: true,
        teamMember: updatedMember,
        message: 'Notification preferences updated successfully'
      });
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      res.status(500).json({ error: 'Failed to update notification preferences' });
    }
  }
);

// Get project team members (team member view)
router.get('/projects/:projectId/team',
  authenticateUser,
  requireOrganizationAccess(),
  requireTeamMemberProjectAccess('projectId'),
  async (req: TeamMemberRequest, res) => {
    try {
      const projectId = parseInt(req.params.projectId);

      const teamMembers = await storage.getProjectTeamMembers(projectId);
      
      // Return limited information for team member view
      const publicTeamInfo = teamMembers.map(member => ({
        id: member.id,
        userId: member.userId,
        user: {
          id: member.user.id,
          name: member.user.name,
          email: member.user.email,
          avatar: member.user.avatar,
          specialization: member.user.specialization
        },
        role: member.role,
        assignedAt: member.assignedAt
      }));

      res.json(publicTeamInfo);
    } catch (error) {
      console.error('Error fetching project team:', error);
      res.status(500).json({ error: 'Failed to fetch project team' });
    }
  }
);

export default router;