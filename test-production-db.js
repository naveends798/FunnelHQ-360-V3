import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('🔗 Testing Supabase production database connection...')
console.log('URL:', supabaseUrl)
console.log('Key length:', supabaseKey ? supabaseKey.length : 'undefined')

const supabase = createClient(supabaseUrl, supabaseKey)

// Test connection by trying to fetch from a table
async function testConnection() {
  try {
    console.log('\n📊 Testing database connection...')
    
    // Test if users table exists
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(5)
    
    if (usersError) {
      console.error('❌ Users table error:', usersError.message)
      
      // Try to see what tables exist
      const { data: tables, error: tablesError } = await supabase
        .rpc('get_table_names')
        .catch(() => null)
      
      console.log('Available tables might not include users yet - need to run migrations')
    } else {
      console.log('✅ Users table accessible!')
      console.log('Current users in production DB:', users?.length || 0)
      if (users?.length > 0) {
        console.log('Sample user:', users[0])
      }
    }
    
    // Test clients table
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('*')
      .limit(5)
    
    if (clientsError) {
      console.error('❌ Clients table error:', clientsError.message)
    } else {
      console.log('✅ Clients table accessible!')
      console.log('Current clients in production DB:', clients?.length || 0)
    }
    
    // Test projects table
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('*')
      .limit(5)
    
    if (projectsError) {
      console.error('❌ Projects table error:', projectsError.message)
    } else {
      console.log('✅ Projects table accessible!')
      console.log('Current projects in production DB:', projects?.length || 0)
    }
    
  } catch (error) {
    console.error('❌ Connection test failed:', error.message)
    console.error('Full error:', error)
  }
}

testConnection()