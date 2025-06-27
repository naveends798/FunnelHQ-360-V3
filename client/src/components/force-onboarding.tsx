import { useState } from "react";
import { Button } from "@/components/ui/button";
import OrganizationOnboarding from "./organization-onboarding";
import SimpleOnboarding from "./simple-onboarding";
import RobustOrganizationOnboarding from "./robust-organization-onboarding";
import { Building2, Wrench, Zap } from "lucide-react";

// Temporary component to force test organization onboarding
export default function ForceOnboarding() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingType, setOnboardingType] = useState<'complex' | 'simple' | 'robust'>('robust');

  if (showOnboarding) {
    if (onboardingType === 'simple') {
      return <SimpleOnboarding onComplete={() => setShowOnboarding(false)} />;
    } else if (onboardingType === 'complex') {
      return <OrganizationOnboarding onComplete={() => setShowOnboarding(false)} />;
    } else {
      return <RobustOrganizationOnboarding onComplete={() => setShowOnboarding(false)} />;
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="text-center space-y-6">
        <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto">
          <Building2 className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white">Test Organization Onboarding</h1>
        <p className="text-gray-400">Choose which onboarding flow to test</p>
        
        <div className="space-y-4 max-w-sm mx-auto">
          <Button 
            onClick={() => {
              setOnboardingType('robust');
              setShowOnboarding(true);
            }}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 flex items-center justify-center"
          >
            <Building2 className="w-4 h-4 mr-2" />
            Test Robust Flow (Recommended)
          </Button>
          
          <Button 
            onClick={() => {
              setOnboardingType('simple');
              setShowOnboarding(true);
            }}
            className="w-full bg-green-500 hover:bg-green-600 flex items-center justify-center"
          >
            <Zap className="w-4 h-4 mr-2" />
            Test Simple Flow
          </Button>
          
          <Button 
            onClick={() => {
              setOnboardingType('complex');
              setShowOnboarding(true);
            }}
            className="w-full bg-blue-500 hover:bg-blue-600 flex items-center justify-center"
          >
            <Wrench className="w-4 h-4 mr-2" />
            Test Complex Flow (Legacy)
          </Button>
        </div>
        
        <div className="text-sm text-gray-500 max-w-md mx-auto">
          <p><strong>Robust Flow:</strong> Persistent onboarding with fallback methods</p>
          <p><strong>Simple Flow:</strong> Quick setup without Clerk organizations</p>
          <p><strong>Complex Flow:</strong> Full Clerk organization creation (may get stuck)</p>
        </div>
      </div>
    </div>
  );
}