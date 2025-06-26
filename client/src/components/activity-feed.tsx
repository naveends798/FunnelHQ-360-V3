import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRelativeTime } from "@/lib/utils";
import { type ActivityWithDetails } from "@shared/schema";

interface ActivityFeedProps {
  activities: ActivityWithDetails[];
  loading?: boolean;
}

const getActivityColor = (type: string) => {
  switch (type) {
    case "milestone_completed":
      return "bg-green-400";
    case "message_received":
      return "bg-blue-400";
    case "document_uploaded":
      return "bg-purple-400";
    case "payment_received":
      return "bg-yellow-400";
    default:
      return "bg-gray-400";
  }
};

const getActivityIcon = (type: string) => {
  switch (type) {
    case "milestone_completed":
      return "✓";
    case "message_received":
      return "💬";
    case "document_uploaded":
      return "📄";
    case "payment_received":
      return "💰";
    default:
      return "•";
  }
};

export default function ActivityFeed({ activities, loading = false }: ActivityFeedProps) {
  if (loading) {
    return (
      <Card className="glass border-white/10 p-6">
        <CardContent className="p-0">
          <h3 className="text-lg font-bold text-white mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-start space-x-3">
                <Skeleton className="w-2 h-2 rounded-full mt-2" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass border-white/10 p-6">
      <CardContent className="p-0">
        <h3 className="text-lg font-bold text-white mb-4">Recent Activity</h3>
        <div className="space-y-4">
          {activities.slice(0, 4).map((activity) => (
            <div key={activity.id} className="flex items-start space-x-3">
              <div 
                className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${getActivityColor(activity.type)}`}
                title={getActivityIcon(activity.type)}
              />
              <div>
                <p className="text-white text-sm">{activity.title}</p>
                <p className="text-slate-400 text-xs">
                  {activity.project?.title || activity.client?.name} • {formatRelativeTime(new Date(activity.createdAt))}
                </p>
              </div>
            </div>
          ))}
        </div>
        
        <Button variant="ghost" className="w-full mt-4 text-primary-400 hover:text-primary-300 text-sm font-medium">
          View All Activity
        </Button>
      </CardContent>
    </Card>
  );
}
