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

interface CreateOrganizationRequest {
  clerkOrgId: string
  name: string
  slug?: string
  logo?: string
  createdBy: string
  plan?: string
}

interface CreateMembershipRequest {
  organizationId: number
  clerkUserId: string
  role: string
}

interface CreateInvitationRequest {
  organizationId: number
  clerkInvitationId?: string
  email: string
  role: string
  invitedBy: string
}

// Create or update organization in Supabase
export const createOrUpdateOrganization = async (req: Request, res: Response) => {
  try {
    const orgData: CreateOrganizationRequest = req.body

    // Validate required fields
    if (!orgData.clerkOrgId || !orgData.name || !orgData.createdBy) {
      return res.status(400).json({
        error: 'Missing required fields: clerkOrgId, name, and createdBy are required'
      })
    }

    // Check if organization already exists
    const { data: existingOrg, error: fetchError } = await supabaseAdmin
      .from('organizations')
      .select('id, name')
      .eq('clerk_org_id', orgData.clerkOrgId)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error checking existing organization:', fetchError)
      return res.status(500).json({ error: 'Failed to check existing organization' })
    }

    let result
    if (existingOrg) {
      // Update existing organization
      const { data, error } = await supabaseAdmin
        .from('organizations')
        .update({
          name: orgData.name,
          slug: orgData.slug,
          logo: orgData.logo,
          updated_at: new Date().toISOString(),
        })
        .eq('clerk_org_id', orgData.clerkOrgId)
        .select()
        .single()

      if (error) {
        console.error('Error updating organization:', error)
        return res.status(500).json({ error: 'Failed to update organization' })
      }

      result = { organization: data, created: false }
    } else {
      // Create new organization
      const { data, error } = await supabaseAdmin
        .from('organizations')
        .insert([{
          clerk_org_id: orgData.clerkOrgId,
          name: orgData.name,
          slug: orgData.slug || orgData.name.toLowerCase().replace(/\s+/g, '-'),
          logo: orgData.logo,
          plan: orgData.plan || 'pro_trial',
          trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days
          created_by: orgData.createdBy,
        }])
        .select()
        .single()

      if (error) {
        console.error('Error creating organization:', error)
        return res.status(500).json({ error: 'Failed to create organization' })
      }

      result = { organization: data, created: true }
    }

    console.log(`${result.created ? 'Created' : 'Updated'} organization:`, result.organization.name)
    res.json(result)
  } catch (error) {
    console.error('Error in createOrUpdateOrganization:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Create organization membership
export const createOrganizationMembership = async (req: Request, res: Response) => {
  try {
    const membershipData: CreateMembershipRequest = req.body

    if (!membershipData.organizationId || !membershipData.clerkUserId || !membershipData.role) {
      return res.status(400).json({
        error: 'Missing required fields: organizationId, clerkUserId, and role are required'
      })
    }

    // Check if membership already exists
    const { data: existingMembership, error: fetchError } = await supabaseAdmin
      .from('organization_memberships')
      .select('id')
      .eq('organization_id', membershipData.organizationId)
      .eq('clerk_user_id', membershipData.clerkUserId)
      .single()

    if (existingMembership) {
      return res.status(409).json({ error: 'Membership already exists' })
    }

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error checking existing membership:', fetchError)
      return res.status(500).json({ error: 'Failed to check existing membership' })
    }

    const { data, error } = await supabaseAdmin
      .from('organization_memberships')
      .insert([{
        organization_id: membershipData.organizationId,
        clerk_user_id: membershipData.clerkUserId,
        role: membershipData.role,
      }])
      .select()
      .single()

    if (error) {
      console.error('Error creating membership:', error)
      return res.status(500).json({ error: 'Failed to create membership' })
    }

    console.log('Created organization membership:', data)
    res.json({ membership: data, created: true })
  } catch (error) {
    console.error('Error in createOrganizationMembership:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Create organization invitation
export const createOrganizationInvitation = async (req: Request, res: Response) => {
  try {
    const invitationData: CreateInvitationRequest = req.body

    if (!invitationData.organizationId || !invitationData.email || !invitationData.role || !invitationData.invitedBy) {
      return res.status(400).json({
        error: 'Missing required fields: organizationId, email, role, and invitedBy are required'
      })
    }

    const { data, error } = await supabaseAdmin
      .from('organization_invitations')
      .insert([{
        organization_id: invitationData.organizationId,
        clerk_invitation_id: invitationData.clerkInvitationId,
        email: invitationData.email,
        role: invitationData.role,
        invited_by: invitationData.invitedBy,
        expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // 48 hours
      }])
      .select()
      .single()

    if (error) {
      console.error('Error creating invitation:', error)
      return res.status(500).json({ error: 'Failed to create invitation' })
    }

    console.log('Created organization invitation:', data)
    res.json({ invitation: data, created: true })
  } catch (error) {
    console.error('Error in createOrganizationInvitation:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Get organization by Clerk ID
export const getOrganizationByClerkId = async (req: Request, res: Response) => {
  try {
    const { clerkOrgId } = req.params

    if (!clerkOrgId) {
      return res.status(400).json({ error: 'Clerk organization ID is required' })
    }

    const { data, error } = await supabaseAdmin
      .from('organizations')
      .select(`
        *,
        organization_memberships (
          id,
          clerk_user_id,
          role,
          joined_at,
          is_active
        ),
        organization_invitations (
          id,
          email,
          role,
          status,
          invited_by,
          created_at,
          expires_at
        )
      `)
      .eq('clerk_org_id', clerkOrgId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Organization not found' })
      }
      console.error('Error fetching organization:', error)
      return res.status(500).json({ error: 'Failed to fetch organization' })
    }

    res.json({ organization: data })
  } catch (error) {
    console.error('Error in getOrganizationByClerkId:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Update invitation status (when accepted/rejected)
export const updateInvitationStatus = async (req: Request, res: Response) => {
  try {
    const { invitationId } = req.params
    const { status, acceptedAt } = req.body

    if (!invitationId || !status) {
      return res.status(400).json({ error: 'Invitation ID and status are required' })
    }

    const updateData: any = { status }
    if (status === 'accepted' && acceptedAt) {
      updateData.accepted_at = acceptedAt
    }

    const { data, error } = await supabaseAdmin
      .from('organization_invitations')
      .update(updateData)
      .eq('id', invitationId)
      .select()
      .single()

    if (error) {
      console.error('Error updating invitation:', error)
      return res.status(500).json({ error: 'Failed to update invitation' })
    }

    console.log('Updated invitation status:', data)
    res.json({ invitation: data })
  } catch (error) {
    console.error('Error in updateInvitationStatus:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}