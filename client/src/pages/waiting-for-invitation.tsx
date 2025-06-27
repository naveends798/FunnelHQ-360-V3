import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useUser, useClerk } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Clock, Mail, UserCheck, Users, Shield } from "lucide-react";

export default function WaitingForInvitationPage() {
  const { user } = useUser();
  const clerk = useClerk();
  const [, setLocation] = useLocation();
  const [userRole, setUserRole] = useState<string>("");

  useEffect(() => {
    if (user?.publicMetadata?.role) {
      setUserRole(user.publicMetadata.role as string);
    }
  }, [user]);

  const handleSignOut = async () => {
    await clerk?.signOut();
    setLocation("/login");
  };

  const handleBackToLogin = () => {
    setLocation("/login");
  };

  const getRoleDisplayInfo = (role: string) => {
    switch (role) {
      case 'team_member':
        return {
          label: 'Team Member',
          description: 'Project collaboration access',
          icon: Users,
          color: 'bg-blue-500'
        };
      case 'client':
        return {
          label: 'Client',
          description: 'Project viewing access',
          icon: UserCheck,
          color: 'bg-green-500'
        };
      default:
        return {
          label: 'User',
          description: 'Pending access',
          icon: UserCheck,
          color: 'bg-gray-500'
        };
    }
  };

  const roleInfo = getRoleDisplayInfo(userRole);
  const Icon = roleInfo.icon;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
      <Card className="w-full max-w-md bg-gray-800 border border-transparent bg-gradient-to-r from-yellow-500/20 to-orange-500/20 p-[1px] rounded-lg">
        <div className="bg-gray-800 rounded-lg p-6">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Clock className="h-16 w-16 text-yellow-500" />
            </div>
            <CardTitle className="text-2xl font-bold text-white mb-2">
              Waiting for Organization Access
            </CardTitle>
            <p className="text-gray-400">
              Your account has been created successfully
            </p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* User Role Display */}
            <div className="text-center">
              <p className="text-gray-400 mb-2">Account Type:</p>
              <div className="flex items-center justify-center gap-2">
                <div className={`${roleInfo.color} text-white flex items-center gap-1 px-3 py-1 rounded-full`}>
                  <Icon size={14} />
                  {roleInfo.label}
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {roleInfo.description}
              </p>
            </div>

            {/* Information Alert */}
            <Alert className="border-yellow-800 bg-yellow-900/20">
              <Mail className="h-4 w-4" />
              <AlertDescription className="text-yellow-200">
                <strong>Next Steps:</strong><br/>
                • An organization administrator needs to invite you<br/>
                • You'll receive an email invitation when access is granted<br/>
                • Your account is ready - just waiting for organization assignment
              </AlertDescription>
            </Alert>

            {/* Admin Contact Info */}
            <div className="text-center space-y-4">
              <div className="bg-gray-700/50 border border-gray-600 rounded p-4">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Shield className="h-4 w-4 text-purple-400" />
                  <span className="text-sm font-medium text-gray-300">Need Access?</span>
                </div>
                <p className="text-xs text-gray-400">
                  Contact your organization administrator to request access to their workspace.
                  They can invite you through their admin dashboard.
                </p>
              </div>

              {/* User Info */}
              {user && (
                <div className="text-xs text-gray-500 bg-gray-700/30 border border-gray-600 rounded p-3">
                  <p><strong>Email:</strong> {user.primaryEmailAddress?.emailAddress}</p>
                  <p><strong>Name:</strong> {user.firstName} {user.lastName}</p>
                  <p><strong>Account Status:</strong> <span className="text-green-400">Active</span></p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                onClick={handleBackToLogin}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
              >
                Back to Login
              </Button>
              
              <Button
                onClick={handleSignOut}
                variant="outline"
                className="w-full border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                Sign Out
              </Button>
            </div>

            {/* Help Text */}
            <div className="text-center">
              <p className="text-xs text-gray-500">
                If you believe this is an error or need immediate access,
                please contact your organization administrator.
              </p>
            </div>
          </CardContent>
        </div>
      </Card>
    </div>
  );
}