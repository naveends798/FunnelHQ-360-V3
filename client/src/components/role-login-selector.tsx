import { useState } from "react";
import { useLocation } from "wouter";
import { Shield, Users, UserCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface RoleInfo {
  value: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
  portalPath: string;
}

const roleOptions: RoleInfo[] = [
  {
    value: 'admin',
    label: 'Administrator',
    description: 'Full system access and management capabilities',
    icon: Shield,
    color: 'bg-red-500',
    portalPath: '/dashboard'
  },
  {
    value: 'team_member',
    label: 'Team Member',
    description: 'Project collaboration and team management',
    icon: Users,
    color: 'bg-blue-500',
    portalPath: '/projects'
  },
  {
    value: 'client',
    label: 'Client',
    description: 'Project viewing and client collaboration',
    icon: UserCheck,
    color: 'bg-green-500',
    portalPath: '/client-dashboard'
  }
];

export default function RoleLoginSelector() {
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [, setLocation] = useLocation();

  const handleRoleSelect = (roleValue: string) => {
    setSelectedRole(roleValue);
  };

  const handleContinue = () => {
    if (selectedRole) {
      const role = roleOptions.find(r => r.value === selectedRole);
      if (role) {
        // Navigate to role-specific login with role parameter
        setLocation(`/login?role=${selectedRole}&portal=${encodeURIComponent(role.portalPath)}`);
      }
    }
  };

  const selectedRoleInfo = roleOptions.find(r => r.value === selectedRole);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
      <Card className="w-full max-w-md bg-gray-800 border border-transparent bg-gradient-to-r from-purple-500/20 to-pink-500/20 p-[1px] rounded-lg">
        <div className="bg-gray-800 rounded-lg p-6">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-white mb-2">
              Select Your Role
            </CardTitle>
            <p className="text-gray-400">
              Choose your role to access the appropriate portal
            </p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">
                I am logging in as:
              </label>
              <Select value={selectedRole} onValueChange={handleRoleSelect}>
                <SelectTrigger className="w-full bg-gray-700 border-gray-600 text-white">
                  <SelectValue placeholder="Select your role..." />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  {roleOptions.map((role) => {
                    const Icon = role.icon;
                    return (
                      <SelectItem 
                        key={role.value} 
                        value={role.value}
                        className="text-white hover:bg-gray-600 focus:bg-gray-600"
                      >
                        <div className="flex items-center gap-2">
                          <Icon size={16} />
                          <span>{role.label}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {selectedRoleInfo && (
              <div className="space-y-4 p-4 bg-gray-700/50 rounded-lg border border-gray-600">
                <div className="flex items-center justify-center gap-2">
                  <Badge className={`${selectedRoleInfo.color} text-white flex items-center gap-1 px-3 py-1`}>
                    <selectedRoleInfo.icon size={14} />
                    {selectedRoleInfo.label}
                  </Badge>
                </div>
                <p className="text-sm text-gray-300 text-center">
                  {selectedRoleInfo.description}
                </p>
                <div className="text-xs text-gray-400 text-center">
                  Portal Access: <span className="text-blue-400">{selectedRoleInfo.portalPath}</span>
                </div>
              </div>
            )}

            <Button
              onClick={handleContinue}
              disabled={!selectedRole}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue to Login
            </Button>

            <div className="text-center">
              <p className="text-gray-400 text-sm">
                Don't have an account?{" "}
                <button
                  onClick={() => setLocation("/signup")}
                  className="text-blue-400 hover:text-blue-300 underline"
                >
                  Contact administrator for invitation
                </button>
              </p>
            </div>
          </CardContent>
        </div>
      </Card>
    </div>
  );
}