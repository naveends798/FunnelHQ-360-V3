import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { AuthenticatedRequest } from './auth-middleware';

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

interface TeamMemberRequest extends AuthenticatedRequest {
  projectTeamMember?: any;
  projectAccess?: {
    canEditProject: boolean;
    canInviteMembers: boolean;
    canViewAllTasks: boolean;
    accessLevel: string;
    allowedTasks: number[];
  };
}

// Middleware to validate team member access to specific project
export const requireTeamMemberProjectAccess = (projectIdParam: string = 'projectId') => {
  return async (req: TeamMemberRequest, res: Response, next: NextFunction) => {
    try {
      const projectId = parseInt(req.params[projectIdParam]);
      const userId = req.userId;
      const organizationId = req.organizationId;

      if (!projectId || !userId || !organizationId) {
        return res.status(400).json({ error: 'Missing required parameters' });
      }

      // For admins, skip team member checks
      if (req.userRole === 'admin') {
        req.projectAccess = {
          canEditProject: true,
          canInviteMembers: true,
          canViewAllTasks: true,
          accessLevel: 'full',
          allowedTasks: []
        };
        return next();
      }

      // Check if user is a team member on this project
      const { data: teamMember, error } = await supabase
        .from('project_team_members')
        .select(`
          id,
          role,
          permissions,
          access_level,
          allowed_tasks,
          can_view_all_tasks,
          can_edit_project,
          can_invite_members,
          notification_preferences,
          is_active
        `)
        .eq('project_id', projectId)
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (error || !teamMember) {
        return res.status(403).json({ 
          error: 'Project access denied',
          hint: 'You are not assigned to this project or your access has been revoked'
        });
      }

      // Update last project access
      await supabase
        .from('project_team_members')
        .update({ last_project_access: new Date().toISOString() })
        .eq('id', teamMember.id);

      // Set project access context
      req.projectTeamMember = teamMember;
      req.projectAccess = {
        canEditProject: teamMember.can_edit_project || false,
        canInviteMembers: teamMember.can_invite_members || false,
        canViewAllTasks: teamMember.can_view_all_tasks !== false,
        accessLevel: teamMember.access_level || 'standard',
        allowedTasks: teamMember.allowed_tasks || []
      };

      console.log('👥 Team member project access:', {
        userId,
        projectId,
        role: teamMember.role,
        accessLevel: req.projectAccess.accessLevel,
        permissions: teamMember.permissions
      });

      next();
    } catch (error) {
      console.error('Error in team member project access middleware:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
};

// Middleware to check specific project permissions
export const requireProjectPermission = (requiredPermissions: string[]) => {
  return (req: TeamMemberRequest, res: Response, next: NextFunction) => {
    // Admin users have all permissions
    if (req.userRole === 'admin') {
      return next();
    }

    if (!req.projectTeamMember) {
      return res.status(403).json({ error: 'Project access required' });
    }

    const userPermissions = req.projectTeamMember.permissions || [];
    const hasRequiredPermissions = requiredPermissions.every(perm => 
      userPermissions.includes(perm)
    );

    if (!hasRequiredPermissions) {
      return res.status(403).json({
        error: 'Insufficient project permissions',
        required: requiredPermissions,
        current: userPermissions
      });
    }

    next();
  };
};

// Middleware to check task-specific access for restricted team members
export const requireTaskAccess = (taskIdParam: string = 'taskId') => {
  return async (req: TeamMemberRequest, res: Response, next: NextFunction) => {
    try {
      // Admin users have access to all tasks
      if (req.userRole === 'admin') {
        return next();
      }

      if (!req.projectAccess) {
        return res.status(403).json({ error: 'Project access required' });
      }

      // If user can view all tasks, allow access
      if (req.projectAccess.canViewAllTasks) {
        return next();
      }

      // For restricted access, check specific task permissions
      const taskId = parseInt(req.params[taskIdParam]);
      if (!taskId) {
        return res.status(400).json({ error: 'Task ID is required' });
      }

      const allowedTasks = req.projectAccess.allowedTasks || [];
      if (!allowedTasks.includes(taskId)) {
        return res.status(403).json({ 
          error: 'Task access denied',
          hint: 'You do not have access to this specific task'
        });
      }

      next();
    } catch (error) {
      console.error('Error in task access middleware:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
};

// Helper function to assign team member to project
export const assignTeamMemberToProject = async (
  projectId: number,
  userId: number,
  assignedBy: number,
  role: string = 'team_member',
  options: {
    permissions?: string[];
    accessLevel?: 'standard' | 'restricted' | 'full';
    allowedTasks?: number[];
    canEditProject?: boolean;
    canInviteMembers?: boolean;
    canViewAllTasks?: boolean;
  } = {}
) => {
  try {
    const assignmentData = {
      project_id: projectId,
      user_id: userId,
      assigned_by: assignedBy,
      role,
      permissions: options.permissions || [],
      access_level: options.accessLevel || 'standard',
      allowed_tasks: options.allowedTasks || [],
      can_edit_project: options.canEditProject || false,
      can_invite_members: options.canInviteMembers || false,
      can_view_all_tasks: options.canViewAllTasks !== false, // Default to true
      notification_preferences: {
        taskAssigned: true,
        projectUpdates: true,
        comments: true,
        milestones: true
      }
    };

    const { data, error } = await supabase
      .from('project_team_members')
      .insert([assignmentData])
      .select(`
        *,
        users!project_team_members_user_id_fkey (
          id, name, email, avatar
        )
      `)
      .single();

    if (error) {
      throw error;
    }

    console.log(`✅ Team member ${userId} assigned to project ${projectId} with role: ${role}`);
    return data;
  } catch (error) {
    console.error('Error assigning team member to project:', error);
    throw error;
  }
};

// Helper function to update team member project permissions
export const updateTeamMemberPermissions = async (
  teamMemberId: number,
  updates: {
    permissions?: string[];
    accessLevel?: 'standard' | 'restricted' | 'full';
    allowedTasks?: number[];
    canEditProject?: boolean;
    canInviteMembers?: boolean;
    canViewAllTasks?: boolean;
  }
) => {
  try {
    const updateData: any = {};
    
    if (updates.permissions !== undefined) updateData.permissions = updates.permissions;
    if (updates.accessLevel !== undefined) updateData.access_level = updates.accessLevel;
    if (updates.allowedTasks !== undefined) updateData.allowed_tasks = updates.allowedTasks;
    if (updates.canEditProject !== undefined) updateData.can_edit_project = updates.canEditProject;
    if (updates.canInviteMembers !== undefined) updateData.can_invite_members = updates.canInviteMembers;
    if (updates.canViewAllTasks !== undefined) updateData.can_view_all_tasks = updates.canViewAllTasks;

    const { data, error } = await supabase
      .from('project_team_members')
      .update(updateData)
      .eq('id', teamMemberId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    console.log(`✅ Team member permissions updated for ID: ${teamMemberId}`);
    return data;
  } catch (error) {
    console.error('Error updating team member permissions:', error);
    throw error;
  }
};

// Helper function to remove team member from project
export const removeTeamMemberFromProject = async (
  teamMemberId: number,
  removedBy: number
) => {
  try {
    const { data, error } = await supabase
      .from('project_team_members')
      .update({ 
        is_active: false,
        // Could add removed_by and removed_at fields for audit trail
      })
      .eq('id', teamMemberId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    console.log(`🚫 Team member removed from project: ${teamMemberId}`);
    return data;
  } catch (error) {
    console.error('Error removing team member from project:', error);
    throw error;
  }
};

export { TeamMemberRequest };