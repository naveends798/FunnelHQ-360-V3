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
  ArrowRight,
  Sparkles
} from "lucide-react";
import { BillingPlan, OrganizationWithBilling, BILLING_PLANS } from "@shared/schema";
import { getPlanColor } from "@/hooks/useOrganization";
import { formatBytes } from "@/utils/format";
import { useTrialStatus } from "@/hooks/useTrialStatus";
import { ProTrialBadge } from "@/components/pro-trial-badge";

interface SidebarPlanInfoProps {
  organization: OrganizationWithBilling;
  isClient?: boolean;
  className?: string;
}

export function SidebarPlanInfo({
  organization,
  isClient = false,
  className
}: SidebarPlanInfoProps) {
  const testPlan = 'pro' as BillingPlan;
  const currentPlan = BILLING_PLANS[testPlan];
  const { usage, subscriptionStatus } = organization;
  const { isProTrial } = useTrialStatus();
  const isPro = testPlan === 'pro';
  const isSolo = testPlan === 'solo';
  const isActive = subscriptionStatus === 'active';

  // Pro users should see their plan info but not upgrade prompts

  // Calculate critical usage warnings (90%+ usage)
  const getCriticalUsage = () => {
    const warnings = [];
    
    if (currentPlan.limits.projects > 0) {
      const projectUsage = (usage.projects / currentPlan.limits.projects) * 100;
      if (projectUsage >= 90) {
        warnings.push({
          type: 'projects',
          usage: usage.projects,
          limit: currentPlan.limits.projects,
          percentage: projectUsage
        });
      }
    }
    
    if (currentPlan.limits.teamMembers > 0) {
      const teamUsage = (usage.teamMembers / currentPlan.limits.teamMembers) * 100;
      if (teamUsage >= 90) {
        warnings.push({
          type: 'team',
          usage: usage.teamMembers,
          limit: currentPlan.limits.teamMembers,
          percentage: teamUsage
        });
      }
    }
    
    if (currentPlan.limits.storage !== -1) {
      const storageUsage = (usage.storage / currentPlan.limits.storage) * 100;
      if (storageUsage >= 90) {
        warnings.push({
          type: 'storage',
          usage: formatBytes(usage.storage),
          limit: formatBytes(currentPlan.limits.storage),
          percentage: storageUsage
        });
      }
    }
    
    return warnings;
  };

  const criticalUsage = getCriticalUsage();
  const hasCriticalUsage = criticalUsage.length > 0;

  // For Pro Trial users, show the special Pro Trial badge
  if (isProTrial) {
    return (
      <div className={cn("", className)}>
        <ProTrialBadge 
          variant="compact" 
          showUpgradeButton={!isClient}
        />
      </div>
    );
  }

  // For Pro users, show only a premium badge
  if (isPro) {
    return (
      <div className={cn("flex justify-center", className)}>
        <div className="relative">
          {/* Glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-amber-400/30 via-yellow-400/30 to-orange-400/30 rounded-full blur-sm"></div>
          
          {/* Main badge */}
          <Badge 
            className="relative text-xs font-semibold flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500/90 via-yellow-500/90 to-orange-500/90 text-amber-50 border-0 shadow-lg backdrop-blur-sm"
          >
            <Crown className="h-3.5 w-3.5 text-amber-100" />
            <span>Pro Member</span>
          </Badge>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {/* Plan Badge */}
      <div className="bg-card/50 border border-border/50 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <Badge 
            className={cn(
              "text-xs font-medium flex items-center gap-1.5 px-2 py-1 bg-purple-500/20 text-purple-300 border-purple-500/30",
              !isActive && "opacity-60"
            )}
          >
            <Zap className="h-3 w-3" />
            <span>{currentPlan.name}</span>
          </Badge>
          {!isActive && (
            <Badge variant="destructive" className="text-xs px-1.5 py-0.5">
              {subscriptionStatus}
            </Badge>
          )}
        </div>

        {/* Usage Summary - Only show if not client */}
        {!isClient && (
          <div className="space-y-2">
            {/* Projects */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Projects
              </span>
              <span className="text-sidebar-foreground font-medium">
                {usage.projects}{currentPlan.limits.projects > 0 ? `/${currentPlan.limits.projects}` : ''}
              </span>
            </div>
            
            {/* Storage */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1">
                <HardDrive className="h-3 w-3" />
                Storage
              </span>
              <span className="text-sidebar-foreground font-medium">
                {formatBytes(usage.storage)}
                {currentPlan.limits.storage > 0 ? `/${formatBytes(currentPlan.limits.storage)}` : ''}
              </span>
            </div>

            {/* Team (show if Solo has team members) */}
            {usage.teamMembers > 1 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  Team
                </span>
                <span className="text-sidebar-foreground font-medium">
                  {usage.teamMembers}/{currentPlan.limits.teamMembers}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Critical Usage Alert - Only show for project limits on Solo plan */}
        {hasCriticalUsage && !isClient && isSolo && (
          <div className="mt-2 p-2 bg-purple-500/10 border border-purple-500/20 rounded-md">
            <div className="flex items-center gap-1.5 mb-1">
              <AlertTriangle className="h-3 w-3 text-purple-400" />
              <span className="text-xs font-medium text-purple-300">Project limit reached</span>
            </div>
          </div>
        )}

        {/* Upgrade Button for Solo Users Only */}
        {isSolo && isActive && !isClient && (
          <>
            <div className="mt-3">
              <Link href="/billing">
                <Button 
                  size="sm" 
                  className="w-full text-xs h-8 bg-gradient-to-r from-purple-500 via-purple-600 to-blue-600 hover:from-purple-600 hover:via-purple-700 hover:to-blue-700 text-white border-none font-medium transition-all duration-200 hover:shadow-lg hover:shadow-purple-500/25"
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  Upgrade
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </div>
            
            {/* Promotional text for Solo users */}
            <div className="mt-2 text-xs text-center text-muted-foreground">
              Unlock unlimited projects & advanced features
            </div>
          </>
        )}
      </div>
    </div>
  );
}