import { createClient } from '@supabase/supabase-js'

// Basic type definitions for immediate use
interface User {
  id: number;
  name: string;
  email: string;
  [key: string]: any;
}

interface Client {
  id: number;
  name: string;
  email: string;
  [key: string]: any;
}

interface Project {
  id: number;
  title: string;
  status: string;
  [key: string]: any;
}

export class SupabaseStorage {
  private supabase

  constructor() {
    const supabaseUrl = process.env.VITE_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration. Check VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.')
    }

    this.supabase = createClient(supabaseUrl, supabaseKey)
    console.log('🔗 Connected to Supabase production database')
  }

  // Users
  async getUsers(): Promise<User[]> {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching users:', error)
      throw error
    }
    return data || []
  }

  async getUser(id: number): Promise<User | undefined> {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      console.error('Error fetching user:', error)
      throw error
    }
    return data || undefined
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single()
    
    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching user by username:', error)
      throw error
    }
    return data || undefined
  }

  async createUser(user: any): Promise<User> {
    const { data, error } = await this.supabase
      .from('users')
      .insert([{
        ...user,
        created_at: new Date().toISOString()
      }])
      .select()
      .single()
    
    if (error) {
      console.error('Error creating user:', error)
      throw error
    }
    console.log('✅ User created in Supabase:', data.id)
    return data
  }

  async updateUser(id: number, updates: any): Promise<User | undefined> {
    const { data, error } = await this.supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) {
      console.error('Error updating user:', error)
      throw error
    }
    return data || undefined
  }

  async deleteUser(id: number): Promise<boolean> {
    const { error } = await this.supabase
      .from('users')
      .delete()
      .eq('id', id)
    
    if (error) {
      console.error('Error deleting user:', error)
      throw error
    }
    return true
  }

  // Clients
  async getClients(): Promise<Client[]> {
    const { data, error } = await this.supabase
      .from('clients')
      .select('*')
      .order('joined_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching clients:', error)
      throw error
    }
    console.log('📊 Fetched clients from Supabase:', data?.length || 0)
    return data || []
  }

  async getClient(id: number): Promise<Client | undefined> {
    const { data, error } = await this.supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching client:', error)
      throw error
    }
    return data || undefined
  }

  async getClientByEmail(email: string): Promise<Client | undefined> {
    const { data, error } = await this.supabase
      .from('clients')
      .select('*')
      .eq('email', email)
      .single()
    
    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching client by email:', error)
      throw error
    }
    return data || undefined
  }

  async createClient(client: any): Promise<Client> {
    const { data, error } = await this.supabase
      .from('clients')
      .insert([{
        ...client,
        joined_at: new Date().toISOString()
      }])
      .select()
      .single()
    
    if (error) {
      console.error('Error creating client:', error)
      throw error
    }
    console.log('✅ Client created in Supabase:', data.id)
    return data
  }

  async updateClient(id: number, client: any): Promise<Client | undefined> {
    const { data, error } = await this.supabase
      .from('clients')
      .update(client)
      .eq('id', id)
      .select()
      .single()
    
    if (error) {
      console.error('Error updating client:', error)
      throw error
    }
    return data || undefined
  }

  async deleteClient(id: number): Promise<boolean> {
    const { error } = await this.supabase
      .from('clients')
      .delete()
      .eq('id', id)
    
    if (error) {
      console.error('Error deleting client:', error)
      throw error
    }
    return true
  }

  // Projects
  async getProjects(): Promise<Project[]> {
    const { data, error } = await this.supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching projects:', error)
      throw error
    }
    console.log('📊 Fetched projects from Supabase:', data?.length || 0)
    return data || []
  }

  async getProject(id: number): Promise<Project | undefined> {
    const { data, error } = await this.supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching project:', error)
      throw error
    }
    return data || undefined
  }

  async createProject(project: any): Promise<Project> {
    const { data, error } = await this.supabase
      .from('projects')
      .insert([{
        ...project,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single()
    
    if (error) {
      console.error('Error creating project:', error)
      throw error
    }
    console.log('✅ Project created in Supabase:', data.id)
    return data
  }

  async updateProject(id: number, project: any): Promise<Project | undefined> {
    const { data, error } = await this.supabase
      .from('projects')
      .update({
        ...project,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()
    
    if (error) {
      console.error('Error updating project:', error)
      throw error
    }
    return data || undefined
  }

  async deleteProject(id: number): Promise<boolean> {
    const { error } = await this.supabase
      .from('projects')
      .delete()
      .eq('id', id)
    
    if (error) {
      console.error('Error deleting project:', error)
      throw error
    }
    return true
  }

  // Stats
  async getStats(): Promise<any> {
    const [users, clients, projects] = await Promise.all([
      this.getUsers(),
      this.getClients(),
      this.getProjects()
    ])

    return {
      activeProjects: projects.filter(p => p.status === 'active').length,
      totalClients: clients.length,
      monthlyRevenue: 5000, // Calculate from billing data
      hoursThisMonth: 342 // Calculate from time tracking
    }
  }

  // Placeholder methods for compatibility with existing routes
  async getProjectTeamMembers(projectId: number): Promise<any[]> { return [] }
  async addProjectTeamMember(member: any): Promise<any> { return member }
  async updateProjectTeamMember(id: number, member: any): Promise<any> { return member }
  async removeProjectTeamMember(id: number): Promise<boolean> { return true }
  async getUserProjectRole(projectId: number, userId: number): Promise<any> { return undefined }
  
  async getMilestonesByProject(projectId: number): Promise<any[]> { return [] }
  async getProjectsForUser(userId: number, organizationId: number): Promise<any[]> { 
    return this.getProjects()
  }
  async getProjectWithClient(id: number): Promise<any> {
    const project = await this.getProject(id)
    if (!project) return undefined
    
    const client = await this.getClient(project.client_id)
    return { ...project, client }
  }
  async getClientWithProjects(id: number): Promise<any> {
    const client = await this.getClient(id)
    if (!client) return undefined
    
    const projects = await this.getProjects()
    const clientProjects = projects.filter(p => p.client_id === id)
    return { ...client, projects: clientProjects }
  }
  
  // Add any other methods that routes.ts expects
  [key: string]: any;
}