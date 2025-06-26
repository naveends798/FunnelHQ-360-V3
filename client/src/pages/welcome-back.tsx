import { useLocation } from "wouter";
import { useAuth as useClerkAuth, useUser } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function WelcomeBackPage() {
  const { user } = useUser();
  const [, setLocation] = useLocation();
  const { currentRole, isClient } = useAuth();

  const handleContinue = () => {
    // Route based on role
    if (isClient) {
      setLocation("/client-portal");
    } else if (currentRole === 'team_member') {
      setLocation("/projects");
    } else {
      setLocation("/dashboard");
    }
  };

  const getRoleDisplayName = () => {
    if (isClient) return "Client";
    if (currentRole === 'team_member') return "Team Member";
    if (currentRole === 'admin') return "Admin";
    return "User";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
      <Card className="w-full max-w-md bg-gray-800 border border-transparent bg-gradient-to-r from-purple-500/20 to-pink-500/20 p-[1px] rounded-lg">
        <div className="bg-gray-800 rounded-lg p-6">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-white">
              Welcome back to FunnelHQ 360
            </CardTitle>
            <p className="text-gray-400">
              You're already signed in as <span className="text-blue-400">{user?.emailAddresses[0]?.emailAddress}</span>
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-gray-700 rounded-lg p-4 text-center">
              <p className="text-gray-300 text-sm mb-1">Signed in as</p>
              <p className="text-white font-semibold">{user?.fullName || user?.firstName || "User"}</p>
              <p className="text-blue-400 text-sm">{getRoleDisplayName()}</p>
            </div>

            <Button
              onClick={handleContinue}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
            >
              Continue to Dashboard
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>

            <div className="text-center">
              <button
                onClick={() => setLocation("/login?force_logout=true")}
                className="text-gray-400 hover:text-gray-300 text-sm underline"
              >
                Sign in as different user
              </button>
            </div>
          </CardContent>
        </div>
      </Card>
    </div>
  );
}