import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import { 
  Crown, 
  Zap, 
  AlertTriangle, 
  TrendingUp, 
  Users, 
  HardDrive,
  ArrowRight
} from "lucide-react";
import { BillingPlan, OrganizationWithBilling } from "@shared/schema";
import { getPlanColor, getUsageColor, formatBytes } from "@/hooks/useOrganization";
import { ProTrialBadge } from "@/components/ui/pro-trial-badge";
import { useTrialStatus } from "@/hooks/useTrialStatus";

interface PlanBadgeProps {
  organization: OrganizationWithBilling;
  variant?: "compact" | "detailed" | "minimal";
  showUsage?: boolean;
  showUpgrade?: boolean;
  className?: string;
}

export function PlanBadge({
  organization,
  variant = "compact",
  showUsage = true,
  showUpgrade = true,
  className
}: PlanBadgeProps) {
  const { currentPlan, usage, subscriptionStatus } = organization;
  const { isProTrial } = useTrialStatus();
  const isPro = organization.subscriptionPlan === 'pro';
  const isActive = subscriptionStatus === 'active';

  // If user is on Pro Trial, show the special Pro Trial badge
  if (isProTrial) {
    return (
      <ProTrialBadge 
        variant={variant} 
        showUpgradeButton={showUpgrade}
        className={className}
      />
    );
  }

  // Calculate warnings for usage approaching limits
  const getUsageWarnings = () => {
    const warnings = [];
    
    if (currentPlan.limits.projects !== -1 && usage.projects >= currentPlan.limits.projects * 0.8) {
      warnings.push({
        type: 'projects',
        message: `${usage.projects}/${currentPlan.limits.projects} projects`,
        percentage: (usage.projects / currentPlan.limits.projects) * 100
      });
    }
    
    if (currentPlan.limits.teamMembers !== -1 && usage.teamMembers >= currentPlan.limits.teamMembers * 0.8) {
      warnings.push({
        type: 'team',
        message: `${usage.teamMembers}/${currentPlan.limits.teamMembers} team members`,
        percentage: (usage.teamMembers / currentPlan.limits.teamMembers) * 100
      });
    }
    
    if (currentPlan.limits.storage !== -1 && usage.storage >= currentPlan.limits.storage * 0.8) {
      warnings.push({
        type: 'storage',
        message: `${formatBytes(usage.storage)}/${formatBytes(currentPlan.limits.storage)} storage`,
        percentage: (usage.storage / currentPlan.limits.storage) * 100
      });
    }
    
    return warnings;
  };

  const warnings = getUsageWarnings();
  const hasWarnings = warnings.length > 0;

  if (variant === "minimal") {
    return (
      <Badge 
        className={cn(
          "text-xs font-medium flex items-center gap-1",
          getPlanColor(organization.subscriptionPlan as BillingPlan),
          !isActive && "opacity-60",
          className
        )}
      >
        {isPro ? <Crown className="h-3 w-3" /> : <Zap className="h-3 w-3" />}
        {currentPlan.name}
        {!isActive && <span className="ml-1 text-xs">({subscriptionStatus})</span>}
      </Badge>
    );
  }

  if (variant === "compact") {
    return (
      <div className={cn("space-y-2", className)}>
        {/* Plan Badge */}
        <Badge 
          className={cn(
            "w-full justify-center py-2 text-xs font-medium flex items-center gap-2",
            getPlanColor(organization.subscriptionPlan as BillingPlan),
            !isActive && "opacity-60"
          )}
        >
          {isPro ? <Crown className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
          <span>{currentPlan.name} Plan</span>
          {!isActive && <span className="text-xs">({subscriptionStatus})</span>}
        </Badge>

        {/* Usage Warnings */}
        {hasWarnings && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-2">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-3 w-3 text-yellow-400" />
              <span className="text-xs font-medium text-yellow-300">Usage Alert</span>
            </div>
            <div className="space-y-1">
              {warnings.map((warning, index) => (
                <div key={index} className="flex items-center justify-between text-xs">
                  <span className="text-yellow-200">{warning.message}</span>
                  <div className="w-8 h-1 bg-yellow-500/20 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-yellow-400 transition-all"
                      style={{ width: `${Math.min(100, warning.percentage)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upgrade Button for Solo Users */}
        {!isPro && showUpgrade && isActive && (
          <Link href="/billing">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full text-xs h-8 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/30 text-amber-300 hover:from-amber-500/20 hover:to-orange-500/20"
            >
              <Crown className="h-3 w-3 mr-1" />
              Upgrade to Pro
              <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </Link>
        )}
      </div>
    );
  }

  // Detailed variant
  return (
    <div className={cn("space-y-3", className)}>
      {/* Plan Header */}
      <div className="flex items-center justify-between">
        <Badge 
          className={cn(
            "text-sm font-medium flex items-center gap-2 py-1.5 px-3",
            getPlanColor(organization.subscriptionPlan as BillingPlan),
            !isActive && "opacity-60"
          )}
        >
          {isPro ? <Crown className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
          {currentPlan.name} Plan
        </Badge>
        
        {!isActive && (
          <Badge variant="destructive" className="text-xs">
            {subscriptionStatus}
          </Badge>
        )}
      </div>

      {/* Usage Details */}
      {showUsage && (
        <div className="space-y-3">
          {/* Projects */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1 text-muted-foreground">
                <TrendingUp className="h-3 w-3" />
                Projects
              </span>
              <span className="text-muted-foreground">
                {usage.projects} / {currentPlan.limits.projects === -1 ? '∞' : currentPlan.limits.projects}
              </span>
            </div>
            {currentPlan.limits.projects !== -1 && (
              <Progress 
                value={(usage.projects / currentPlan.limits.projects) * 100}
                className="h-1.5"
              />
            )}
          </div>

          {/* Team Members */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1 text-muted-foreground">
                <Users className="h-3 w-3" />
                Team Members
              </span>
              <span className="text-muted-foreground">
                {usage.teamMembers} / {currentPlan.limits.teamMembers === -1 ? '∞' : currentPlan.limits.teamMembers}
              </span>
            </div>
            {currentPlan.limits.teamMembers !== -1 && (
              <Progress 
                value={(usage.teamMembers / currentPlan.limits.teamMembers) * 100}
                className="h-1.5"
              />
            )}
          </div>

          {/* Storage */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1 text-muted-foreground">
                <HardDrive className="h-3 w-3" />
                Storage
              </span>
              <span className="text-muted-foreground">
                {formatBytes(usage.storage)} / {currentPlan.limits.storage === -1 ? '∞' : formatBytes(currentPlan.limits.storage)}
              </span>
            </div>
            {currentPlan.limits.storage !== -1 && (
              <Progress 
                value={(usage.storage / currentPlan.limits.storage) * 100}
                className="h-1.5"
              />
            )}
          </div>
        </div>
      )}

      {/* Upgrade Button */}
      {!isPro && showUpgrade && isActive && (
        <Link href="/billing">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/30 text-amber-300 hover:from-amber-500/20 hover:to-orange-500/20"
          >
            <Crown className="h-4 w-4 mr-2" />
            Upgrade to Pro
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </Link>
      )}
    </div>
  );
}