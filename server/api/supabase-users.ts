import { Request, Response } from 'express'
import { createClient } from '@supabase/supabase-js'
import { Database } from '../../shared/supabase-types'

// Server-side Supabase client with service role key
const supabaseAdmin = createClient<Database>(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

interface CreateUserRequest {
  email: string
  name: string
  clerkUserId?: string
  avatar?: string
  companyName?: string
  companyRole?: string
  industry?: string
  companySize?: string
  specialization?: string
  subscriptionPlan?: string
  trialStartDate?: string
}

interface UpdateUserRequest {
  name?: string
  avatar?: string
  companyName?: string
  companyRole?: string
  industry?: string
  companySize?: string
  specialization?: string
  subscriptionPlan?: string
  subscriptionStatus?: string
  maxProjects?: number
  trialStartDate?: string
}

// Create or update user in Supabase
export const createOrUpdateUser = async (req: Request, res: Response) => {
  try {
    const userData: CreateUserRequest = req.body

    // Validate required fields
    if (!userData.email || !userData.name) {
      return res.status(400).json({
        error: 'Missing required fields: email and name are required'
      })
    }

    // Check if user already exists
    const { data: existingUser, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('email', userData.email)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error checking existing user:', fetchError)
      return res.status(500).json({ error: 'Failed to check existing user' })
    }

    let result
    if (existingUser) {
      // Update existing user
      const { data, error } = await supabaseAdmin
        .from('users')
        .update({
          name: userData.name,
          clerk_user_id: userData.clerkUserId,
          avatar: userData.avatar,
          company_name: userData.companyName,
          company_role: userData.companyRole,
          industry: userData.industry,
          company_size: userData.companySize,
          specialization: userData.specialization,
          subscription_plan: userData.subscriptionPlan || 'pro_trial',
          // trial_start_date: userData.trialStartDate, // Temporarily removed due to schema cache issue
          last_login_at: new Date().toISOString(),
        })
        .eq('email', userData.email)
        .select()
        .single()

      if (error) {
        console.error('Error updating user:', error)
        return res.status(500).json({ error: 'Failed to update user' })
      }

      result = { user: data, created: false }
    } else {
      // Create new user with generated username
      const username = userData.email.split('@')[0] + '_' + Math.random().toString(36).substr(2, 5);
      
      const { data, error } = await supabaseAdmin
        .from('users')
        .insert([{
          username: username,
          email: userData.email,
          name: userData.name,
          clerk_user_id: userData.clerkUserId,
          avatar: userData.avatar,
          company_name: userData.companyName,
          company_role: userData.companyRole,
          industry: userData.industry,
          company_size: userData.companySize,
          specialization: userData.specialization,
          subscription_plan: userData.subscriptionPlan || 'pro_trial',
          subscription_status: 'active',
          max_projects: (userData.subscriptionPlan === 'pro' || userData.subscriptionPlan === 'pro_trial') ? -1 : 3,
          // trial_start_date: userData.trialStartDate, // Temporarily removed due to schema cache issue
          last_login_at: new Date().toISOString(),
        }])
        .select()
        .single()

      if (error) {
        console.error('Error creating user:', error)
        return res.status(500).json({ 
          error: 'Failed to create user',
          details: error.message,
          code: error.code
        })
      }

      result = { user: data, created: true }
    }

    console.log(`${result.created ? 'Created' : 'Updated'} user:`, result.user.email)
    res.json(result)
  } catch (error) {
    console.error('Error in createOrUpdateUser:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Get user by email
export const getUserByEmail = async (req: Request, res: Response) => {
  try {
    const { email } = req.params

    if (!email) {
      return res.status(400).json({ error: 'Email parameter is required' })
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'User not found' })
      }
      console.error('Error fetching user:', error)
      return res.status(500).json({ error: 'Failed to fetch user' })
    }

    res.json({ user: data })
  } catch (error) {
    console.error('Error in getUserByEmail:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Update user
export const updateUser = async (req: Request, res: Response) => {
  try {
    const { email } = req.params
    const updates: UpdateUserRequest = req.body

    if (!email) {
      return res.status(400).json({ error: 'Email parameter is required' })
    }

    // Remove undefined values
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, value]) => value !== undefined)
    )

    if (Object.keys(cleanUpdates).length === 0) {
      return res.status(400).json({ error: 'No update fields provided' })
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .update(cleanUpdates)
      .eq('email', email)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'User not found' })
      }
      console.error('Error updating user:', error)
      return res.status(500).json({ error: 'Failed to update user' })
    }

    console.log('Updated user:', data.email)
    res.json({ user: data })
  } catch (error) {
    console.error('Error in updateUser:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Delete user (soft delete)
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { email } = req.params

    if (!email) {
      return res.status(400).json({ error: 'Email parameter is required' })
    }

    // Soft delete by setting is_active to false
    const { data, error } = await supabaseAdmin
      .from('users')
      .update({ 
        is_active: false,
        // You might want to anonymize data here
      })
      .eq('email', email)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'User not found' })
      }
      console.error('Error deleting user:', error)
      return res.status(500).json({ error: 'Failed to delete user' })
    }

    console.log('Soft deleted user:', data.email)
    res.json({ user: data, message: 'User deactivated successfully' })
  } catch (error) {
    console.error('Error in deleteUser:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Get user's usage statistics
export const getUserUsage = async (req: Request, res: Response) => {
  try {
    const { email } = req.params

    if (!email) {
      return res.status(400).json({ error: 'Email parameter is required' })
    }

    // Get user ID first
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, subscription_plan, max_projects')
      .eq('email', email)
      .single()

    if (userError) {
      if (userError.code === 'PGRST116') {
        return res.status(404).json({ error: 'User not found' })
      }
      console.error('Error fetching user:', userError)
      return res.status(500).json({ error: 'Failed to fetch user' })
    }

    // Get project count
    const { count: projectCount, error: projectError } = await supabaseAdmin
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', user.id)

    if (projectError) {
      console.error('Error counting projects:', projectError)
      return res.status(500).json({ error: 'Failed to count projects' })
    }

    // Get collaborator count
    const { count: collaboratorCount, error: collaboratorError } = await supabaseAdmin
      .from('user_collaborations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'active')

    if (collaboratorError) {
      console.error('Error counting collaborators:', collaboratorError)
      return res.status(500).json({ error: 'Failed to count collaborators' })
    }

    // Get storage usage (sum of all assets)
    const { data: storageData, error: storageError } = await supabaseAdmin
      .from('assets')
      .select('size')
      .eq('owner_id', user.id)

    if (storageError) {
      console.error('Error calculating storage:', storageError)
      return res.status(500).json({ error: 'Failed to calculate storage usage' })
    }

    const storageUsed = storageData?.reduce((total, asset) => total + (asset.size || 0), 0) || 0

    const usage = {
      projects: {
        used: projectCount || 0,
        limit: user.max_projects === -1 ? 'unlimited' : user.max_projects,
        percentage: user.max_projects === -1 ? 0 : Math.round(((projectCount || 0) / user.max_projects) * 100)
      },
      collaborators: {
        used: collaboratorCount || 0,
        limit: (user.subscription_plan === 'pro' || user.subscription_plan === 'pro_trial') ? 'unlimited' : 0,
        percentage: (user.subscription_plan === 'pro' || user.subscription_plan === 'pro_trial') ? 0 : 100
      },
      storage: {
        used: storageUsed,
        usedFormatted: formatBytes(storageUsed),
        limit: (user.subscription_plan === 'pro' || user.subscription_plan === 'pro_trial') ? 100 * 1024 * 1024 * 1024 : 5 * 1024 * 1024 * 1024, // 100GB or 5GB
        limitFormatted: (user.subscription_plan === 'pro' || user.subscription_plan === 'pro_trial') ? '100 GB' : '5 GB',
        percentage: Math.round((storageUsed / ((user.subscription_plan === 'pro' || user.subscription_plan === 'pro_trial') ? 100 * 1024 * 1024 * 1024 : 5 * 1024 * 1024 * 1024)) * 100)
      }
    }

    res.json({
      user: {
        id: user.id,
        email,
        subscription_plan: user.subscription_plan
      },
      usage
    })
  } catch (error) {
    console.error('Error in getUserUsage:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Expire trial users and downgrade to solo plan
export const expireTrialUsers = async (req: Request, res: Response) => {
  try {
    const now = new Date().toISOString();
    
    // Find users with expired trials (pro_trial plan, no stripe subscription)
    const { data: expiredUsers, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('id, email, subscription_plan, trial_start_date')
      .eq('subscription_plan', 'pro_trial')
      .not('trial_start_date', 'is', null)
      .is('stripe_subscription_id', null)
      
    if (fetchError) {
      console.error('Error fetching trial users:', fetchError);
      return res.status(500).json({ error: 'Failed to fetch trial users' });
    }
    
    if (!expiredUsers || expiredUsers.length === 0) {
      return res.json({ expired: 0, message: 'No expired trial users found' });
    }
    
    // Filter users whose trial has actually expired (14 days)
    const actuallyExpired = expiredUsers.filter(user => {
      const trialStart = new Date(user.trial_start_date);
      const trialEnd = new Date(trialStart.getTime() + (14 * 24 * 60 * 60 * 1000));
      return trialEnd < new Date();
    });
    
    if (actuallyExpired.length === 0) {
      return res.json({ expired: 0, message: 'No expired trial users found' });
    }
    
    // Update expired users to solo plan
    const userIds = actuallyExpired.map(user => user.id);
    const { data: updatedUsers, error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        subscription_plan: 'solo',
        max_projects: 3, // Solo plan limit
      })
      .in('id', userIds)
      .select();
      
    if (updateError) {
      console.error('Error updating expired trial users:', updateError);
      return res.status(500).json({ error: 'Failed to update expired trial users' });
    }
    
    console.log(`Expired ${actuallyExpired.length} trial users:`, actuallyExpired.map(u => u.email));
    
    res.json({
      expired: actuallyExpired.length,
      users: updatedUsers,
      message: `Successfully expired ${actuallyExpired.length} trial users`
    });
  } catch (error) {
    console.error('Error in expireTrialUsers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Hard delete user - CRITICAL for Clerk webhook
export const hardDeleteUser = async (req: Request, res: Response) => {
  try {
    const { email } = req.params

    if (!email) {
      return res.status(400).json({ error: 'Email parameter is required' })
    }

    console.log(`🗑️ Starting hard deletion for user: ${email}`)

    // Get user ID first
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('email', email)
      .single()

    if (userError) {
      if (userError.code === 'PGRST116') {
        return res.status(404).json({ error: 'User not found' })
      }
      console.error('Error fetching user for deletion:', userError)
      return res.status(500).json({ error: 'Failed to fetch user for deletion' })
    }

    const userId = user.id
    let deletedRecords = 0

    // Delete in order to respect foreign key constraints
    console.log(`🔄 Step 1: Deleting user-related records for user ID: ${userId}`)

    try {
      // 1. Delete activity audit records
      const { error: activityAuditError } = await supabaseAdmin
        .from('activity_audit')
        .delete()
        .eq('user_id', userId)
      
      if (activityAuditError) {
        console.warn('Error deleting activity audit:', activityAuditError)
      } else {
        deletedRecords++
        console.log('✅ Deleted activity audit records')
      }

      // 2. Delete notifications
      const { error: notificationsError } = await supabaseAdmin
        .from('notifications')
        .delete()
        .eq('user_id', userId)
      
      if (notificationsError) {
        console.warn('Error deleting notifications:', notificationsError)
      } else {
        deletedRecords++
        console.log('✅ Deleted notifications')
      }

      // 3. Delete support ticket messages
      const { error: ticketMessagesError } = await supabaseAdmin
        .from('support_ticket_messages')
        .delete()
        .eq('sender_id', userId)
      
      if (ticketMessagesError) {
        console.warn('Error deleting support ticket messages:', ticketMessagesError)
      } else {
        deletedRecords++
        console.log('✅ Deleted support ticket messages')
      }

      // 4. Delete support tickets
      const { error: ticketsError } = await supabaseAdmin
        .from('support_tickets')
        .delete()
        .eq('user_id', userId)
      
      if (ticketsError) {
        console.warn('Error deleting support tickets:', ticketsError)
      } else {
        deletedRecords++
        console.log('✅ Deleted support tickets')
      }

      // 4. Delete design comments
      const { error: designCommentsError } = await supabaseAdmin
        .from('design_comments')
        .delete()
        .eq('author_id', userId)
      
      if (designCommentsError) {
        console.warn('Error deleting design comments:', designCommentsError)
      } else {
        deletedRecords++
        console.log('✅ Deleted design comments')
      }

      // 5. Delete project designs
      const { error: designsError } = await supabaseAdmin
        .from('project_designs')
        .delete()
        .eq('uploaded_by', userId)
      
      if (designsError) {
        console.warn('Error deleting project designs:', designsError)
      } else {
        deletedRecords++
        console.log('✅ Deleted project designs')
      }

      // 6. Delete project tasks
      const { error: tasksError } = await supabaseAdmin
        .from('project_tasks')
        .delete()
        .or(`created_by.eq.${userId},assigned_to.eq.${userId}`)
      
      if (tasksError) {
        console.warn('Error deleting project tasks:', tasksError)
      } else {
        deletedRecords++
        console.log('✅ Deleted project tasks')
      }

      // 7. Delete assets
      const { error: assetsError } = await supabaseAdmin
        .from('assets')
        .delete()
        .or(`owner_id.eq.${userId},uploaded_by.eq.${userId}`)
      
      if (assetsError) {
        console.warn('Error deleting assets:', assetsError)
      } else {
        deletedRecords++
        console.log('✅ Deleted assets')
      }

      // 8. Delete project comments
      const { error: commentsError } = await supabaseAdmin
        .from('project_comments')
        .delete()
        .eq('author_id', userId)
      
      if (commentsError) {
        console.warn('Error deleting project comments:', commentsError)
      } else {
        deletedRecords++
        console.log('✅ Deleted project comments')
      }

      // 9. Delete form submissions
      const { error: submissionsError } = await supabaseAdmin
        .from('form_submissions')
        .delete()
        .eq('reviewed_by', userId)
      
      if (submissionsError) {
        console.warn('Error deleting form submissions:', submissionsError)
      } else {
        deletedRecords++
        console.log('✅ Deleted form submissions')
      }

      // 10. Delete onboarding forms
      const { error: formsError } = await supabaseAdmin
        .from('onboarding_forms')
        .delete()
        .or(`owner_id.eq.${userId},created_by.eq.${userId}`)
      
      if (formsError) {
        console.warn('Error deleting onboarding forms:', formsError)
      } else {
        deletedRecords++
        console.log('✅ Deleted onboarding forms')
      }

      // 11. Delete messages
      const { error: messagesError } = await supabaseAdmin
        .from('messages')
        .delete()
        .eq('sender_id', userId)
      
      if (messagesError) {
        console.warn('Error deleting messages:', messagesError)
      } else {
        deletedRecords++
        console.log('✅ Deleted messages')
      }

      // 12. Delete direct messages
      const { error: directMessagesError } = await supabaseAdmin
        .from('direct_messages')
        .delete()
        .eq('sender_id', userId)
      
      if (directMessagesError) {
        console.warn('Error deleting direct messages:', directMessagesError)
      } else {
        deletedRecords++
        console.log('✅ Deleted direct messages')
      }

      // 13. Delete team direct messages
      const { error: teamMessagesError } = await supabaseAdmin
        .from('team_direct_messages')
        .delete()
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      
      if (teamMessagesError) {
        console.warn('Error deleting team direct messages:', teamMessagesError)
      } else {
        deletedRecords++
        console.log('✅ Deleted team direct messages')
      }

      // 14. Delete project team memberships
      const { error: teamMembersError } = await supabaseAdmin
        .from('project_team_members')
        .delete()
        .or(`user_id.eq.${userId},assigned_by.eq.${userId}`)
      
      if (teamMembersError) {
        console.warn('Error deleting project team members:', teamMembersError)
      } else {
        deletedRecords++
        console.log('✅ Deleted project team members')
      }

      // 15. Delete user collaborations
      const { error: collaborationsError } = await supabaseAdmin
        .from('user_collaborations')
        .delete()
        .or(`user_id.eq.${userId},collaborator_id.eq.${userId}`)
      
      if (collaborationsError) {
        console.warn('Error deleting user collaborations:', collaborationsError)
      } else {
        deletedRecords++
        console.log('✅ Deleted user collaborations')
      }

      // 16. Delete user invitations
      const { error: invitationsError } = await supabaseAdmin
        .from('user_invitations')
        .delete()
        .eq('invited_by', userId)
      
      if (invitationsError) {
        console.warn('Error deleting user invitations:', invitationsError)
      } else {
        deletedRecords++
        console.log('✅ Deleted user invitations')
      }

      // 17. Handle projects owned by user (transfer ownership or delete)
      console.log('🔄 Step 2: Handling owned projects...')
      
      // For now, we'll delete projects owned by the user
      // In production, you might want to transfer ownership instead
      const { error: projectsError } = await supabaseAdmin
        .from('projects')
        .delete()
        .eq('owner_id', userId)
      
      if (projectsError) {
        console.warn('Error deleting projects:', projectsError)
      } else {
        deletedRecords++
        console.log('✅ Deleted owned projects')
      }

      // 18. Handle clients created by user
      const { error: clientsError } = await supabaseAdmin
        .from('clients')
        .delete()
        .eq('created_by', userId)
      
      if (clientsError) {
        console.warn('Error deleting clients:', clientsError)
      } else {
        deletedRecords++
        console.log('✅ Deleted created clients')
      }

      // 19. Finally, delete the user record
      console.log('🔄 Step 3: Deleting user record...')
      
      const { error: userDeleteError } = await supabaseAdmin
        .from('users')
        .delete()
        .eq('id', userId)
      
      if (userDeleteError) {
        throw new Error(`Failed to delete user record: ${userDeleteError.message}`)
      }

      deletedRecords++
      console.log('✅ Deleted user record')

    } catch (deleteError) {
      console.error('Error during deletion process:', deleteError)
      throw deleteError
    }

    console.log(`✅ Successfully hard deleted user: ${email} (${deletedRecords} record types cleaned up)`)
    
    res.json({ 
      success: true,
      user: { id: userId, email },
      deletedRecords,
      message: 'User and all related data successfully deleted'
    })
  } catch (error) {
    console.error('Error in hardDeleteUser:', error)
    res.status(500).json({ 
      error: 'Failed to delete user',
      details: error.message
    })
  }
}

// Hard delete user by Clerk ID
export const hardDeleteUserByClerkId = async (req: Request, res: Response) => {
  try {
    const { clerkId } = req.params

    if (!clerkId) {
      return res.status(400).json({ error: 'Clerk ID parameter is required' })
    }

    console.log(`🗑️ Starting hard deletion for Clerk user: ${clerkId}`)

    // Get user by Clerk ID first
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('clerk_user_id', clerkId)
      .single()

    if (userError) {
      if (userError.code === 'PGRST116') {
        return res.status(404).json({ error: 'User not found' })
      }
      console.error('Error fetching user by Clerk ID:', userError)
      return res.status(500).json({ error: 'Failed to fetch user by Clerk ID' })
    }

    // Use the email-based deletion function
    req.params.email = user.email
    return hardDeleteUser(req, res)
  } catch (error) {
    console.error('Error in hardDeleteUserByClerkId:', error)
    res.status(500).json({ 
      error: 'Failed to delete user by Clerk ID',
      details: error.message
    })
  }
}

// Helper function to format bytes
function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}