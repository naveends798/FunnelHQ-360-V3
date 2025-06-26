import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface WebhookEvent {
  type: string
  data: {
    id: string
    email_addresses: { email_address: string; id: string }[]
    first_name?: string
    last_name?: string
    image_url?: string
    public_metadata?: Record<string, any>
    created_at?: number
    updated_at?: number
  }
}

interface OrganizationWebhookEvent {
  type: string
  data: {
    id: string
    name: string
    slug?: string
    created_at?: number
    updated_at?: number
  }
}

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { type, data } = await req.json() as WebhookEvent | OrganizationWebhookEvent

    console.log('Received webhook:', type, data)

    switch (type) {
      case 'user.created':
      case 'user.updated': {
        const userData = data as WebhookEvent['data']
        const primaryEmail = userData.email_addresses?.[0]?.email_address

        if (!primaryEmail) {
          throw new Error('No primary email found')
        }

        // Extract metadata
        const metadata = userData.public_metadata || {}
        
        const userRecord = {
          email: primaryEmail,
          name: userData.first_name && userData.last_name 
            ? `${userData.first_name} ${userData.last_name}`
            : userData.first_name || 'User',
          avatar: userData.image_url,
          company_name: metadata.companyName as string,
          company_role: metadata.companyRole as string,
          industry: metadata.industry as string,
          company_size: metadata.companySize as string,
          specialization: metadata.specialization as string,
          subscription_plan: metadata.subscriptionPlan as string || 'solo',
          subscription_status: metadata.subscriptionStatus as string || 'active',
          max_projects: metadata.subscriptionPlan === 'pro' ? -1 : 3,
          last_login_at: new Date().toISOString(),
        }

        // Upsert user
        const { data: upsertedUser, error } = await supabaseClient
          .from('users')
          .upsert([userRecord], { onConflict: 'email' })
          .select()
          .single()

        if (error) {
          console.error('Error upserting user:', error)
          throw error
        }

        console.log('User upserted:', upsertedUser.email)
        break
      }

      case 'user.deleted': {
        const userData = data as WebhookEvent['data']
        const primaryEmail = userData.email_addresses?.[0]?.email_address

        if (!primaryEmail) {
          throw new Error('No primary email found')
        }

        // Soft delete user
        const { error } = await supabaseClient
          .from('users')
          .update({ 
            is_active: false,
            // You might want to anonymize data here
          })
          .eq('email', primaryEmail)

        if (error) {
          console.error('Error deleting user:', error)
          throw error
        }

        console.log('User soft deleted:', primaryEmail)
        break
      }

      case 'organizationInvitation.accepted': {
        // Handle invitation acceptance
        console.log('Organization invitation accepted:', data)
        // You can add logic here to update user collaborations
        break
      }

      case 'organizationMembership.created':
      case 'organizationMembership.updated': {
        // Handle organization membership changes
        console.log('Organization membership changed:', data)
        // You can add logic here to sync organization roles
        break
      }

      default:
        console.log('Unhandled webhook type:', type)
    }

    return new Response(
      JSON.stringify({ message: 'Webhook processed successfully' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})