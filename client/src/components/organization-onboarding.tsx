import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Building2, 
  Users, 
  Rocket, 
  CheckCircle2,
  Loader2,
  ArrowRight
} from "lucide-react";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth as useClerkAuth, useClerk } from "@clerk/clerk-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface OrganizationOnboardingProps {
  onComplete?: () => void;
}

export default function OrganizationOnboarding({ onComplete }: OrganizationOnboardingProps) {
  const { createOrganization, setActive, organizationList, isLoaded } = useOrganization();
  const { user } = useClerkAuth();
  const clerk = useClerk();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  // Auto-advance to organization creation form
  useEffect(() => {
    if (!isLoaded) return;
    
    // Log current state for debugging
    console.log('🔍 OrganizationOnboarding state:', {
      isLoaded,
      organizationList: organizationList?.map(org => org.organization?.name) || [],
      step,
      formDataName: formData.name
    });
    
    // Auto-advance to step 2 after a brief delay to show welcome screen
    const timer = setTimeout(() => {
      if (step === 1) {
        console.log('🏢 Auto-advancing to organization creation form');
        setStep(2);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [isLoaded, step]);

  // Generate default organization name from user data
  useEffect(() => {
    if (user && !formData.name) {
      const defaultName = user.fullName 
        ? `${user.fullName}'s Organization`
        : user.emailAddresses?.[0]?.emailAddress?.split('@')[0] + "'s Organization" || 'My Organization';
      
      setFormData(prev => ({ ...prev, name: defaultName }));
    }
  }, [user, formData.name]);

  const handleCreateOrganization = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Organization name is required",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    // Add timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      console.error('❌ Organization creation timed out after 30 seconds');
      setLoading(false);
      toast({
        title: "Timeout Error",
        description: "Organization creation took too long. Please try again.",
        variant: "destructive",
      });
    }, 30000);

    try {
      console.log('🏢 Creating organization:', formData.name);
      console.log('🔍 Current user:', user?.id);
      console.log('🔍 Available createOrganization function:', typeof createOrganization);
      
      const orgSlug = formData.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
      console.log('🔍 Generated slug:', orgSlug);
      
      // Try creating organization with different parameter combinations
      let newOrg;
      try {
        // First attempt: with slug
        console.log('🔄 Attempting to create organization with slug...');
        newOrg = await createOrganization({
          name: formData.name,
          slug: orgSlug
        });
      } catch (slugError) {
        console.warn('⚠️ Failed with slug, trying without:', slugError);
        try {
          // Second attempt: without slug
          newOrg = await createOrganization({
            name: formData.name
          });
        } catch (nameError) {
          console.warn('⚠️ Failed with name only, trying minimal params:', nameError);
          // Third attempt: minimal params
          newOrg = await createOrganization(formData.name);
        }
      }
      
      console.log('✅ Organization created:', newOrg);
      
      if (!newOrg) {
        console.warn('⚠️ All createOrganization attempts failed, trying direct Clerk API...');
        
        // Final attempt: Use Clerk SDK directly
        try {
          newOrg = await clerk.createOrganization({
            name: formData.name,
          });
          console.log('✅ Organization created via direct Clerk API:', newOrg);
        } catch (clerkError) {
          console.error('❌ Direct Clerk API also failed:', clerkError);
          throw new Error(`Failed to create organization: ${clerkError.message}`);
        }
        
        if (!newOrg) {
          throw new Error('Failed to create organization - all methods exhausted');
        }
      }

      console.log('🔄 Setting organization as active:', newOrg.id);
      // Set the new organization as active
      await setActive({ organization: newOrg.id });
      
      console.log('🔄 Updating organization metadata...');
      // Update organization metadata with description and trial info
      await newOrg.update({
        publicMetadata: {
          description: formData.description,
          plan: 'pro_trial',
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date().toISOString()
        }
      });

      console.log('✅ Organization setup complete!');
      setStep(3); // Success step
      
      toast({
        title: "Success!",
        description: "Your organization has been created successfully",
      });

      // Auto-redirect after success
      setTimeout(() => {
        if (onComplete) {
          onComplete();
        } else {
          setLocation('/');
        }
      }, 2000);

    } catch (error) {
      console.error('❌ Error creating organization:', error);
      console.error('❌ Error details:', {
        message: error?.message || 'Unknown error',
        stack: error?.stack || 'No stack trace',
        name: error?.name || 'Unknown error type',
        toString: error?.toString() || 'Cannot convert to string'
      });
      
      toast({
        title: "Error",
        description: `Failed to create organization: ${error?.message || 'Unknown error occurred'}`,
        variant: "destructive",
      });
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
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
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
              {step === 1 && <Building2 className="w-8 h-8 text-white" />}
              {step === 2 && <Users className="w-8 h-8 text-white" />}
              {step === 3 && <CheckCircle2 className="w-8 h-8 text-white" />}
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              {step === 1 && "Welcome to FunnelHQ!"}
              {step === 2 && "Organization Details"}
              {step === 3 && "All Set!"}
            </h1>
            <p className="text-gray-400">
              {step === 1 && "Let's set up your organization to get started"}
              {step === 2 && "Provide some details about your organization"}
              {step === 3 && "Your organization has been created successfully"}
            </p>
          </div>

          {/* Step 1: Welcome */}
          {step === 1 && (
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
                onClick={() => setStep(2)}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              >
                Get Started
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </motion.div>
          )}

          {/* Step 2: Organization Setup */}
          {step === 2 && (
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
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Acme Inc."
                    className="bg-white/5 border-white/20 text-white placeholder:text-gray-400"
                    disabled={loading}
                  />
                </div>

                <div>
                  <Label htmlFor="orgDescription" className="text-white">
                    Description (Optional)
                  </Label>
                  <Textarea
                    id="orgDescription"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="What does your organization do?"
                    className="bg-white/5 border-white/20 text-white placeholder:text-gray-400"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="flex space-x-3">
                <Button 
                  variant="ghost"
                  onClick={() => setStep(1)}
                  className="text-gray-400 hover:text-white"
                  disabled={loading}
                >
                  Back
                </Button>
                <Button 
                  onClick={handleCreateOrganization}
                  disabled={loading || !formData.name.trim()}
                  className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Organization'
                  )}
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Success */}
          {step === 3 && (
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
                  Welcome to {formData.name}!
                </h3>
                <p className="text-gray-400">
                  Your organization is ready. You'll be redirected to your dashboard shortly.
                </p>
              </div>

              <div className="text-sm text-gray-500">
                Redirecting in 2 seconds...
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}