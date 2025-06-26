import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Crown, Clock, Zap } from "lucide-react";
import { useTrialStatus } from "@/hooks/useTrialStatus";
import { useLocation } from "wouter";

interface ProTrialBadgeProps {
  className?: string;
  variant?: "compact" | "detailed" | "minimal";
  showUpgradeButton?: boolean;
}

export function ProTrialBadge({ 
  className, 
  variant = "compact",
  showUpgradeButton = true 
}: ProTrialBadgeProps) {
  const { isProTrial, daysLeft, hoursLeft, isTrialExpired } = useTrialStatus();
  const [, setLocation] = useLocation();

  if (!isProTrial) return null;

  const getUrgencyLevel = () => {
    if (isTrialExpired) return 'expired';
    if (daysLeft <= 1) return 'critical';
    if (daysLeft <= 3) return 'urgent';
    return 'normal';
  };

  const urgency = getUrgencyLevel();

  const getTimeDisplay = () => {
    if (isTrialExpired) return 'Expired';
    if (daysLeft <= 1) return `${hoursLeft}h left`;
    return `${daysLeft} days left`;
  };

  if (variant === "minimal") {
    return (
      <Badge 
        className={cn(
          "text-xs font-medium flex items-center gap-1",
          "bg-gradient-to-r from-amber-500 to-orange-500 text-white border-none",
          isTrialExpired && "from-red-500 to-red-600",
          className
        )}
      >
        <Crown className="h-3 w-3" />
        Pro Trial
      </Badge>
    );
  }

  if (variant === "compact") {
    return (
      <div className={cn("flex flex-col space-y-2", className)}>
        {/* Pro Trial Badge */}
        <Badge 
          className={cn(
            "w-full justify-center py-2 px-4 text-sm font-medium flex items-center gap-2 rounded-full",
            "bg-gradient-to-r from-amber-500 to-orange-500 text-white border-none shadow-lg",
            isTrialExpired && "from-red-500 to-red-600",
            urgency === 'critical' && "from-red-400 to-orange-500",
            urgency === 'urgent' && "from-orange-400 to-amber-500"
          )}
        >
          <Crown className="h-4 w-4" />
          Pro Trial
        </Badge>

        {/* Countdown Display */}
        <div className={cn(
          "bg-slate-800/90 border rounded-lg p-3 backdrop-blur-sm",
          urgency === 'expired' && "border-red-500/30 bg-red-900/20",
          urgency === 'critical' && "border-red-400/30 bg-red-900/10",
          urgency === 'urgent' && "border-orange-400/30 bg-orange-900/10",
          urgency === 'normal' && "border-slate-600/30"
        )}>
          <div className="flex items-center justify-between text-sm">
            <span className="text-amber-400 font-medium">Trial Period</span>
            <span className={cn(
              "font-bold",
              urgency === 'expired' && "text-red-400",
              urgency === 'critical' && "text-red-400",
              urgency === 'urgent' && "text-orange-400",
              urgency === 'normal' && "text-white"
            )}>
              {getTimeDisplay()}
            </span>
          </div>
        </div>

        {/* Subscribe Button */}
        {showUpgradeButton && (
          <Button 
            onClick={() => setLocation('/billing')}
            className={cn(
              "w-full rounded-full font-medium py-2 px-6",
              "bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700",
              "text-white border-none shadow-lg transition-all duration-200",
              "flex items-center justify-center gap-2"
            )}
          >
            <Zap className="h-4 w-4" />
            Subscribe to Continue
          </Button>
        )}
      </div>
    );
  }

  // Detailed variant
  return (
    <div className={cn("space-y-4", className)}>
      {/* Pro Trial Header */}
      <div className="flex items-center justify-between">
        <Badge 
          className={cn(
            "text-sm font-medium flex items-center gap-2 py-2 px-4 rounded-full",
            "bg-gradient-to-r from-amber-500 to-orange-500 text-white border-none shadow-lg",
            isTrialExpired && "from-red-500 to-red-600"
          )}
        >
          <Crown className="h-4 w-4" />
          Pro Trial
        </Badge>
        
        {isTrialExpired && (
          <Badge variant="destructive" className="text-xs">
            Expired
          </Badge>
        )}
      </div>

      {/* Detailed Countdown */}
      <div className={cn(
        "bg-slate-800/90 border rounded-lg p-4 backdrop-blur-sm",
        urgency === 'expired' && "border-red-500/30 bg-red-900/20",
        urgency === 'critical' && "border-red-400/30 bg-red-900/10",
        urgency === 'urgent' && "border-orange-400/30 bg-orange-900/10",
        urgency === 'normal' && "border-slate-600/30"
      )}>
        <div className="flex items-center gap-3 mb-3">
          <Clock className={cn(
            "h-5 w-5",
            urgency === 'expired' && "text-red-400",
            urgency === 'critical' && "text-red-400",
            urgency === 'urgent' && "text-orange-400",
            urgency === 'normal' && "text-amber-400"
          )} />
          <div>
            <div className="text-sm font-medium text-white">
              {isTrialExpired ? 'Trial Has Ended' : 'Trial Period'}
            </div>
            <div className={cn(
              "text-xl font-bold",
              urgency === 'expired' && "text-red-400",
              urgency === 'critical' && "text-red-400",
              urgency === 'urgent' && "text-orange-400",
              urgency === 'normal' && "text-white"
            )}>
              {getTimeDisplay()}
            </div>
          </div>
        </div>
        
        {!isTrialExpired && (
          <div className="text-xs text-slate-400">
            Enjoying unlimited access to Pro features
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="space-y-2">
        <Button 
          onClick={() => setLocation('/billing')}
          className={cn(
            "w-full rounded-full font-medium py-3 px-6",
            "bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700",
            "text-white border-none shadow-lg transition-all duration-200",
            "flex items-center justify-center gap-2"
          )}
        >
          <Zap className="h-4 w-4" />
          Subscribe to Continue
        </Button>
        
        {!isTrialExpired && (
          <Button 
            variant="outline" 
            onClick={() => setLocation('/billing')}
            className="w-full text-xs bg-transparent border-slate-600 text-slate-300 hover:bg-slate-800"
          >
            View Pricing Plans
          </Button>
        )}
      </div>
    </div>
  );
}