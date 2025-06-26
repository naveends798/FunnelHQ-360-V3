import { Request, Response } from 'express';
import { clerkClient } from '@clerk/clerk-sdk-node';

// Update user metadata (requires Clerk secret key)
export async function updateUserMetadata(req: Request, res: Response) {
  try {
    const { userId, publicMetadata, privateMetadata } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const updateData: any = {};
    
    if (publicMetadata !== undefined) {
      updateData.publicMetadata = publicMetadata;
    }
    
    if (privateMetadata !== undefined) {
      updateData.privateMetadata = privateMetadata;
    }

    const user = await clerkClient.users.updateUser(userId, updateData);
    
    res.json({ 
      success: true, 
      user: {
        id: user.id,
        publicMetadata: user.publicMetadata,
        privateMetadata: user.privateMetadata
      }
    });
  } catch (error: any) {
    console.error('Error updating user metadata:', error);
    res.status(500).json({ 
      error: 'Failed to update user metadata',
      details: error.message 
    });
  }
}

// Update organization metadata
export async function updateOrganizationMetadata(req: Request, res: Response) {
  try {
    const { organizationId, publicMetadata, privateMetadata } = req.body;
    
    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID is required' });
    }

    const updateData: any = {};
    
    if (publicMetadata !== undefined) {
      updateData.publicMetadata = publicMetadata;
    }
    
    if (privateMetadata !== undefined) {
      updateData.privateMetadata = privateMetadata;
    }

    const organization = await clerkClient.organizations.updateOrganization(
      organizationId, 
      updateData
    );
    
    res.json({ 
      success: true, 
      organization: {
        id: organization.id,
        publicMetadata: organization.publicMetadata,
        privateMetadata: organization.privateMetadata
      }
    });
  } catch (error: any) {
    console.error('Error updating organization metadata:', error);
    res.status(500).json({ 
      error: 'Failed to update organization metadata',
      details: error.message 
    });
  }
}

// Initialize user with default metadata on signup
export async function initializeUserMetadata(userId: string, role: 'admin' | 'team_member' | 'client' = 'team_member') {
  try {
    await clerkClient.users.updateUser(userId, {
      publicMetadata: {
        role,
        onboardingCompleted: false,
        createdAt: new Date().toISOString()
      },
      privateMetadata: {
        internalNotes: '',
        flags: []
      }
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error initializing user metadata:', error);
    return { success: false, error };
  }
}

// Initialize organization with trial plan
export async function initializeOrganizationMetadata(organizationId: string) {
  try {
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14); // 14-day trial
    
    await clerkClient.organizations.updateOrganization(organizationId, {
      publicMetadata: {
        plan: 'pro_trial',
        trialEndsAt: trialEndsAt.toISOString(),
        createdAt: new Date().toISOString(),
        features: {
          maxProjects: -1, // unlimited for pro trial
          maxStorage: 107374182400, // 100GB in bytes
          maxTeamMembers: -1 // unlimited
        }
      },
      privateMetadata: {
        stripeCustomerId: null,
        subscriptionId: null,
        billingEmail: null
      }
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error initializing organization metadata:', error);
    return { success: false, error };
  }
}