import { createClient } from '@supabase/supabase-js'
import { useAuth } from '@clerk/clerk-react'

// Supabase client configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Create the base Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Helper function to create authenticated Supabase client
export const createAuthenticatedSupabaseClient = (clerkToken: string) => {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${clerkToken}`,
      },
    },
  })
}

// Custom hook to get authenticated Supabase client
export const useSupabase = () => {
  const { getToken } = useAuth()

  const getAuthenticatedClient = async () => {
    try {
      // Get the default JWT token from Clerk
      const token = await getToken()
      
      if (!token) {
        throw new Error('No authentication token available')
      }

      return createAuthenticatedSupabaseClient(token)
    } catch (error) {
      console.error('Error creating authenticated Supabase client:', error)
      throw error
    }
  }

  return {
    supabase: supabase, // Unauthenticated client for public operations
    getAuthenticatedClient,
  }
}

// Database types (will be auto-generated in a real setup)
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: number
          supabase_id: string | null
          username: string | null
          email: string
          name: string
          avatar: string | null
          specialization: string | null
          company_name: string | null
          company_role: string | null
          industry: string | null
          company_size: string | null
          subscription_plan: string
          subscription_status: string
          max_projects: number
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          created_at: string
          last_login_at: string | null
          is_active: boolean
        }
        Insert: {
          id?: number
          supabase_id?: string | null
          username?: string | null
          email: string
          name: string
          avatar?: string | null
          specialization?: string | null
          company_name?: string | null
          company_role?: string | null
          industry?: string | null
          company_size?: string | null
          subscription_plan?: string
          subscription_status?: string
          max_projects?: number
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          created_at?: string
          last_login_at?: string | null
          is_active?: boolean
        }
        Update: {
          id?: number
          supabase_id?: string | null
          username?: string | null
          email?: string
          name?: string
          avatar?: string | null
          specialization?: string | null
          company_name?: string | null
          company_role?: string | null
          industry?: string | null
          company_size?: string | null
          subscription_plan?: string
          subscription_status?: string
          max_projects?: number
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          created_at?: string
          last_login_at?: string | null
          is_active?: boolean
        }
      }
      projects: {
        Row: {
          id: number
          title: string
          description: string | null
          client_id: number
          owner_id: number
          status: string
          progress: number
          budget: number
          budget_used: number
          start_date: string
          end_date: string | null
          image: string | null
          priority: string
          team_members: string[]
          tags: string[]
          created_by: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          title: string
          description?: string | null
          client_id: number
          owner_id: number
          status?: string
          progress?: number
          budget: number
          budget_used?: number
          start_date?: string
          end_date?: string | null
          image?: string | null
          priority?: string
          team_members?: string[]
          tags?: string[]
          created_by: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          title?: string
          description?: string | null
          client_id?: number
          owner_id?: number
          status?: string
          progress?: number
          budget?: number
          budget_used?: number
          start_date?: string
          end_date?: string | null
          image?: string | null
          priority?: string
          team_members?: string[]
          tags?: string[]
          created_by?: number
          created_at?: string
          updated_at?: string
        }
      }
      // Add other table types as needed
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}