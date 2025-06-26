export const TRIAL_DURATION_DAYS = 14;

export interface TrialStatus {
  isOnTrial: boolean;
  isTrialExpired: boolean;
  daysLeft: number;
  hoursLeft: number;
  trialEndDate: Date | null;
  showUpgradeBanner: boolean;
}

/**
 * Calculate trial status based on trial start date
 */
export function calculateTrialStatus(
  trialStartDate: Date | string | null,
  subscriptionPlan: string = 'solo',
  stripeSubscriptionId: string | null = null
): TrialStatus {
  // User has a paid subscription - not on trial
  if (stripeSubscriptionId || subscriptionPlan === 'pro') {
    return {
      isOnTrial: false,
      isTrialExpired: false,
      daysLeft: 0,
      hoursLeft: 0,
      trialEndDate: null,
      showUpgradeBanner: false
    };
  }

  // User is not on pro_trial - not on trial
  if (subscriptionPlan !== 'pro_trial') {
    return {
      isOnTrial: false,
      isTrialExpired: false,
      daysLeft: 0,
      hoursLeft: 0,
      trialEndDate: null,
      showUpgradeBanner: true // Show upgrade banner for solo users
    };
  }

  // No trial start date means trial just started
  if (!trialStartDate) {
    const now = new Date();
    const trialEndDate = new Date(now.getTime() + (TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000));
    
    return {
      isOnTrial: true,
      isTrialExpired: false,
      daysLeft: TRIAL_DURATION_DAYS,
      hoursLeft: TRIAL_DURATION_DAYS * 24,
      trialEndDate,
      showUpgradeBanner: false
    };
  }

  const startDate = typeof trialStartDate === 'string' ? new Date(trialStartDate) : trialStartDate;
  const now = new Date();
  
  // Calculate days by comparing dates, not exact timestamps
  const startDay = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const daysPassed = Math.floor((today.getTime() - startDay.getTime()) / (1000 * 60 * 60 * 24));
  
  const daysLeft = Math.max(0, TRIAL_DURATION_DAYS - daysPassed);
  const trialEndDate = new Date(startDay.getTime() + (TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000));
  const isTrialExpired = daysLeft === 0;
  
  // Calculate hours more precisely for the current day
  const timeLeft = trialEndDate.getTime() - now.getTime();
  const hoursLeft = timeLeft > 0 ? Math.max(1, Math.ceil(timeLeft / (1000 * 60 * 60))) : 0;

  return {
    isOnTrial: true,
    isTrialExpired,
    daysLeft: Math.max(0, daysLeft),
    hoursLeft: Math.max(0, hoursLeft),
    trialEndDate,
    showUpgradeBanner: isTrialExpired || daysLeft <= 7
  };
}

/**
 * Check if user should be blocked from accessing features due to expired trial
 */
export function shouldBlockAccess(trialStatus: TrialStatus): boolean {
  return trialStatus.isOnTrial && trialStatus.isTrialExpired;
}

/**
 * Check if a user with expired trial should be downgraded to solo plan
 */
export function shouldDowngradeToSolo(
  subscriptionPlan: string,
  trialStatus: TrialStatus
): boolean {
  return subscriptionPlan === 'pro_trial' && trialStatus.isTrialExpired;
}

/**
 * Get effective subscription plan considering trial status
 * If trial expired, return 'solo' for feature checking purposes
 */
export function getEffectiveSubscriptionPlan(
  subscriptionPlan: string,
  trialStatus: TrialStatus
): string {
  if (shouldDowngradeToSolo(subscriptionPlan, trialStatus)) {
    return 'solo';
  }
  return subscriptionPlan;
}

/**
 * Get the allowed routes when trial is expired
 */
export function getAllowedRoutesForExpiredTrial(): string[] {
  return ['/billing', '/support', '/login', '/signup', '/profile'];
}

/**
 * Format trial time remaining for display
 */
export function formatTrialTimeRemaining(trialStatus: TrialStatus): string {
  if (!trialStatus.isOnTrial) {
    return '';
  }

  if (trialStatus.isTrialExpired) {
    return 'Trial expired';
  }

  if (trialStatus.daysLeft === 0) {
    return `${trialStatus.hoursLeft} hours left`;
  }

  if (trialStatus.daysLeft === 1) {
    return '1 day left';
  }

  return `${trialStatus.daysLeft} days left`;
}