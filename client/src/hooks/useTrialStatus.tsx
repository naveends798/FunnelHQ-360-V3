import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useToast } from './use-toast';
import { useAuth } from './useAuth';
import { calculateTrialStatus, shouldBlockAccess, getAllowedRoutesForExpiredTrial, formatTrialTimeRemaining } from '@shared/trial-utils';

export function useTrialStatus() {
  const { authUser } = useAuth();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [hasShownExpiredToast, setHasShownExpiredToast] = useState(false);

  // Calculate trial status from user data
  const trialStatus = calculateTrialStatus(
    authUser?.trialStartDate || authUser?.createdAt,
    authUser?.subscriptionPlan,
    authUser?.stripeSubscriptionId
  );


  const { 
    isOnTrial: isProTrial, 
    isTrialExpired, 
    daysLeft, 
    hoursLeft, 
    trialEndDate,
    showUpgradeBanner 
  } = trialStatus;

  // Show warning when trial is about to expire
  useEffect(() => {
    if (!isProTrial || !trialEndDate || hasShownExpiredToast) return;

    if (isTrialExpired) {
      // Trial has expired
      toast({
        title: "Trial Expired",
        description: "Your 14-day Pro trial has ended. Upgrade now to continue using all features.",
        variant: "destructive",
        duration: 10000,
        action: {
          label: "Upgrade Now",
          onClick: () => setLocation('/billing')
        }
      });
      setHasShownExpiredToast(true);
    } else if (daysLeft <= 3 && daysLeft > 0) {
      // Trial expiring soon
      const message = daysLeft === 1 
        ? `Your trial expires in ${hoursLeft} hours!`
        : `Your trial expires in ${daysLeft} days.`;
        
      toast({
        title: "Trial Ending Soon",
        description: message + " Upgrade to Pro to keep all your features.",
        variant: "default",
        action: {
          label: "View Plans",
          onClick: () => setLocation('/billing')
        }
      });
    }
  }, [isProTrial, trialEndDate, isTrialExpired, daysLeft, hoursLeft, hasShownExpiredToast, toast, setLocation]);

  // Redirect to billing if trial expired and on restricted route
  useEffect(() => {
    if (shouldBlockAccess(trialStatus)) {
      const allowedRoutes = getAllowedRoutesForExpiredTrial();
      const isAllowedRoute = allowedRoutes.some(route => location.startsWith(route));
      
      if (!isAllowedRoute) {
        console.log('🔒 Trial expired, redirecting to billing');
        setLocation('/billing');
      }
    }
  }, [trialStatus, location, setLocation]);

  return {
    ...trialStatus,
    timeRemainingText: formatTrialTimeRemaining(trialStatus)
  };
}