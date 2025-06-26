import { useOrganization } from '@clerk/clerk-react';
import { useToast } from './use-toast';
import { calculateTrialStatus, getEffectiveSubscriptionPlan } from '@shared/trial-utils';
import { useAuth } from './useAuth';

type PlanType = 'pro_trial' | 'solo' | 'pro';

interface PlanFeatures {
  maxProjects: number;
  maxStorage: number; // in bytes
  maxTeamMembers: number;
  canInviteMembers: boolean;
  canUseAdvancedFeatures: boolean;
  canExportData: boolean;
  hasSupport: boolean;
  supportLevel: 'standard' | 'priority';
}

const PLAN_FEATURES: Record<PlanType, PlanFeatures> = {
  pro_trial: {
    maxProjects: -1, // unlimited
    maxStorage: 107374182400, // 100GB
    maxTeamMembers: -1, // unlimited
    canInviteMembers: true,
    canUseAdvancedFeatures: true,
    canExportData: true,
    hasSupport: true,
    supportLevel: 'priority'
  },
  solo: {
    maxProjects: 3,
    maxStorage: 5368709120, // 5GB
    maxTeamMembers: 0,
    canInviteMembers: false,
    canUseAdvancedFeatures: false,
    canExportData: true,
    hasSupport: true,
    supportLevel: 'standard'
  },
  pro: {
    maxProjects: -1, // unlimited
    maxStorage: 107374182400, // 100GB
    maxTeamMembers: -1, // unlimited
    canInviteMembers: true,
    canUseAdvancedFeatures: true,
    canExportData: true,
    hasSupport: true,
    supportLevel: 'priority'
  }
};

export function usePlanFeatures() {
  const { organization } = useOrganization();
  const { authUser } = useAuth();
  const { toast } = useToast();

  // Get current plan from user data (fallback to organization metadata)
  const currentPlan = (authUser?.subscriptionPlan as PlanType) || 
                     (organization?.publicMetadata?.plan as PlanType) || 
                     'pro_trial';
  
  // Calculate trial status
  const trialStatus = calculateTrialStatus(
    authUser?.trialStartDate || authUser?.createdAt,
    currentPlan,
    authUser?.stripeSubscriptionId
  );
  
  // Get effective plan (considering expired trial)
  const effectivePlan = getEffectiveSubscriptionPlan(currentPlan, trialStatus) as PlanType;
  
  // Get features for effective plan
  const features = PLAN_FEATURES[effectivePlan];
  const isTrialExpired = trialStatus.isTrialExpired;
  
  // Helper functions
  const checkFeature = (feature: keyof PlanFeatures): boolean => {
    // Use effective plan features (which considers trial expiry)
    const value = features[feature];
    return typeof value === 'boolean' ? value : value !== 0;
  };

  const checkLimit = (
    resource: 'projects' | 'storage' | 'teamMembers',
    currentCount: number,
    additionalCount: number = 0
  ): { allowed: boolean; reason?: string; limit?: number } => {
    const limitKey = `max${resource.charAt(0).toUpperCase() + resource.slice(1)}` as keyof PlanFeatures;
    const limit = features[limitKey] as number;
    
    if (limit === -1) {
      return { allowed: true }; // Unlimited
    }
    
    if (currentCount + additionalCount > limit) {
      const planName = isTrialExpired && currentPlan === 'pro_trial' ? 'free' : effectivePlan;
      const reason = isTrialExpired && currentPlan === 'pro_trial' 
        ? `Your trial has expired. Please upgrade to continue using ${resource}.`
        : `You've reached the ${resource} limit for your ${planName} plan (${limit} max)`;
      
      return { 
        allowed: false, 
        reason,
        limit 
      };
    }
    
    return { allowed: true, limit };
  };

  const showUpgradePrompt = (feature: string) => {
    const title = isTrialExpired && currentPlan === 'pro_trial' ? "Trial Expired" : "Upgrade Required";
    const description = isTrialExpired && currentPlan === 'pro_trial' 
      ? `Your 14-day Pro trial has expired. Upgrade to continue using ${feature}.`
      : `The ${feature} feature requires an upgraded plan. Your current plan is ${effectivePlan}.`;
    
    toast({
      title,
      description,
      variant: isTrialExpired ? "destructive" : "default",
      action: {
        label: "Upgrade Now",
        onClick: () => window.location.href = '/billing'
      }
    });
  };

  const getDaysLeftInTrial = (): number | null => {
    if (currentPlan !== 'pro_trial') return null;
    
    return trialStatus.daysLeft;
  };

  return {
    currentPlan,
    effectivePlan,
    features,
    isTrialExpired,
    trialStatus,
    checkFeature,
    checkLimit,
    showUpgradePrompt,
    getDaysLeftInTrial,
    canInviteMembers: checkFeature('canInviteMembers'),
    canUseAdvancedFeatures: checkFeature('canUseAdvancedFeatures'),
    canExportData: checkFeature('canExportData'),
    hasSupport: checkFeature('hasSupport'),
    supportLevel: features.supportLevel
  };
}