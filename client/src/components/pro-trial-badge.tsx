import { Crown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useTrialStatus } from "@/hooks/useTrialStatus";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

interface ProTrialBadgeProps {
  className?: string;
}

export function ProTrialBadge({ className }: ProTrialBadgeProps) {
  const { isAdmin, currentRole, authUser } = useAuth();
  const { isOnTrial, daysLeft, isTrialExpired, timeRemainingText } = useTrialStatus();

  // Only show for admin users who are on trial
  if (!isAdmin || !isOnTrial) {
    return null;
  }

  return (
    <div className={cn("", className)}>
      {/* Pro Trial Badge */}
      <div className="flex justify-center mb-3">
        <Badge className="py-2 px-4 text-sm font-semibold bg-gradient-to-r from-orange-400 to-amber-400 hover:from-orange-500 hover:to-amber-500 text-white border-none rounded-full">
          <Crown className="w-4 h-4 mr-1.5" />
          Pro Trial
        </Badge>
      </div>

      {/* Trial Status Card */}
      <div className="bg-black/40 border border-amber-500/20 rounded-lg p-4">
        {/* Trial Period Info */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-medium text-amber-400/90">
            Trial Period
          </span>
          <span className="text-xs font-bold text-amber-300">
            {timeRemainingText}
          </span>
        </div>

        {/* Subscribe Button */}
        <Link href="/billing">
          <Button 
            className="w-full bg-gradient-to-r from-purple-500 via-purple-600 to-blue-600 hover:from-purple-600 hover:via-purple-700 hover:to-blue-700 text-white border-none font-medium text-xs py-2 h-8 rounded-lg transition-all duration-200 hover:shadow-lg hover:shadow-purple-500/25"
            size="sm"
          >
            <Crown className="w-3.5 h-3.5 mr-1.5" />
            Upgrade
          </Button>
        </Link>
      </div>
    </div>
  );
}