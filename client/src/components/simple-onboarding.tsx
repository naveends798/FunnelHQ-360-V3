import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Building2, 
  CheckCircle2,
  Loader2,
  ArrowRight
} from "lucide-react";
import { useAuth as useClerkAuth } from "@clerk/clerk-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface SimpleOnboardingProps {
  onComplete?: () => void;
}

export default function SimpleOnboarding({ onComplete }: SimpleOnboardingProps) {
  const { user } = useClerkAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  // Generate default organization name from user data
  useState(() => {
    if (user && !formData.name) {
      const defaultName = user.fullName 
        ? `${user.fullName}'s Organization`
        : user.emailAddresses?.[0]?.emailAddress?.split('@')[0] + "'s Organization" || 'My Organization';
      
      setFormData(prev => ({ ...prev, name: defaultName }));
    }
  });

  const handleSkipForNow = async () => {
    try {
      console.log('🔄 Skipping organization creation for now...');
      
      // Just update user metadata to indicate they've completed onboarding
      await user?.update({
        publicMetadata: {
          ...user.publicMetadata,
          onboardingCompleted: true,
          organizationName: formData.name,
          organizationDescription: formData.description
        }
      });

      toast({
        title: "Setup Complete!",
        description: "You can create clients and projects now. Organization features will be added later.",
      });

      // Redirect to dashboard
      if (onComplete) {
        onComplete();
      } else {
        setLocation('/');
      }
    } catch (error) {
      console.error('Error updating user metadata:', error);
      toast({
        title: "Warning",
        description: "Proceeding to dashboard anyway...",
        variant: "destructive",
      });
      
      if (onComplete) {
        onComplete();
      } else {
        setLocation('/');
      }
    }
  };

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

    try {
      console.log('🏢 Attempting simple organization setup...');
      
      // For now, just save the organization info to user metadata
      // This bypasses complex Clerk organization creation
      await user?.update({
        publicMetadata: {
          ...user.publicMetadata,
          onboardingCompleted: true,
          organizationName: formData.name,
          organizationDescription: formData.description,
          role: 'admin',
          isOrganizationOwner: true
        }
      });

      console.log('✅ User metadata updated successfully');
      setStep(3); // Success step
      
      toast({
        title: "Success!",
        description: "Your workspace has been set up successfully",
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
      console.error('❌ Error setting up workspace:', error);
      
      toast({
        title: "Error",
        description: `Failed to set up workspace: ${error?.message || 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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
              {step === 2 && <Building2 className="w-8 h-8 text-white" />}
              {step === 3 && <CheckCircle2 className="w-8 h-8 text-white" />}
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              {step === 1 && "Welcome to FunnelHQ!"}
              {step === 2 && "Set Up Your Workspace"}
              {step === 3 && "All Set!"}
            </h1>
            <p className="text-gray-400">
              {step === 1 && "Let's set up your workspace to get started"}
              {step === 2 && "Provide some details about your workspace"}
              {step === 3 && "Your workspace has been set up successfully"}
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
                  <span>Set up your workspace</span>
                </div>
                <div className="flex items-center space-x-3 text-gray-300">
                  <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <span>Start creating clients and projects</span>
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

          {/* Step 2: Workspace Setup */}
          {step === 2 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              <div className="space-y-4">
                <div>
                  <Label htmlFor="orgName" className="text-white">
                    Workspace Name *
                  </Label>
                  <Input
                    id="orgName"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="My Company"
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

              <div className="space-y-3">
                <Button 
                  onClick={handleCreateOrganization}
                  disabled={loading || !formData.name.trim()}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Setting up...
                    </>
                  ) : (
                    'Set Up Workspace'
                  )}
                </Button>
                
                <Button 
                  variant="ghost"
                  onClick={handleSkipForNow}
                  disabled={loading}
                  className="w-full text-gray-400 hover:text-white"
                >
                  Skip for now
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
                  Your workspace is ready. You'll be redirected to your dashboard shortly.
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