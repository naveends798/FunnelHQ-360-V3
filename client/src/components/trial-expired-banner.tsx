import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Clock, Zap, Crown } from 'lucide-react';
import { useTrialStatus } from '@/hooks/useTrialStatus';
import { cn } from '@/lib/utils';

interface TrialExpiredBannerProps {
  className?: string;
  variant?: 'alert' | 'card' | 'minimal';
  onUpgradeClick?: () => void;
}

export function TrialExpiredBanner({ 
  className, 
  variant = 'alert',
  onUpgradeClick 
}: TrialExpiredBannerProps) {
  const { isTrialExpired, isProTrial } = useTrialStatus();

  if (!isProTrial || !isTrialExpired) return null;

  const handleUpgradeClick = () => {
    if (onUpgradeClick) {
      onUpgradeClick();
    }
  };

  if (variant === 'minimal') {
    return (
      <Alert className={cn("border-red-500 bg-red-500/10", className)}>
        <AlertTriangle className="h-4 w-4 text-red-500" />
        <AlertTitle className="text-red-400">Trial Expired</AlertTitle>
        <AlertDescription className="text-red-300">
          Your 14-day Pro trial has ended. Upgrade now to restore access.
        </AlertDescription>
      </Alert>
    );
  }

  if (variant === 'card') {
    return (
      <Card className={cn("border-red-500/30 bg-red-900/20", className)}>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 rounded-full bg-red-500/20">
            <AlertTriangle className="h-8 w-8 text-red-400" />
          </div>
          <CardTitle className="text-xl text-red-400">Your Pro Trial Has Expired</CardTitle>
          <CardDescription className="text-red-300">
            Your 14-day free trial ended and access to Pro features has been suspended.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-slate-800/50 rounded-lg p-4">
            <h4 className="text-white font-medium mb-2">What you've lost access to:</h4>
            <ul className="text-sm text-slate-300 space-y-1">
              <li>• Unlimited projects</li>
              <li>• Team collaboration</li>
              <li>• Advanced features</li>
              <li>• Priority support</li>
              <li>• Expanded storage</li>
            </ul>
          </div>
          
          <Button 
            onClick={handleUpgradeClick}
            className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white border-none"
            size="lg"
          >
            <Zap className="h-4 w-4 mr-2" />
            Upgrade to Pro Now
          </Button>
          
          <p className="text-xs text-slate-400 text-center">
            Restore your access instantly with any Pro plan
          </p>
        </CardContent>
      </Card>
    );
  }

  // Default alert variant
  return (
    <Alert className={cn("border-red-500 bg-red-500/10 mb-6", className)}>
      <div className="flex items-start gap-4">
        <AlertTriangle className="h-6 w-6 text-red-500 mt-0.5 flex-shrink-0" />
        
        <div className="flex-1">
          <AlertTitle className="text-red-400 mb-2 text-lg font-semibold">
            Your Pro Trial Has Expired
          </AlertTitle>
          <AlertDescription className="text-red-300 mb-4">
            Your 14-day free trial has ended. You now have limited access to the platform. 
            Upgrade to a Pro plan to restore full functionality including unlimited projects, 
            team collaboration, and priority support.
          </AlertDescription>
          
          <div className="flex gap-3">
            <Button 
              onClick={handleUpgradeClick}
              className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white border-none"
            >
              <Zap className="h-4 w-4 mr-2" />
              Upgrade Now
            </Button>
          </div>
        </div>
      </div>
    </Alert>
  );
}