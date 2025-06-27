import { Request, Response } from 'express';
import { clerkClient } from '@clerk/clerk-sdk-node';

export const createOrganizationBackend = async (req: Request, res: Response) => {
  try {
    const { name, description, userId } = req.body;

    if (!name || !userId) {
      return res.status(400).json({ 
        error: 'Missing required fields: name and userId' 
      });
    }

    console.log('🏢 Creating organization via backend API:', { name, userId });

    // Create organization using Clerk backend API
    const organization = await clerkClient.organizations.createOrganization({
      name: name,
      createdBy: userId,
      publicMetadata: {
        description: description || '',
        plan: 'pro_trial',
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
        createdBy: userId
      }
    });

    console.log('✅ Organization created successfully:', organization.id);

    // Note: When an organization is created, the creator is automatically added as an admin member
    // No need to explicitly add them again as it will cause "already_a_member_in_organization" error
    console.log('✅ User automatically added as admin to organization');

    // Create organization in Supabase
    try {
      const orgData = {
        clerkOrgId: organization.id,
        name: organization.name,
        slug: organization.slug,
        description: description || '',
        createdBy: userId,
        plan: 'pro_trial'
      };

      const baseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
      const orgResponse = await fetch(`${baseUrl}/api/supabase/organizations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orgData)
      });

      if (orgResponse.ok) {
        const orgResult = await orgResponse.json();
        console.log('✅ Organization created in Supabase:', orgResult.organization?.name);
        
        // Create membership
        if (orgResult.organization?.id) {
          const membershipData = {
            organizationId: orgResult.organization.id,
            clerkUserId: userId,
            role: 'admin'
          };

          const membershipResponse = await fetch(`${baseUrl}/api/supabase/organizations/memberships`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(membershipData)
          });

          if (membershipResponse.ok) {
            console.log('✅ Organization membership created in Supabase');
          }
        }
      }
    } catch (supabaseError) {
      console.warn('⚠️ Error creating organization in Supabase, webhook will handle it:', supabaseError);
    }

    res.json({
      success: true,
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug
      }
    });

  } catch (error) {
    console.error('❌ Error creating organization in Clerk:', error);
    res.status(500).json({ 
      error: 'Failed to create organization in Clerk',
      details: error.message 
    });
  }
};