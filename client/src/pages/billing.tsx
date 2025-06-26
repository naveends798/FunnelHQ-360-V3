import { useState, useEffect } from "react";
import { motion } from "framer-motion";
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
import Sidebar from "@/components/sidebar";
import { TrialExpiredBanner } from "@/components/trial-expired-banner";
import { useTrialStatus } from "@/hooks/useTrialStatus";

export default function BillingPage() {
  const [billingData, setBillingData] = useState<OrganizationWithBilling | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<BillingPlan | null>(null);
  const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">("monthly");
  const { isTrialExpired } = useTrialStatus();
  const testPlan = 'pro' as BillingPlan; // Default to pro plan

  // Mock organization ID - in real app, get from auth context
  const organizationId = 1;

  useEffect(() => {
    fetchBillingData();
  }, []);

  const fetchBillingData = async () => {
    try {
      const response = await fetch(`/api/billing/${organizationId}`);
      if (response.ok) {
        const data = await response.json();
        setBillingData(data);
      }
    } catch (error) {
      console.error("Failed to fetch billing data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (plan: BillingPlan) => {
    setUpgrading(plan);
    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId,
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

  const openBillingPortal = async () => {
    try {
      const response = await fetch("/api/billing/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId,
          returnUrl: window.location.origin + "/billing"
        })
      });

      if (response.ok) {
        const { url } = await response.json();
        window.location.href = url;
      }
    } catch (error) {
      console.error("Failed to create portal session:", error);
    }
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return "bg-red-500";
    if (percentage >= 80) return "bg-yellow-500";
    return "bg-emerald-500";
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
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

  if (!billingData) {
    return (
      <div className="min-h-screen gradient-bg relative overflow-hidden">
        <Sidebar />
        <main className="lg:ml-64 p-4 lg:p-8 pt-20 lg:pt-8">
          <div className="text-center py-12">
            <p className="text-white">Failed to load billing information</p>
          </div>
        </main>
      </div>
    );
  }

  const currentPlan = BILLING_PLANS[testPlan]; // Use test plan instead of billingData
  const usage = billingData.usage;

  return (
    <div className="min-h-screen gradient-bg relative overflow-hidden">
      <Sidebar />
      <main className="lg:ml-64 p-4 lg:p-8 pt-20 lg:pt-8">
        <div className="space-y-8">
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
        {billingData.stripeCustomerId && (
          <Button onClick={openBillingPortal} variant="outline" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Manage Billing
          </Button>
        )}
      </div>

      {/* Trial Expired Banner */}
      <TrialExpiredBanner 
        variant="alert"
        onUpgradeClick={() => {
          // Scroll to pricing section
          document.getElementById('pricing-section')?.scrollIntoView({ behavior: 'smooth' });
        }}
      />

      {/* Current Plan */}
      <Card className="glass border-white/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl flex items-center gap-2 text-white">
                <CreditCard className="h-5 w-5 text-primary" />
                Current Plan: {currentPlan.name}
              </CardTitle>
              <CardDescription className="text-slate-400">
                ${currentPlan.price}/{currentPlan.interval}
              </CardDescription>
            </div>
            <Badge 
              variant={billingData.subscriptionStatus === 'active' ? 'default' : 'destructive'}
              className="text-sm"
            >
              {billingData.subscriptionStatus || 'Active'}
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
                  {usage.projects} / {currentPlan.limits.projects === -1 ? '∞' : currentPlan.limits.projects}
                </span>
              </div>
              {currentPlan.limits.projects > 0 && (
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
                  {usage.teamMembers} / {currentPlan.limits.teamMembers === -1 ? '∞' : currentPlan.limits.teamMembers}
                </span>
              </div>
              {currentPlan.limits.teamMembers > 0 && (
                <Progress 
                  value={(usage.teamMembers / currentPlan.limits.teamMembers) * 100}
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
                  {formatBytes(usage.storage)} / {currentPlan.limits.storage === -1 ? '∞' : formatBytes(currentPlan.limits.storage)}
                </span>
              </div>
              {currentPlan.limits.storage > 0 && (
                <Progress 
                  value={(usage.storage / currentPlan.limits.storage) * 100}
                  className="h-2"
                />
              )}
            </div>

          </div>
        </CardContent>
      </Card>

      {/* Usage Warnings */}
      {(() => {
        const warnings = [];
        if (currentPlan.limits.projects > 0 && usage.projects >= currentPlan.limits.projects * 0.8) {
          warnings.push("You're approaching your project limit");
        }
        if (currentPlan.limits.teamMembers > 0 && usage.teamMembers >= currentPlan.limits.teamMembers * 0.8) {
          warnings.push("You're approaching your team member limit");
        }
        if (currentPlan.limits.storage > 0 && usage.storage >= currentPlan.limits.storage * 0.8) {
          warnings.push("You're approaching your storage limit");
        }

        if (warnings.length > 0) {
          return (
            <Card className="border-yellow-500/30 glass">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-400 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-yellow-300">Usage Warnings</h3>
                    <ul className="mt-1 text-sm text-yellow-200 space-y-1">
                      {warnings.map((warning, index) => (
                        <li key={index}>• {warning}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        }
        return null;
      })()}

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
        
        <div id="pricing-section">
        <PricingCards 
          tiers={Object.entries(BILLING_PLANS).map(([planKey, plan]) => {
            const isCurrentPlan = planKey === testPlan; // Use test plan to determine current plan
            const currentPrice = billingInterval === 'yearly' ? plan.yearlyPrice : plan.price;
            const interval = billingInterval === 'yearly' ? '/year' : '/month';
            
            
            return {
              name: plan.name,
              price: currentPrice,
              interval: interval,
              description: `Perfect for ${plan.name.toLowerCase()} users`,
              highlight: isCurrentPlan,
              features: plan.features.map(feature => ({
                name: feature,
                included: true
              })),
              cta: {
                text: isCurrentPlan ? `Current ${plan.name} Plan` : (planKey === 'pro' ? 'Upgrade to Pro' : 'Get Started'),
                onClick: isCurrentPlan ? undefined : () => handleUpgrade(planKey as BillingPlan),
                planKey: planKey as BillingPlan,
                isCurrentPlan
              }
            } as PricingTier;
          })}
          containerClassName="px-0"
          className="gap-6"
        />
        </div>
      </div>
        </div>
      </main>
    </div>
  );
}