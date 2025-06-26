import { useTrialStatus } from '@/hooks/useTrialStatus';
import { useAuth } from '@/hooks/useAuth';
import { shouldBlockAccess, getAllowedRoutesForExpiredTrial } from '@shared/trial-utils';
import { useLocation } from 'wouter';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Crown, Lock } from 'lucide-react';

interface TrialAccessGuardProps {
  children: React.ReactNode;
}

export function TrialAccessGuard({ children }: TrialAccessGuardProps) {
  const { authUser } = useAuth();
  const trialStatus = useTrialStatus();
  const [location, setLocation] = useLocation();

  // Redirect if trial is expired and on restricted route
  useEffect(() => {
    if (shouldBlockAccess(trialStatus)) {
      const allowedRoutes = getAllowedRoutesForExpiredTrial();
      const isAllowedRoute = allowedRoutes.some(route => location.startsWith(route));
      
      if (!isAllowedRoute) {
        setLocation('/billing');
      }
    }
  }, [trialStatus, location, setLocation]);

  // If trial expired and we have a paid subscription, show normal content
  if (authUser?.stripeSubscriptionId) {
    return <>{children}</>;
  }

  // If trial is expired, show upgrade page content
  if (shouldBlockAccess(trialStatus)) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-gray-800 rounded-lg shadow-xl p-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-red-500/20 rounded-full">
              <Lock className="h-8 w-8 text-red-400" />
            </div>
          </div>
          
          <h1 className="text-2xl font-bold text-white mb-4">
            Trial Expired
          </h1>
          
          <p className="text-gray-300 mb-6">
            Your 14-day trial has ended. Upgrade to Pro to continue accessing all features, including unlimited projects, team collaboration, and priority support.
          </p>
          
          <div className="space-y-3">
            <Button 
              onClick={() => setLocation('/billing')}
              className="w-full bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700"
            >
              <Crown className="h-4 w-4 mr-2" />
              Upgrade to Pro
            </Button>
            
            <Button 
              variant="outline"
              onClick={() => setLocation('/support')}
              className="w-full"
            >
              Contact Support
            </Button>
          </div>
          
          <p className="text-xs text-gray-500 mt-6">
            Need help? Contact our support team for assistance.
          </p>
        </div>
      </div>
    );
  }

  // Normal content for active trials or paid users
  return <>{children}</>;
}