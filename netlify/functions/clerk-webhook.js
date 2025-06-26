const { Webhook } = require('svix');

exports.handler = async (event, context) => {
  console.log('🔵 Webhook received:', {
    method: event.httpMethod,
    headers: Object.keys(event.headers),
    hasSecret: !!process.env.CLERK_WEBHOOK_SECRET,
    secretPrefix: process.env.CLERK_WEBHOOK_SECRET?.substring(0, 6) + '...',
    bodyType: typeof event.body,
    bodyLength: event.body?.length
  });

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  
  if (!WEBHOOK_SECRET) {
    console.error('❌ CLERK_WEBHOOK_SECRET not configured');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Webhook secret not configured' })
    };
  }

  const headers = event.headers;
  const payload = event.body;

  // Get Svix headers
  const svix_id = headers['svix-id'];
  const svix_timestamp = headers['svix-timestamp'];
  const svix_signature = headers['svix-signature'];

  console.log('🔍 Webhook headers:', {
    'svix-id': svix_id ? 'present' : 'missing',
    'svix-timestamp': svix_timestamp ? 'present' : 'missing', 
    'svix-signature': svix_signature ? svix_signature.substring(0, 20) + '...' : 'missing'
  });

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing svix headers' })
    };
  }

  // Create a new Svix instance with your secret
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt;

  // Attempt to verify the incoming webhook
  try {
    evt = wh.verify(payload, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    });
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid signature' })
    };
  }

  // Handle the webhook
  const { type, data } = evt;
  
  console.log(`Webhook received: ${type}`);
  console.log('Data:', JSON.stringify(data, null, 2));

  // Handle different event types
  try {
    switch (type) {
      case 'user.created':
        await handleUserCreated(data);
        break;
      
      case 'user.updated':
        console.log('User updated:', data.id);
        // Add your user update logic here
        break;
      
      case 'user.deleted':
        console.log('User deleted:', data.id);
        // Add your user deletion logic here
        break;
      
      case 'organization.created':
        await handleOrganizationCreated(data);
        break;
      
      default:
        console.log(`Unhandled event type: ${type}`);
    }
  } catch (error) {
    console.error(`Error handling webhook ${type}:`, error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error processing webhook' })
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ received: true })
  };
};

// Handle user.created event
async function handleUserCreated(data) {
  const { id, email_addresses, first_name, last_name } = data;
  
  console.log(`🔄 Processing user creation: ${id}`);
  
  const email = email_addresses?.[0]?.email_address;
  let userRole = 'admin'; // Default to admin
  
  if (email) {
    try {
      // Check if this email exists as a client
      const clientCheckResponse = await fetch(`${process.env.API_BASE_URL || 'https://your-backend.netlify.app'}/api/supabase/clients/by-email/${encodeURIComponent(email)}`);
      
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
  
  // Create user record in Supabase
  try {
    const userData = {
      email: email_addresses?.[0]?.email_address,
      name: `${first_name || ''} ${last_name || ''}`.trim(),
      clerkUserId: id,
      subscriptionPlan: 'pro_trial', // Start with pro trial
      trialStartDate: new Date().toISOString() // Set trial start date to now
    };

    console.log('🔄 Creating user in Supabase:', userData);

    // Call our internal API to create the user (using relative path for same Netlify site)
    const baseUrl = process.env.URL || 'https://localhost:8888';
    const response = await fetch(`${baseUrl}/.netlify/functions/supabase-users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      throw new Error(`Failed to create user in Supabase: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ Successfully synced user to Supabase:', result);
  } catch (error) {
    console.error('❌ Error syncing user to Supabase:', error);
    // Don't throw - we don't want to fail the webhook for this
  }
}

// Handle organization.created event
async function handleOrganizationCreated(data) {
  const { id, name, created_by, slug } = data;
  
  console.log(`🔄 Processing organization creation: ${id}`);
  
  // Create organization record in Supabase
  try {
    const orgData = {
      clerkOrgId: id,
      name,
      slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
      createdBy: created_by,
      plan: 'pro_trial'
    };

    console.log('🔄 Creating organization in Supabase:', orgData);

    const response = await fetch(`${process.env.API_BASE_URL || 'https://your-backend.netlify.app'}/api/supabase/organizations`, {
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
    console.log('✅ Successfully synced organization to Supabase:', result);
  } catch (error) {
    console.error('❌ Error syncing organization to Supabase:', error);
  }
}