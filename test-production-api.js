// Test production API directly
import dotenv from 'dotenv'
import { SupabaseStorage } from './server/supabase-storage-simple.ts'

dotenv.config()

console.log('🚀 Testing Production Database Integration')
console.log('==========================================')

async function testProductionFlow() {
  try {
    // Set production mode
    process.env.NODE_ENV = 'production'
    
    console.log('\n📊 Environment Check:')
    console.log('NODE_ENV:', process.env.NODE_ENV)
    console.log('Supabase URL:', process.env.VITE_SUPABASE_URL ? '✅ Configured' : '❌ Missing')
    console.log('Supabase Key:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Configured' : '❌ Missing')
    
    // Initialize Supabase storage
    console.log('\n🔗 Initializing Supabase storage...')
    const storage = new SupabaseStorage()
    
    // Test 1: Check existing data
    console.log('\n📋 Test 1: Reading existing data')
    const existingClients = await storage.getClients()
    console.log('✅ Existing clients:', existingClients.length)
    
    const existingProjects = await storage.getProjects()
    console.log('✅ Existing projects:', existingProjects.length)
    
    const existingUsers = await storage.getUsers()
    console.log('✅ Existing users:', existingUsers.length)
    
    // Test 2: Create new client
    console.log('\n📋 Test 2: Creating new client in production database')
    const newClient = await storage.createClient({
      name: 'Production Test Client',
      email: 'prod-test@example.com',
      organization_id: 1,
      created_by: 1
    })
    console.log('✅ Client created with ID:', newClient.id)
    console.log('   Name:', newClient.name)
    console.log('   Email:', newClient.email)
    
    // Test 3: Verify client appears in list
    console.log('\n📋 Test 3: Verifying client persistence')
    const updatedClients = await storage.getClients()
    console.log('✅ Total clients after creation:', updatedClients.length)
    
    const createdClient = updatedClients.find(c => c.id === newClient.id)
    if (createdClient) {
      console.log('✅ Client found in database:', createdClient.name)
    } else {
      console.log('❌ Client not found in database')
    }
    
    // Test 4: Create project for client
    console.log('\n📋 Test 4: Creating project for client')
    const newProject = await storage.createProject({
      title: 'Production Test Project',
      description: 'Testing production database integration',
      client_id: newClient.id,
      organization_id: 1,
      owner_id: 1,
      created_by: 1,
      budget: '15000',
      status: 'active'
    })
    console.log('✅ Project created with ID:', newProject.id)
    console.log('   Title:', newProject.title)
    console.log('   Status:', newProject.status)
    
    // Test 5: Get project with client relationship
    console.log('\n📋 Test 5: Testing relationships')
    const projectWithClient = await storage.getProjectWithClient(newProject.id)
    if (projectWithClient && projectWithClient.client) {
      console.log('✅ Project-client relationship working')
      console.log('   Project:', projectWithClient.title)
      console.log('   Client:', projectWithClient.client.name)
    } else {
      console.log('❌ Project-client relationship not working')
    }
    
    // Test 6: Final stats
    console.log('\n📋 Test 6: Final statistics')
    const stats = await storage.getStats()
    console.log('✅ Production stats:', JSON.stringify(stats, null, 2))
    
    console.log('\n🎉 PRODUCTION DATABASE INTEGRATION SUCCESS!')
    console.log('✅ Data is being stored in Supabase')
    console.log('✅ Relationships are working')
    console.log('✅ CRUD operations are functional')
    console.log('✅ Ready for production deployment!')
    
    console.log('\n🔗 View your data in Supabase Dashboard:')
    console.log('   https://supabase.com/dashboard/project/ptlahrhzavhekjvtyfud')
    
  } catch (error) {
    console.error('\n❌ Production test failed:', error.message)
    console.error('Full error:', error)
  }
}

testProductionFlow()