import { useState } from "react";
import { useUser, useOrganization } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Shield, Crown, User, Save } from "lucide-react";

type UserRole = "admin" | "team_member" | "client";

export function UserRoleManager() {
  const { user, isLoaded: userLoaded } = useUser();
  const { membership, organization } = useOrganization();
  const { toast } = useToast();
  
  const [isUpdating, setIsUpdating] = useState(false);

  if (!userLoaded || !user) {
    return null;
  }

  // Get current role from organization membership or user metadata
  const currentRole = membership?.role || (user.publicMetadata?.role as UserRole) || "team_member";
  
  const handleUpdateMetadata = async (key: string, value: any) => {
    setIsUpdating(true);
    try {
      await user.update({
        publicMetadata: {
          ...user.publicMetadata,
          [key]: value
        }
      });
      
      toast({
        title: "Metadata updated",
        description: `Successfully updated ${key}`,
      });
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update metadata",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Crown className="h-4 w-4" />;
      case "team_member":
        return <Shield className="h-4 w-4" />;
      case "client":
        return <User className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 gap-1">
          {getRoleIcon(role)} Admin
        </Badge>;
      case "team_member":
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 gap-1">
          {getRoleIcon(role)} Team Member
        </Badge>;
      case "client":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30 gap-1">
          {getRoleIcon(role)} Client
        </Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white">User Role & Metadata</CardTitle>
        <CardDescription>
          Manage user roles and custom metadata for {user.emailAddresses?.[0]?.emailAddress}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Role Display */}
        <div className="space-y-2">
          <Label>Current Role</Label>
          <div className="flex items-center gap-2">
            {getRoleBadge(currentRole)}
            {membership && (
              <span className="text-sm text-gray-400">
                (from {organization?.name})
              </span>
            )}
          </div>
        </div>

        {/* User Metadata */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-white">User Metadata</h4>
          
          {/* Default Role (when not in organization) */}
          {!membership && (
            <div className="space-y-2">
              <Label htmlFor="default-role">Default Role</Label>
              <div className="flex gap-2">
                <Select
                  value={(user.publicMetadata?.role as string) || "team_member"}
                  onValueChange={(value) => handleUpdateMetadata("role", value)}
                  disabled={isUpdating}
                >
                  <SelectTrigger id="default-role" className="bg-gray-700 border-gray-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="team_member">Team Member</SelectItem>
                    <SelectItem value="client">Client</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-gray-400">
                This role is used when you're not part of any organization
              </p>
            </div>
          )}

          {/* Custom Metadata Fields */}
          <div className="space-y-2">
            <Label>Public Metadata</Label>
            <pre className="bg-gray-900 border border-gray-700 rounded p-3 text-xs text-gray-300 overflow-auto">
              {JSON.stringify(user.publicMetadata || {}, null, 2)}
            </pre>
          </div>

          {/* Private Metadata (only visible in backend) */}
          <div className="space-y-2">
            <Label>Private Metadata</Label>
            <pre className="bg-gray-900 border border-gray-700 rounded p-3 text-xs text-gray-300 overflow-auto">
              {JSON.stringify(user.privateMetadata || {}, null, 2)}
            </pre>
            <p className="text-xs text-gray-400">
              Private metadata is only accessible from your backend
            </p>
          </div>
        </div>

        {/* Organization Metadata */}
        {organization && (
          <div className="space-y-4 border-t border-gray-700 pt-4">
            <h4 className="text-sm font-medium text-white">Organization Metadata</h4>
            
            <div className="space-y-2">
              <Label>Organization: {organization.name}</Label>
              <pre className="bg-gray-900 border border-gray-700 rounded p-3 text-xs text-gray-300 overflow-auto">
                {JSON.stringify(organization.publicMetadata || {}, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}