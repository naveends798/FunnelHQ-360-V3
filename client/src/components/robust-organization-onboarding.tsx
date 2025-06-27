import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { 
  Building2, 
  Users, 
  Rocket, 
  CheckCircle2,
  Loader2,
  ArrowRight,
  AlertCircle,
  RefreshCw
} from "lucide-react";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth as useClerkAuth, useClerk } from "@clerk/clerk-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface RobustOrganizationOnboardingProps {
  onComplete?: () => void;
}

type OnboardingStep = 'welcome' | 'form' | 'creating' | 'success' | 'error';

interface OnboardingState {
  step: OnboardingStep;
  formData: {
    name: string;
    description: string;
  };
  error: string | null;
  progress: number;
  organizationCreated: boolean;
}

export default function RobustOrganizationOnboarding({ onComplete }: RobustOrganizationOnboardingProps) {
  const { createOrganization, setActive, organizationList, isLoaded } = useOrganization();
  const { user } = useClerkAuth();
  const clerk = useClerk();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);

  // Persistent state that doesn't get reset
  const [state, setState] = useState<OnboardingState>(() => {
    // Always start fresh - don't check localStorage for completion
    // This ensures the modal always shows until manually dismissed
    return {
      step: 'welcome',
      formData: { name: '', description: '' },
      error: null,
      progress: 0,
      organizationCreated: false
    };
  });

  // Generate default organization name from user data
  useEffect(() => {
    if (user && !state.formData.name && state.step === 'form') {
      const defaultName = user.fullName 
        ? `${user.fullName}'s Organization`
        : user.emailAddresses?.[0]?.emailAddress?.split('@')[0] + "'s Organization" || 'My Organization';
      
      setState(prev => ({
        ...prev,
        formData: { ...prev.formData, name: defaultName }
      }));
    }
  }, [user, state.step, state.formData.name]);

  // Don't auto-complete - let admin manually complete onboarding even if organizations exist
  // This ensures the modal stays visible until manually dismissed

  const updateStep = (step: OnboardingStep, additionalData: Partial<OnboardingState> = {}) => {
    setState(prev => ({ ...prev, step, ...additionalData }));
  };

  const updateFormData = (field: string, value: string) => {
    setState(prev => ({
      ...prev,
      formData: { ...prev.formData, [field]: value }
    }));
  };

  const handleStartOnboarding = () => {
    console.log('🚀 Starting organization onboarding');
    updateStep('form', { progress: 25 });
  };

  const handleCreateOrganization = async () => {
    if (!state.formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Organization name is required",
        variant: "destructive",
      });
      return;
    }

    console.log('🏢 Starting organization creation process');
    setLoading(true);
    updateStep('creating', { progress: 50, error: null });

    // Create timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.error('❌ Organization creation timed out');
      setLoading(false);
      updateStep('error', { 
        error: 'Organization creation timed out. Please try again.',
        progress: 25 
      });
    }, 30000);

    try {
      console.log('🔄 Step 1: Attempting to create Clerk organization');
      updateStep('creating', { progress: 60 });

      let newOrg = null;
      let creationMethod = '';

      // Method 1: Try with useOrganization hook
      try {
        console.log('🔄 Method 1: Using createOrganization hook');
        newOrg = await createOrganization({
          name: state.formData.name,
        });
        creationMethod = 'hook';
        console.log('✅ Method 1 successful:', newOrg);
      } catch (hookError) {
        console.warn('⚠️ Method 1 failed:', hookError);
        
        // Method 2: Try with Clerk SDK directly
        try {
          console.log('🔄 Method 2: Using Clerk SDK directly');
          newOrg = await clerk.createOrganization({
            name: state.formData.name,
          });
          creationMethod = 'sdk';
          console.log('✅ Method 2 successful:', newOrg);
        } catch (sdkError) {
          console.error('❌ Method 2 failed:', sdkError);
          throw new Error(`All organization creation methods failed. Hook error: ${hookError.message}, SDK error: ${sdkError.message}`);
        }
      }

      if (!newOrg) {
        throw new Error('Organization creation returned null/undefined');
      }

      console.log('🔄 Step 2: Setting organization as active');
      updateStep('creating', { progress: 75 });

      await setActive({ organization: newOrg.id });
      console.log('✅ Organization set as active');

      console.log('🔄 Step 3: Updating organization metadata');
      updateStep('creating', { progress: 85 });

      // Update organization metadata
      if (newOrg.update) {
        await newOrg.update({
          publicMetadata: {
            description: state.formData.description,
            plan: 'pro_trial',
            trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
            createdAt: new Date().toISOString(),
            createdBy: user?.id,
            creationMethod
          }
        });
        console.log('✅ Organization metadata updated');
      }

      console.log('🔄 Step 4: Creating organization in Supabase database');
      updateStep('creating', { progress: 90 });

      // Create organization record in Supabase database directly
      try {
        const orgData = {
          clerkOrgId: newOrg.id,
          name: state.formData.name,
          slug: newOrg.slug || state.formData.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-'),
          description: state.formData.description,
          createdBy: user?.id,
          plan: 'pro_trial'
        };

        const response = await fetch('/api/supabase/organizations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(orgData)
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.warn('⚠️ Failed to create organization in Supabase, will rely on webhook:', errorText);
          // Don't throw error - webhook will handle this as backup
        } else {
          const result = await response.json();
          console.log('✅ Organization created in Supabase:', result.organization?.name);
          
          // Create membership in Supabase
          if (result.organization?.id) {
            const membershipData = {
              organizationId: result.organization.id,
              clerkUserId: user?.id,
              role: 'admin'
            };

            const membershipResponse = await fetch('/api/supabase/organizations/memberships', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(membershipData)
            });

            if (membershipResponse.ok) {
              console.log('✅ Organization membership created in Supabase');
            } else {
              console.warn('⚠️ Failed to create membership in Supabase, will rely on webhook');
            }
          }
        }
      } catch (supabaseError) {
        console.warn('⚠️ Error creating organization in Supabase, webhook will handle sync:', supabaseError);
        // Don't fail the entire process - webhook will handle this
      }

      // Mark as completed
      localStorage.setItem('onboarding_completed', 'true');
      localStorage.setItem('organization_created', JSON.stringify({
        id: newOrg.id,
        name: newOrg.name,
        createdAt: new Date().toISOString(),
        method: creationMethod
      }));

      console.log('🎉 Organization creation complete!');
      updateStep('success', { progress: 100, organizationCreated: true });

      toast({
        title: "Success!",
        description: `Organization "${state.formData.name}" created successfully using ${creationMethod}`,
      });

      // Manual redirect only - user must click to proceed
      // No auto-redirect to keep modal persistent

    } catch (error) {
      console.error('❌ Organization creation failed:', error);
      const errorMessage = error?.message || 'Unknown error occurred';
      
      updateStep('error', { 
        error: errorMessage,
        progress: 25 
      });
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  const handleRetry = () => {
    console.log('🔄 Retrying organization creation');
    setState(prev => ({ ...prev, error: null }));
    handleCreateOrganization();
  };

  const handleSkipAndGoToDashboard = () => {
    console.log('⏩ Skipping organization creation');
    localStorage.setItem('onboarding_skipped', 'true');
    if (onComplete) {
      onComplete();
    } else {
      setLocation('/');
    }
  };

  // Add timeout for testing scenarios
  useEffect(() => {
    if (!isLoaded) {
      const loadingTimeout = setTimeout(() => {
        console.log('⏰ Loading timeout reached, proceeding with onboarding');
        // Force proceed if loading takes too long (useful for testing)
        setState(prev => ({ ...prev, step: 'welcome', progress: 0 }));
      }, 5000);
      
      return () => clearTimeout(loadingTimeout);
    }
  }, [isLoaded]);

  // Prevent the component from disappearing by maintaining state
  if (!isLoaded && state.step !== 'welcome') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading organization data...</p>
          <p className="text-gray-500 text-sm mt-2">This may take a moment in test environments</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-8"
        >
          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-400 mb-2">
              <span>Setup Progress</span>
              <span>{state.progress}%</span>
            </div>
            <Progress value={state.progress} className="h-2" />
          </div>

          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
              {state.step === 'welcome' && <Building2 className="w-8 h-8 text-white" />}
              {state.step === 'form' && <Users className="w-8 h-8 text-white" />}
              {state.step === 'creating' && <Loader2 className="w-8 h-8 text-white animate-spin" />}
              {state.step === 'success' && <CheckCircle2 className="w-8 h-8 text-white" />}
              {state.step === 'error' && <AlertCircle className="w-8 h-8 text-white" />}
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              {state.step === 'welcome' && "Welcome to FunnelHQ!"}
              {state.step === 'form' && "Create Your Organization"}
              {state.step === 'creating' && "Creating Organization..."}
              {state.step === 'success' && "All Set!"}
              {state.step === 'error' && "Something Went Wrong"}
            </h1>
            <p className="text-gray-400">
              {state.step === 'welcome' && "Let's set up your organization to get started"}
              {state.step === 'form' && "Provide details about your organization"}
              {state.step === 'creating' && "Please wait while we set up your workspace"}
              {state.step === 'success' && "Your organization has been created successfully"}
              {state.step === 'error' && "Don't worry, we can try again"}
            </p>
          </div>

          {/* Step: Welcome */}
          {state.step === 'welcome' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              <div className="space-y-4">
                <div className="flex items-center space-x-3 text-gray-300">
                  <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <span>Create your organization</span>
                </div>
                <div className="flex items-center space-x-3 text-gray-300">
                  <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                  <span>Invite team members</span>
                </div>
                <div className="flex items-center space-x-3 text-gray-300">
                  <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center">
                    <Rocket className="w-4 h-4" />
                  </div>
                  <span>Start your 14-day Pro trial</span>
                </div>
              </div>
              
              <Button 
                onClick={handleStartOnboarding}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              >
                Get Started
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </motion.div>
          )}

          {/* Step: Form */}
          {state.step === 'form' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              <div className="space-y-4">
                <div>
                  <Label htmlFor="orgName" className="text-white">
                    Organization Name *
                  </Label>
                  <Input
                    id="orgName"
                    value={state.formData.name}
                    onChange={(e) => updateFormData('name', e.target.value)}
                    placeholder="Acme Inc."
                    className="bg-white/5 border-white/20 text-white placeholder:text-gray-400"
                  />
                </div>

                <div>
                  <Label htmlFor="orgDescription" className="text-white">
                    Description (Optional)
                  </Label>
                  <Textarea
                    id="orgDescription"
                    value={state.formData.description}
                    onChange={(e) => updateFormData('description', e.target.value)}
                    placeholder="What does your organization do?"
                    className="bg-white/5 border-white/20 text-white placeholder:text-gray-400"
                  />
                </div>
              </div>

              <div className="flex space-x-3">
                <Button 
                  variant="ghost"
                  onClick={() => updateStep('welcome', { progress: 0 })}
                  className="text-gray-400 hover:text-white"
                >
                  Back
                </Button>
                <Button 
                  onClick={handleCreateOrganization}
                  disabled={loading || !state.formData.name.trim()}
                  className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                >
                  Create Organization
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step: Creating */}
          {state.step === 'creating' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center space-y-6"
            >
              <div className="space-y-4">
                <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto">
                  <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-white">
                    Creating "{state.formData.name}"
                  </h3>
                  <p className="text-gray-400">
                    Please wait while we set up your organization in Clerk...
                  </p>
                </div>
              </div>

              <div className="text-sm text-gray-500">
                This may take up to 30 seconds
              </div>
            </motion.div>
          )}

          {/* Step: Success */}
          {state.step === 'success' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-6"
            >
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-green-400" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-white">
                  Welcome to {state.formData.name}!
                </h3>
                <p className="text-gray-400">
                  Your organization has been successfully created and is ready to use.
                </p>
              </div>

              <Button 
                onClick={() => {
                  if (onComplete) {
                    onComplete();
                  } else {
                    setLocation('/');
                  }
                }}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
              >
                Continue to Dashboard
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </motion.div>
          )}

          {/* Step: Error */}
          {state.step === 'error' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
                  <AlertCircle className="w-8 h-8 text-red-400" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-white">
                    Organization Creation Failed
                  </h3>
                  <p className="text-gray-400 text-sm">
                    {state.error}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <Button 
                  onClick={handleRetry}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
                
                <Button 
                  variant="ghost"
                  onClick={handleSkipAndGoToDashboard}
                  className="w-full text-gray-400 hover:text-white"
                >
                  Skip for now and go to dashboard
                </Button>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}