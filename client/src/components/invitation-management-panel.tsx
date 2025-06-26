import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Users, 
  UserPlus, 
  Mail, 
  Shield, 
  UserCheck, 
  Clock, 
  CheckCircle, 
  XCircle,
  Copy,
  Send,
  AlertCircle
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { UserInvitation } from "@shared/schema";

export default function InvitationManagementPanel() {
  const { authUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [invitations, setInvitations] = useState<UserInvitation[]>([]);
  
  // Form state
  const [formData, setFormData] = useState({
    email: "",
    name: "",
    role: "",
    specialization: "",
    projectId: "",
    invitationType: "organization"
  });

  const roleOptions = [
    { value: "team_member", label: "Team Member", icon: Users, color: "bg-blue-500" },
    { value: "client", label: "Client", icon: UserCheck, color: "bg-green-500" }
  ];

  const specializationOptions = [
    { value: "developer", label: "Developer" },
    { value: "designer", label: "Designer" },
    { value: "project_manager", label: "Project Manager" }
  ];

  const resetForm = () => {
    setFormData({
      email: "",
      name: "",
      role: "",
      specialization: "",
      projectId: "",
      invitationType: "organization"
    });
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser) return;

    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      const invitationData = {
        ...formData,
        invitedBy: authUser.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        portalAccess: {
          onboardingFlow: formData.role === 'client' ? 'client' : 'team_member'
        }
      };

      const response = await fetch('/api/invitations/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invitationData),
      });

      if (response.ok) {
        const invitation = await response.json();
        setSuccess(`Invitation sent successfully to ${formData.email}`);
        resetForm();
        
        // Generate invitation URL
        const invitationUrl = `${window.location.origin}/login?invite=${invitation.token}`;
        navigator.clipboard.writeText(invitationUrl);
        setSuccess(prev => prev + ". Invitation link copied to clipboard!");
        
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to send invitation");
      }
    } catch (error) {
      console.error('Error sending invitation:', error);
      setError("Failed to send invitation. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (invitation: UserInvitation) => {
    switch (invitation.status) {
      case 'pending':
        return <Badge className="bg-yellow-500 text-white flex items-center gap-1"><Clock size={12} />Pending</Badge>;
      case 'accepted':
        return <Badge className="bg-green-500 text-white flex items-center gap-1"><CheckCircle size={12} />Accepted</Badge>;
      case 'expired':
        return <Badge className="bg-gray-500 text-white flex items-center gap-1"><XCircle size={12} />Expired</Badge>;
      case 'revoked':
        return <Badge className="bg-red-500 text-white flex items-center gap-1"><XCircle size={12} />Revoked</Badge>;
      default:
        return <Badge className="bg-gray-500 text-white">{invitation.status}</Badge>;
    }
  };

  const getRoleInfo = (role: string) => {
    const roleOption = roleOptions.find(r => r.value === role);
    if (roleOption) {
      const Icon = roleOption.icon;
      return (
        <Badge className={`${roleOption.color} text-white flex items-center gap-1`}>
          <Icon size={12} />
          {roleOption.label}
        </Badge>
      );
    }
    return <Badge className="bg-red-500 text-white flex items-center gap-1"><Shield size={12} />Admin</Badge>;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white">
          <UserPlus className="mr-2 h-4 w-4" />
          Send Invitation
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gray-800 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Send Team Invitation
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white text-lg">Invite New Member</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-gray-300">Full Name</Label>
                    <Input
                      id="name"
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter full name"
                      required
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-gray-300">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="Enter email address"
                      required
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="role" className="text-gray-300">Role</Label>
                    <Select onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}>
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-700 border-gray-600">
                        {roleOptions.map((role) => {
                          const Icon = role.icon;
                          return (
                            <SelectItem key={role.value} value={role.value} className="text-white">
                              <div className="flex items-center gap-2">
                                <Icon size={16} />
                                {role.label}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {formData.role === 'team_member' && (
                    <div className="space-y-2">
                      <Label htmlFor="specialization" className="text-gray-300">Specialization</Label>
                      <Select onValueChange={(value) => setFormData(prev => ({ ...prev, specialization: value }))}>
                        <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                          <SelectValue placeholder="Select specialization" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-700 border-gray-600">
                          {specializationOptions.map((spec) => (
                            <SelectItem key={spec.value} value={spec.value} className="text-white">
                              {spec.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invitationType" className="text-gray-300">Invitation Type</Label>
                  <Select 
                    value={formData.invitationType}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, invitationType: value }))}
                  >
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-gray-600">
                      <SelectItem value="organization" className="text-white">Organization-wide</SelectItem>
                      <SelectItem value="project" className="text-white">Project-specific</SelectItem>
                      <SelectItem value="client" className="text-white">Client access</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {error && (
                  <Alert className="border-red-800 bg-red-900/20">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-red-200">
                      {error}
                    </AlertDescription>
                  </Alert>
                )}

                {success && (
                  <Alert className="border-green-800 bg-green-900/20">
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription className="text-green-200">
                      {success}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsOpen(false)}
                    className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isLoading || !formData.role || !formData.email || !formData.name}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                  >
                    {isLoading ? (
                      <>
                        <Send className="mr-2 h-4 w-4 animate-pulse" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Send Invitation
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white text-lg">How Invitations Work</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-gray-300 space-y-2">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  <span>Invitation links are valid for 7 days</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  <span>Recipients can only access assigned roles and projects</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  <span>Team members and clients cannot sign up without invitations</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  <span>All invitation activity is logged for security</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}