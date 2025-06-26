import { useTrialStatus } from '@/hooks/useTrialStatus';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Clock, X } from 'lucide-react';
import { useState } from 'react';
import { useLocation } from 'wouter';

export function TrialBanner() {
  const { isOnTrial, isTrialExpired, daysLeft, showUpgradeBanner, timeRemainingText } = useTrialStatus();
  const [isDismissed, setIsDismissed] = useState(false);
  const [, setLocation] = useLocation();

  if (!showUpgradeBanner || isDismissed) {
    return null;
  }

  const urgency = isTrialExpired ? 'expired' : daysLeft <= 3 ? 'urgent' : 'warning';

  return (
    <Alert 
      className={`
        mb-4 relative
        ${urgency === 'expired' ? 'border-red-500 bg-red-500/10' : ''}
        ${urgency === 'urgent' ? 'border-orange-500 bg-orange-500/10' : ''}
        ${urgency === 'warning' ? 'border-yellow-500 bg-yellow-500/10' : ''}
      `}
    >
      <div className="flex items-start gap-4">
        {urgency === 'expired' ? (
          <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
        ) : (
          <Clock className="h-5 w-5 text-yellow-500 mt-0.5" />
        )}
        
        <div className="flex-1">
          <AlertTitle className="text-white mb-1">
            {isTrialExpired 
              ? 'Your Pro Trial Has Expired' 
              : `Pro Trial Ends in ${daysLeft} ${daysLeft === 1 ? 'Day' : 'Days'}`}
          </AlertTitle>
          <AlertDescription className="text-gray-300">
            {isTrialExpired
              ? 'Upgrade now to restore access to all Pro features including unlimited projects, team collaboration, and priority support.'
              : 'After your trial ends, you\'ll lose access to Pro features. Upgrade now to keep your workflow uninterrupted.'}
          </AlertDescription>
          
          <div className="flex gap-2 mt-3">
            <Button 
              size="sm" 
              onClick={() => setLocation('/billing')}
              className={urgency === 'expired' ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              {isTrialExpired ? 'Upgrade Now' : 'View Plans'}
            </Button>
            {!isTrialExpired && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setIsDismissed(true)}
              >
                Remind Me Later
              </Button>
            )}
          </div>
        </div>
        
        {!isTrialExpired && (
          <button
            onClick={() => setIsDismissed(true)}
            className="text-gray-400 hover:text-gray-300"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </Alert>
  );
}