import { Request, Response } from 'express';
import { Webhook } from 'svix';
import { WebhookEvent } from '@clerk/clerk-sdk-node';
import { initializeUserMetadata, initializeOrganizationMetadata } from './clerk-metadata';

// Webhook secret from Clerk Dashboard (store in env)
const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

export async function handleClerkWebhook(req: Request, res: Response) {
  console.log('🔵 Clerk webhook received!', {
    headers: Object.keys(req.headers),
    bodyType: typeof req.body,
    bodyLength: req.body?.length || 0
  });
  
  if (!webhookSecret) {
    console.error('CLERK_WEBHOOK_SECRET not set');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  // Get the headers
  const svix_id = req.headers['svix-id'] as string;
  const svix_timestamp = req.headers['svix-timestamp'] as string;
  const svix_signature = req.headers['svix-signature'] as string;

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return res.status(400).json({ error: 'Missing svix headers' });
  }

  // Get the body - req.body should be a Buffer when using express.raw()
  const payload = req.body instanceof Buffer ? req.body.toString() : JSON.stringify(req.body);

  // Create a new Webhook instance with your secret
  const wh = new Webhook(webhookSecret);

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(payload, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return res.status(400).json({ error: 'Error verifying webhook' });
  }

  // Handle the webhook event
  const eventType = evt.type;
  console.log(`🔵 Received webhook: ${eventType}`, { data: evt.data });

  try {
    // Add webhook processing with retry logic
    const maxRetries = 3;
    let retryCount = 0;
    let lastError: any = null;

    while (retryCount < maxRetries) {
      try {
        switch (eventType) {
          case 'user.created':
            await handleUserCreated(evt);
            break;
            
          case 'user.updated':
            await handleUserUpdated(evt);
            break;
            
          case 'user.deleted':
            await handleUserDeleted(evt);
            break;
            
          case 'organization.created':
            await handleOrganizationCreated(evt);
            break;
            
          case 'organizationMembership.created':
            await handleOrganizationMembershipCreated(evt);
            break;
            
          case 'organizationInvitation.accepted':
            await handleInvitationAccepted(evt);
            break;
            
          case 'organizationInvitation.created':
            await handleInvitationCreated(evt);
            break;
            
          default:
            console.log(`Unhandled webhook type: ${eventType}`);
        }

        // If we get here, the webhook was processed successfully
        console.log(`✅ Webhook ${eventType} processed successfully${retryCount > 0 ? ` after ${retryCount} retries` : ''}`);
        return res.status(200).json({ 
          received: true, 
          type: eventType,
          retries: retryCount,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        lastError = error;
        retryCount++;
        
        if (retryCount < maxRetries) {
          console.warn(`⚠️ Webhook ${eventType} failed (attempt ${retryCount}/${maxRetries}), retrying in 1s...`, error);
          await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
        } else {
          console.error(`❌ Webhook ${eventType} failed after ${maxRetries} attempts:`, error);
        }
      }
    }

    // If we get here, all retries failed
    res.status(500).json({ 
      error: 'Error processing webhook after retries',
      type: eventType,
      retries: maxRetries,
      lastError: lastError?.message,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error(`❌ Critical webhook error for ${eventType}:`, error);
    res.status(500).json({ 
      error: 'Critical webhook processing error',
      type: eventType,
      timestamp: new Date().toISOString()
    });
  }
}

// Handle user.created event
async function handleUserCreated(evt: WebhookEvent) {
  const { id, email_addresses, first_name, last_name } = evt.data as any;
  
  console.log(`New user created: ${id}`);
  
  // Check if this email exists in the clients table to determine role
  const email = email_addresses?.[0]?.email_address;
  let userRole: 'admin' | 'team_member' | 'client' = 'admin'; // Default to admin
  
  if (email) {
    try {
      // Check if this email exists as a client
      const clientCheckResponse = await fetch(`${process.env.API_BASE_URL || 'http://localhost:3001'}/api/supabase/clients/by-email/${encodeURIComponent(email)}`);
      
      if (clientCheckResponse.ok) {
        const clientData = await clientCheckResponse.json();
        if (clientData && clientData.client) {
          userRole = 'client';
          console.log(`Setting role as 'client' for email: ${email}`);
        }
      }
    } catch (error) {
      console.error('Error checking if user is a client:', error);
      // Continue with default 'admin' role
    }
  }
  
  // Initialize user with determined role
  await initializeUserMetadata(id, userRole);
  
  // Create user record in Supabase with improved error handling
  const userData = {
    email: email_addresses?.[0]?.email_address,
    name: `${first_name || ''} ${last_name || ''}`.trim(),
    clerkUserId: id, // Add Clerk user ID
    subscriptionPlan: 'pro_trial' // New users get 14-day trial
  };

  console.log('🔄 Creating user in Supabase:', userData);

  try {
    // Validate required data
    if (!userData.email) {
      throw new Error('Email is required for user creation');
    }

    // Use relative URL to avoid issues with different environments
    const apiUrl = '/api/supabase/users';
    const response = await fetch(`http://localhost:3000${apiUrl}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
      timeout: 10000 // 10 second timeout
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create user in Supabase (${response.status}): ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ Successfully synced user to Supabase:', {
      id: result.id,
      email: result.email,
      subscriptionPlan: result.subscriptionPlan
    });

    return result;
  } catch (error) {
    console.error('❌ Error syncing user to Supabase:', error);
    
    // For critical errors, we should throw to trigger retry
    if (error.message.includes('ECONNREFUSED') || error.message.includes('timeout')) {
      throw new Error(`Database connection failed during user creation: ${error.message}`);
    }
    
    // For other errors, log but don't fail the webhook
    console.warn('⚠️ Non-critical error during user sync, continuing...');
    return null;
  }
}

// Handle user.updated event
async function handleUserUpdated(evt: WebhookEvent) {
  const { id } = evt.data as any;
  
  console.log(`User updated: ${id}`);
  
  // TODO: Update user record in Supabase
  console.log('TODO: Update user in Supabase');
}

// Handle organization.created event
async function handleOrganizationCreated(evt: WebhookEvent) {
  const { id, name, created_by, slug } = evt.data as any;
  
  console.log(`New organization created: ${id}`);
  
  // Initialize organization with trial plan
  await initializeOrganizationMetadata(id);
  
  // Create organization record in Supabase
  try {
    const orgData = {
      clerkOrgId: id,
      name,
      slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
      createdBy: created_by,
      plan: 'pro_trial'
    };

    console.log('🔧 Creating organization in Supabase:', orgData);

    const response = await fetch(`${process.env.API_BASE_URL || 'http://localhost:3002'}/api/supabase/organizations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orgData),
    });

    if (!response.ok) {
      throw new Error(`Failed to create organization in Supabase: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('🔧 Successfully synced organization to Supabase:', result);
  } catch (error) {
    console.error('Error syncing organization to Supabase:', error);
  }
}

// Handle organizationMembership.created event
async function handleOrganizationMembershipCreated(evt: WebhookEvent) {
  const { organization, public_user_data, role } = evt.data as any;
  
  console.log(`User ${public_user_data?.user_id} joined organization ${organization?.id} as ${role}`);
  
  // Create membership record in Supabase
  try {
    // First, get the Supabase organization ID from Clerk org ID
    const orgResponse = await fetch(`${process.env.API_BASE_URL || 'http://localhost:3002'}/api/supabase/organizations/${organization?.id}`);
    
    if (!orgResponse.ok) {
      throw new Error(`Organization not found in Supabase: ${organization?.id}`);
    }
    
    const orgResult = await orgResponse.json();
    const organizationId = orgResult.organization.id;

    const membershipData = {
      organizationId,
      clerkUserId: public_user_data?.user_id,
      role: role === 'org:admin' ? 'admin' : 'member'
    };

    console.log('🔧 Creating membership in Supabase:', membershipData);

    const response = await fetch(`${process.env.API_BASE_URL || 'http://localhost:3002'}/api/supabase/organizations/memberships`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(membershipData),
    });

    if (!response.ok) {
      throw new Error(`Failed to create membership in Supabase: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('🔧 Successfully synced membership to Supabase:', result);
  } catch (error) {
    console.error('Error syncing membership to Supabase:', error);
  }
}

// Handle organizationInvitation.accepted event
async function handleInvitationAccepted(evt: WebhookEvent) {
  const { id, organization_id, email_address, role, public_metadata } = evt.data as any;
  
  console.log(`Invitation accepted for ${email_address} to join organization ${organization_id} as ${role}`);
  
  // Update invitation status in Supabase
  try {
    // Find the invitation by Clerk invitation ID
    const invitationData = {
      status: 'accepted',
      acceptedAt: new Date().toISOString()
    };

    console.log('🔧 Updating invitation status in Supabase for Clerk ID:', id);

    // Since we need to find by clerk_invitation_id, we'll need to modify our API
    // For now, let's log this and handle it in a future enhancement
    console.log('🔧 Invitation acceptance data:', {
      clerkInvitationId: id,
      organizationId: organization_id,
      email: email_address,
      role,
      status: 'accepted'
    });
  } catch (error) {
    console.error('Error updating invitation in Supabase:', error);
  }
}

// Handle organizationInvitation.created event
async function handleInvitationCreated(evt: WebhookEvent) {
  const { id, organization_id, email_address, role, inviter_user_id } = evt.data as any;
  
  console.log(`Invitation created for ${email_address} to join organization ${organization_id}`);
  
  // Create invitation record in Supabase for tracking
  try {
    // Get the Supabase organization ID from Clerk org ID
    const orgResponse = await fetch(`${process.env.API_BASE_URL || 'http://localhost:3002'}/api/supabase/organizations/${organization_id}`);
    
    if (!orgResponse.ok) {
      throw new Error(`Organization not found in Supabase: ${organization_id}`);
    }
    
    const orgResult = await orgResponse.json();
    const organizationId = orgResult.organization.id;

    const invitationData = {
      organizationId,
      clerkInvitationId: id,
      email: email_address,
      role: role === 'org:admin' ? 'admin' : 'member',
      invitedBy: inviter_user_id
    };

    console.log('🔧 Creating invitation in Supabase:', invitationData);

    const response = await fetch(`${process.env.API_BASE_URL || 'http://localhost:3002'}/api/supabase/organizations/invitations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(invitationData),
    });

    if (!response.ok) {
      throw new Error(`Failed to create invitation in Supabase: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('🔧 Successfully synced invitation to Supabase:', result);
  } catch (error) {
    console.error('Error syncing invitation to Supabase:', error);
  }
}

// Handle user.deleted event - CRITICAL for cleanup
async function handleUserDeleted(evt: WebhookEvent) {
  const { id, email_addresses } = evt.data as any;
  
  console.log(`🗑️ User deleted from Clerk: ${id}`);
  
  const email = email_addresses?.[0]?.email_address;
  if (!email) {
    console.warn('⚠️ No email found for user deletion, using Clerk ID');
  }

  try {
    // Call our safe deletion endpoint
    const deleteUrl = email 
      ? `http://localhost:3000/api/supabase/users/${encodeURIComponent(email)}/hard-delete`
      : `http://localhost:3000/api/supabase/users/by-clerk-id/${id}/hard-delete`;
    
    console.log(`🔄 Attempting safe user deletion: ${deleteUrl}`);
    
    const response = await fetch(deleteUrl, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000 // 30 second timeout for complex deletion
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to delete user from Supabase (${response.status}): ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ Successfully deleted user from Supabase:', {
      email: email || 'unknown',
      clerkId: id,
      deletedRecords: result.deletedRecords || 'unknown'
    });

    return result;
  } catch (error) {
    console.error('❌ Critical error deleting user from Supabase:', error);
    
    // For user deletion, we need to be more aggressive about cleanup
    // If the primary deletion fails, try a fallback soft delete
    try {
      console.log('🔄 Attempting fallback soft deletion...');
      
      const fallbackUrl = email 
        ? `http://localhost:3000/api/supabase/users/${encodeURIComponent(email)}`
        : null;
      
      if (fallbackUrl) {
        const fallbackResponse = await fetch(fallbackUrl, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (fallbackResponse.ok) {
          console.log('✅ Fallback soft deletion successful');
          return { fallback: true, method: 'soft_delete' };
        }
      }
    } catch (fallbackError) {
      console.error('❌ Fallback deletion also failed:', fallbackError);
    }
    
    // Re-throw the original error to trigger webhook retry
    throw new Error(`User deletion failed: ${error.message}`);
  }
}