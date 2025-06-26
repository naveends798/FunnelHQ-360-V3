import { useState, useEffect } from "react";
import { 
  CreditCard, 
  TrendingUp, 
  Users, 
  HardDrive, 
  Check, 
  ArrowRight,
  AlertTriangle,
  Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tab } from "@/components/ui/pricing-tab";
import { PricingCards, type PricingTier } from "@/components/ui/pricing-cards";
import { BILLING_PLANS, type OrganizationWithBilling, type BillingPlan } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { useTrialStatus } from "@/hooks/useTrialStatus";
import Sidebar from "@/components/sidebar";
import { TrialBanner } from "@/components/trial-banner";

export default function BillingFixedPage() {
  const { authUser } = useAuth();
  const trialStatus = useTrialStatus();
  const [loading, setLoading] = useState(false);
  const [upgrading, setUpgrading] = useState<BillingPlan | null>(null);
  const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">("monthly");

  // Use authUser data instead of fetching organization data
  const isOnProTrial = authUser?.subscriptionPlan === 'pro_trial';
  const isTrialExpired = trialStatus.isTrialExpired;
  const currentPlanKey = isTrialExpired ? 'solo' : (authUser?.subscriptionPlan as BillingPlan || 'solo');
  const currentPlan = BILLING_PLANS[currentPlanKey as keyof typeof BILLING_PLANS];

  const handleUpgrade = async (plan: BillingPlan) => {
    setUpgrading(plan);
    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: authUser?.id,
          plan,
          successUrl: window.location.origin + "/billing?success=true",
          cancelUrl: window.location.origin + "/billing?canceled=true"
        })
      });

      if (response.ok) {
        const { url } = await response.json();
        window.location.href = url;
      }
    } catch (error) {
      console.error("Failed to create checkout session:", error);
    } finally {
      setUpgrading(null);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!authUser) {
    return (
      <div className="min-h-screen gradient-bg relative overflow-hidden">
        <Sidebar />
        <main className="lg:ml-64 p-4 lg:p-8 pt-20 lg:pt-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white"></div>
          </div>
        </main>
      </div>
    );
  }

  // Mock usage data - in real app, this would come from API
  const usage = {
    projects: 1,
    teamMembers: 1,
    storage: 500 * 1024 * 1024 // 500MB
  };

  return (
    <div className="min-h-screen gradient-bg relative overflow-hidden">
      <Sidebar />
      <main className="lg:ml-64 p-4 lg:p-8 pt-20 lg:pt-8">
        <div className="space-y-8">
          {/* Trial Banner */}
          <TrialBanner />
          
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">
                Billing & Usage
              </h1>
              <p className="text-slate-400 mt-2">
                Manage your subscription and monitor usage across your organization
              </p>
            </div>
            {authUser.stripeCustomerId && (
              <Button variant="outline" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Manage Billing
              </Button>
            )}
          </div>

          {/* Current Plan */}
          <Card className="glass border-white/10">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl flex items-center gap-2 text-white">
                    <CreditCard className="h-5 w-5 text-primary" />
                    {isOnProTrial ? 'Pro Trial' : `Current Plan: ${currentPlan.name}`}
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    {isOnProTrial 
                      ? `${trialStatus.daysLeft} days remaining` 
                      : `$${currentPlan.price}/${currentPlan.interval}`
                    }
                  </CardDescription>
                </div>
                <Badge 
                  variant={isOnProTrial ? 'default' : (authUser.subscriptionStatus === 'active' ? 'default' : 'destructive')}
                  className="text-sm"
                >
                  {isOnProTrial ? 'Trial' : authUser.subscriptionStatus || 'Active'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Projects Usage */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium flex items-center gap-1 text-white">
                      <TrendingUp className="h-4 w-4" />
                      Projects
                    </span>
                    <span className="text-sm text-slate-400">
                      {usage.projects} / {(isOnProTrial ? '∞' : (currentPlan.limits.projects === -1 ? '∞' : currentPlan.limits.projects))}
                    </span>
                  </div>
                  {!isOnProTrial && currentPlan.limits.projects !== -1 && (
                    <Progress 
                      value={(usage.projects / currentPlan.limits.projects) * 100}
                      className="h-2"
                    />
                  )}
                </div>

                {/* Team Members Usage */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium flex items-center gap-1 text-white">
                      <Users className="h-4 w-4" />
                      Team Members
                    </span>
                    <span className="text-sm text-slate-400">
                      {usage.teamMembers} / {(isOnProTrial ? '∞' : (currentPlan.limits.collaborators === -1 ? '∞' : currentPlan.limits.collaborators))}
                    </span>
                  </div>
                  {!isOnProTrial && currentPlan.limits.collaborators !== -1 && (
                    <Progress 
                      value={(usage.teamMembers / currentPlan.limits.collaborators) * 100}
                      className="h-2"
                    />
                  )}
                </div>

                {/* Storage Usage */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium flex items-center gap-1 text-white">
                      <HardDrive className="h-4 w-4" />
                      Storage
                    </span>
                    <span className="text-sm text-slate-400">
                      {formatBytes(usage.storage)} / {(isOnProTrial ? '100 GB' : (currentPlan.limits.storage === -1 ? '∞' : formatBytes(currentPlan.limits.storage)))}
                    </span>
                  </div>
                  {!isOnProTrial && currentPlan.limits.storage !== -1 && (
                    <Progress 
                      value={(usage.storage / currentPlan.limits.storage) * 100}
                      className="h-2"
                    />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Available Plans */}
          <div>
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-4">Choose Your Plan</h2>
              <p className="text-slate-400 mb-6">Select the perfect plan for your needs</p>
              
              {/* Billing Interval Toggle */}
              <div className="flex w-fit rounded-full bg-white/10 p-1 mx-auto">
                <Tab
                  text="monthly"
                  selected={billingInterval === "monthly"}
                  setSelected={(text) => setBillingInterval(text as "monthly" | "yearly")}
                />
                <Tab
                  text="yearly"
                  selected={billingInterval === "yearly"}
                  setSelected={(text) => setBillingInterval(text as "monthly" | "yearly")}
                  discount={true}
                />
              </div>
            </div>
            
            <PricingCards 
              tiers={Object.entries(BILLING_PLANS).map(([planKey, plan]) => {
                // For pro_trial users, don't highlight any plan
                const isCurrentPlan = !isOnProTrial && planKey === authUser.subscriptionPlan;
                const currentPrice = billingInterval === 'yearly' ? plan.yearlyPrice : plan.price;
                const interval = billingInterval === 'yearly' ? '/year' : '/month';
                
                // Calculate savings for yearly plan
                const monthlyCost = plan.price * 12;
                const yearlyCost = plan.yearlyPrice * 12;
                const savings = monthlyCost - yearlyCost;
                const savingsText = billingInterval === 'yearly' ? ` (Save $${savings}/year)` : '';
                
                // For pro_trial users, show "Get [Plan] Plan" instead of current plan or generic text
                let ctaText = isCurrentPlan ? `Current ${plan.name} Plan` : `Get ${plan.name} Plan`;
                if (isOnProTrial) {
                  ctaText = `Get ${plan.name} Plan`;
                }
                
                return {
                  name: plan.name,
                  price: currentPrice,
                  interval: interval,
                  description: `Perfect for ${plan.name.toLowerCase()} users${savingsText}`,
                  highlight: isCurrentPlan,
                  features: plan.features.map(feature => ({
                    name: feature,
                    included: true
                  })),
                  cta: {
                    text: ctaText,
                    onClick: isCurrentPlan ? undefined : () => handleUpgrade(planKey as BillingPlan)
                  }
                } as PricingTier;
              })}
              containerClassName="px-0"
              className="gap-6"
            />
          </div>
        </div>
      </main>
    </div>
  );
}