import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { clerkClient } from '@clerk/clerk-sdk-node';
import crypto from 'crypto';
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

const router = Router();

// Types
interface InvitationRequest {
  email: string;
  role: 'admin' | 'team_member' | 'client';
  projectId?: string;
  organizationId: string;
  invitedBy: string;
  name?: string;
}

interface ValidateTokenRequest {
  token: string;
}

interface AcceptInvitationRequest {
  token: string;
  userId: string;
}

// Generate secure invitation token
function generateInvitationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Validate invitation token and return invitation data
router.post('/validate', async (req, res) => {
  try {
    const { token } = req.body as ValidateTokenRequest;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    // Look up invitation by token
    const { data: invitation, error } = await supabase
      .from('user_invitations')
      .select('*')
      .eq('token', token)
      .eq('status', 'pending')
      .single();

    if (error || !invitation) {
      return res.status(400).json({ error: 'Invalid or expired invitation' });
    }

    // Check if invitation has expired (24 hours)
    const expirationTime = new Date(invitation.created_at);
    expirationTime.setHours(expirationTime.getHours() + 24);
    
    if (new Date() > expirationTime) {
      // Mark as expired
      await supabase
        .from('user_invitations')
        .update({ status: 'expired' })
        .eq('id', invitation.id);
      
      return res.status(400).json({ error: 'Invitation has expired' });
    }

    res.json({
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      name: invitation.name,
      organizationId: invitation.organization_id,
      projectId: invitation.project_id,
      invitedBy: invitation.invited_by
    });
  } catch (error) {
    console.error('Error validating invitation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Accept invitation and complete user setup
router.post('/accept', async (req, res) => {
  try {
    const { token, userId } = req.body as AcceptInvitationRequest;

    if (!token || !userId) {
      return res.status(400).json({ error: 'Token and userId are required' });
    }

    // Get invitation
    const { data: invitation, error: inviteError } = await supabase
      .from('user_invitations')
      .select('*')
      .eq('token', token)
      .eq('status', 'pending')
      .single();

    if (inviteError || !invitation) {
      return res.status(400).json({ error: 'Invalid invitation' });
    }

    // Start transaction
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .upsert({
        id: userId,
        email: invitation.email,
        role: invitation.role,
        organization_id: invitation.organization_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (profileError) {
      console.error('Error creating user profile:', profileError);
      return res.status(500).json({ error: 'Failed to create user profile' });
    }

    // Add user to organization in Clerk
    try {
      if (invitation.organization_id) {
        await clerkClient.organizations.createOrganizationMembership({
          organizationId: invitation.organization_id,
          userId: userId,
          role: invitation.role === 'admin' ? 'admin' : 'basic_member'
        });

        // Update user metadata with role
        await clerkClient.users.updateUserMetadata(userId, {
          publicMetadata: {
            role: invitation.role,
            organizationId: invitation.organization_id,
            profileCompleted: false
          }
        });
      }
    } catch (clerkError) {
      console.error('Error updating Clerk organization:', clerkError);
      // Continue anyway - user profile is created
    }

    // If project-specific invitation, add to project
    if (invitation.project_id) {
      await supabase
        .from('project_team_members')
        .upsert({
          project_id: invitation.project_id,
          user_id: userId,
          role: invitation.role,
          added_at: new Date().toISOString()
        });
    }

    // Mark invitation as accepted
    await supabase
      .from('user_invitations')
      .update({ 
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        user_id: userId
      })
      .eq('id', invitation.id);

    res.json({ 
      success: true, 
      role: invitation.role,
      organizationId: invitation.organization_id,
      projectId: invitation.project_id
    });
  } catch (error) {
    console.error('Error accepting invitation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new invitation (Admin only)
router.post('/create', async (req, res) => {
  try {
    const { email, role, projectId, organizationId, invitedBy, name } = req.body as InvitationRequest;

    // Validate required fields
    if (!email || !role || !organizationId || !invitedBy) {
      return res.status(400).json({ error: 'Email, role, organizationId, and invitedBy are required' });
    }

    // Validate role
    if (!['admin', 'team_member', 'client'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Check if user is admin (you'll need to implement admin verification)
    // For now, we'll allow any authenticated user to create invitations

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Check for pending invitation
    const { data: pendingInvitation } = await supabase
      .from('user_invitations')
      .select('*')
      .eq('email', email)
      .eq('status', 'pending')
      .single();

    if (pendingInvitation) {
      return res.status(400).json({ error: 'User already has a pending invitation' });
    }

    // Generate invitation token
    const token = generateInvitationToken();

    // Create invitation
    const { data: invitation, error } = await supabase
      .from('user_invitations')
      .insert({
        id: crypto.randomUUID(),
        email,
        role,
        project_id: projectId,
        organization_id: organizationId,
        invited_by: invitedBy,
        name: name || email.split('@')[0],
        token,
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating invitation:', error);
      return res.status(500).json({ error: 'Failed to create invitation' });
    }

    // Generate invitation URL
    const baseUrl = process.env.BASE_URL || 'http://localhost:5173';
    const invitationUrl = `${baseUrl}/signup?invite=${token}`;

    // TODO: Send email invitation
    // For now, return the invitation URL

    res.json({
      success: true,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        invitationUrl,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }
    });
  } catch (error) {
    console.error('Error creating invitation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// List invitations for organization (Admin only)
router.get('/list/:organizationId', async (req, res) => {
  try {
    const { organizationId } = req.params;

    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID is required' });
    }

    // TODO: Verify admin access to organization

    const { data: invitations, error } = await supabase
      .from('user_invitations')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching invitations:', error);
      return res.status(500).json({ error: 'Failed to fetch invitations' });
    }

    res.json(invitations);
  } catch (error) {
    console.error('Error listing invitations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Cancel invitation (Admin only)
router.delete('/:invitationId', async (req, res) => {
  try {
    const { invitationId } = req.params;

    if (!invitationId) {
      return res.status(400).json({ error: 'Invitation ID is required' });
    }

    // TODO: Verify admin access

    const { error } = await supabase
      .from('user_invitations')
      .update({ status: 'cancelled' })
      .eq('id', invitationId);

    if (error) {
      console.error('Error cancelling invitation:', error);
      return res.status(500).json({ error: 'Failed to cancel invitation' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error cancelling invitation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;