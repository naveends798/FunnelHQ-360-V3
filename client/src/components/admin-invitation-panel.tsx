import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  UserPlus, 
  Mail, 
  Shield, 
  Users, 
  UserCheck, 
  Copy, 
  Trash2, 
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface Invitation {
  id: string;
  email: string;
  role: 'admin' | 'team_member' | 'client';
  name?: string;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  created_at: string;
  expires_at?: string;
  invitationUrl?: string;
  project_id?: string;
  organization_id: string;
  invited_by: string;
}

interface InviteFormData {
  email: string;
  role: 'admin' | 'team_member' | 'client';
  name: string;
  projectId?: string;
}

const roleOptions = [
  {
    value: 'admin',
    label: 'Administrator',
    description: 'Full system access and management',
    icon: Shield,
    color: 'bg-red-500'
  },
  {
    value: 'team_member',
    label: 'Team Member',
    description: 'Project collaboration access',
    icon: Users,
    color: 'bg-blue-500'
  },
  {
    value: 'client',
    label: 'Client',
    description: 'Project viewing access',
    icon: UserCheck,
    color: 'bg-green-500'
  }
];

const statusConfig = {
  pending: { label: 'Pending', color: 'bg-yellow-500', icon: Clock },
  accepted: { label: 'Accepted', color: 'bg-green-500', icon: CheckCircle },
  expired: { label: 'Expired', color: 'bg-gray-500', icon: AlertCircle },
  cancelled: { label: 'Cancelled', color: 'bg-red-500', icon: XCircle }
};

export default function AdminInvitationPanel() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const { currentRole } = useAuth();

  const [formData, setFormData] = useState<InviteFormData>({
    email: '',
    role: 'team_member',
    name: ''
  });

  // Only show this panel for admins
  if (currentRole !== 'admin') {
    return null;
  }

  const fetchInvitations = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/invitations/list/1'); // TODO: Use dynamic org ID
      if (response.ok) {
        const data = await response.json();
        setInvitations(data);
      } else {
        setError('Failed to fetch invitations');
      }
    } catch (error) {
      console.error('Error fetching invitations:', error);
      setError('Failed to fetch invitations');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvitations();
  }, []);

  const handleSubmitInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!formData.email || !formData.role) {
      setError("Email and role are required");
      return;
    }

    try {
      setIsLoading(true);
      
      const invitationData = {
        email: formData.email,
        role: formData.role,
        name: formData.name || formData.email.split('@')[0],
        organizationId: '1', // TODO: Use dynamic org ID
        invitedBy: 'current-admin-id', // TODO: Get from auth context
        projectId: formData.projectId || null
      };

      const response = await fetch('/api/invitations/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invitationData),
      });

      if (response.ok) {
        const result = await response.json();
        setSuccess(`Invitation sent to ${formData.email}`);
        setFormData({ email: '', role: 'team_member', name: '' });
        setIsInviteDialogOpen(false);
        fetchInvitations(); // Refresh the list
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to send invitation');
      }
    } catch (error) {
      console.error('Error sending invitation:', error);
      setError('Failed to send invitation');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      const response = await fetch(`/api/invitations/${invitationId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSuccess('Invitation cancelled');
        fetchInvitations();
      } else {
        setError('Failed to cancel invitation');
      }
    } catch (error) {
      console.error('Error cancelling invitation:', error);
      setError('Failed to cancel invitation');
    }
  };

  const handleCopyInvitationLink = (invitation: Invitation) => {
    if (invitation.invitationUrl) {
      navigator.clipboard.writeText(invitation.invitationUrl);
      setSuccess('Invitation link copied to clipboard');
    }
  };

  const getRoleInfo = (role: string) => {
    return roleOptions.find(r => r.value === role) || roleOptions[1];
  };

  const getStatusInfo = (status: string) => {
    return statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Team Invitations
        </CardTitle>
        
        <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Invite Member
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Invite New Team Member</DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmitInvitation} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="user@example.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Name (Optional)</Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Full name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select 
                  value={formData.role} 
                  onValueChange={(value: 'admin' | 'team_member' | 'client') => 
                    setFormData({ ...formData, role: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((role) => {
                      const Icon = role.icon;
                      return (
                        <SelectItem key={role.value} value={role.value}>
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

              {formData.role && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">
                    {getRoleInfo(formData.role).description}
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <Button type="submit" disabled={isLoading} className="flex-1">
                  {isLoading ? 'Sending...' : 'Send Invitation'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsInviteDialogOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sent</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4">
                    Loading invitations...
                  </TableCell>
                </TableRow>
              ) : invitations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4 text-gray-500">
                    No invitations sent yet
                  </TableCell>
                </TableRow>
              ) : (
                invitations.map((invitation) => {
                  const roleInfo = getRoleInfo(invitation.role);
                  const statusInfo = getStatusInfo(invitation.status);
                  const RoleIcon = roleInfo.icon;
                  const StatusIcon = statusInfo.icon;

                  return (
                    <TableRow key={invitation.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{invitation.name || invitation.email}</div>
                          <div className="text-sm text-gray-500">{invitation.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${roleInfo.color} text-white flex items-center gap-1 w-fit`}>
                          <RoleIcon size={12} />
                          {roleInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${statusInfo.color} text-white flex items-center gap-1 w-fit`}>
                          <StatusIcon size={12} />
                          {statusInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-500">
                          {new Date(invitation.created_at).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {invitation.status === 'pending' && invitation.invitationUrl && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCopyInvitationLink(invitation)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          )}
                          {invitation.status === 'pending' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCancelInvitation(invitation.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}