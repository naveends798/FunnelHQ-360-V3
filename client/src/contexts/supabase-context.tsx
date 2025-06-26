import React, { createContext, useContext, useEffect, useState } from 'react'
import { useAuth, useUser } from '@clerk/clerk-react'
import { useSupabase, createAuthenticatedSupabaseClient } from '@/lib/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase'

interface SupabaseContextType {
  supabase: SupabaseClient<Database> | null
  isInitialized: boolean
  error: string | null
}

const SupabaseContext = createContext<SupabaseContextType>({
  supabase: null,
  isInitialized: false,
  error: null
})

export const useSupabaseContext = () => {
  const context = useContext(SupabaseContext)
  if (!context) {
    throw new Error('useSupabaseContext must be used within a SupabaseProvider')
  }
  return context
}

interface SupabaseProviderProps {
  children: React.ReactNode
}

export const SupabaseProvider: React.FC<SupabaseProviderProps> = ({ children }) => {
  const { isSignedIn, getToken } = useAuth()
  const { user } = useUser()
  const [supabaseClient, setSupabaseClient] = useState<SupabaseClient<Database> | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const initializeSupabase = async () => {
      if (!isSignedIn || !user) {
        setSupabaseClient(null)
        setIsInitialized(false)
        return
      }

      try {
        // Get the JWT token from Clerk with the 'supabase' template
        const token = await getToken({ template: 'supabase' })
        
        if (!token) {
          throw new Error('Failed to get authentication token')
        }

        // Create authenticated Supabase client
        const authenticatedClient = createAuthenticatedSupabaseClient(token)
        
        // Verify the connection by checking if we can access the user's profile
        const { data, error: queryError } = await authenticatedClient
          .from('users')
          .select('id')
          .eq('email', user.primaryEmailAddress?.emailAddress)
          .limit(1)

        if (queryError && queryError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
          console.warn('Supabase query test failed:', queryError)
          // Don't throw here - user might not exist in DB yet
        }

        setSupabaseClient(authenticatedClient)
        setError(null)
        setIsInitialized(true)

        console.log('✅ Supabase client initialized successfully')
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize Supabase'
        console.error('❌ Failed to initialize Supabase:', errorMessage)
        setError(errorMessage)
        setSupabaseClient(null)
        setIsInitialized(false)
      }
    }

    initializeSupabase()
  }, [isSignedIn, user, getToken])

  const value: SupabaseContextType = {
    supabase: supabaseClient,
    isInitialized,
    error
  }

  return (
    <SupabaseContext.Provider value={value}>
      {children}
    </SupabaseContext.Provider>
  )
}

// Hook to ensure user exists in Supabase database
export const useEnsureUserInDatabase = () => {
  const { user } = useUser()
  const { supabase, isInitialized } = useSupabaseContext()

  useEffect(() => {
    const ensureUserExists = async () => {
      if (!isInitialized || !supabase || !user?.primaryEmailAddress?.emailAddress) {
        return
      }

      try {
        // Check if user exists
        const { data: existingUser, error: fetchError } = await supabase
          .from('users')
          .select('id')
          .eq('email', user.primaryEmailAddress.emailAddress)
          .single()

        if (fetchError && fetchError.code === 'PGRST116') {
          // User doesn't exist, create them
          console.log('👤 Creating user in Supabase database...')
          
          const userData = {
            email: user.primaryEmailAddress.emailAddress,
            name: user.fullName || user.firstName || 'User',
            avatar: user.imageUrl,
            // Extract metadata from Clerk
            company_name: user.publicMetadata?.companyName as string,
            company_role: user.publicMetadata?.companyRole as string,
            industry: user.publicMetadata?.industry as string,
            company_size: user.publicMetadata?.companySize as string,
            specialization: user.publicMetadata?.specialization as string,
            subscription_plan: user.publicMetadata?.subscriptionPlan as string || 'solo',
            subscription_status: user.publicMetadata?.subscriptionStatus as string || 'active',
          }

          const { data, error: insertError } = await supabase
            .from('users')
            .insert([userData])
            .select()
            .single()

          if (insertError) {
            console.error('❌ Failed to create user in database:', insertError)
          } else {
            console.log('✅ User created successfully in database:', data)
          }
        } else if (fetchError) {
          console.error('❌ Error checking user existence:', fetchError)
        } else {
          console.log('✅ User already exists in database')
        }
      } catch (error) {
        console.error('❌ Error ensuring user exists:', error)
      }
    }

    ensureUserExists()
  }, [isInitialized, supabase, user])
}