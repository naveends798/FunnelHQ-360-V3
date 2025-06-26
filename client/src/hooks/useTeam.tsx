import { useState, useEffect, useCallback } from "react";
import { TeamInvitation, User, UserRole } from "@shared/schema";

interface TeamMember extends User {
  role: string;
  status: string;
}

interface UseTeamReturn {
  teamMembers: TeamMember[];
  invitations: TeamInvitation[];
  loading: boolean;
  error: string | null;
  addTeamMember: (name: string, email: string, role: string, specialization?: string, avatarFile?: File | null) => Promise<void>;
  inviteUser: (email: string, role: string, specialization?: string) => Promise<void>;
  resendInvitation: (invitationId: number) => Promise<void>;
  cancelInvitation: (invitationId: number) => Promise<void>;
  updateMemberRole: (userId: number, role: string) => Promise<void>;
  suspendMember: (userId: number, suspend: boolean) => Promise<void>;
  refetch: () => Promise<void>;
}

interface UseTeamOptions {
  organizationId: number;
}

export function useTeam({ organizationId }: UseTeamOptions): UseTeamReturn {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTeamMembers = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch(`/api/team/members?organizationId=${organizationId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch team members");
      }
      const data = await response.json();
      setTeamMembers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }, [organizationId]);

  const fetchInvitations = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch(`/api/team/invitations?organizationId=${organizationId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch invitations");
      }
      const data = await response.json();
      setInvitations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }, [organizationId]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchTeamMembers(), fetchInvitations()]);
    setLoading(false);
  }, [fetchTeamMembers, fetchInvitations]);

  const addTeamMember = useCallback(async (name: string, email: string, role: string, specialization?: string, avatarFile?: File | null) => {
    try {
      console.log('🔍 Adding team member:', { organizationId, name, email, role, specialization, hasAvatar: !!avatarFile });
      
      const formData = new FormData();
      formData.append('organizationId', organizationId.toString());
      formData.append('email', email);
      formData.append('name', name);
      formData.append('role', role);
      if (specialization) {
        formData.append('specialization', specialization);
      }
      if (avatarFile) {
        formData.append('avatar', avatarFile);
      }

      const response = await fetch("/api/team/add-member", {
        method: "POST",
        body: formData, // Don't set Content-Type header when using FormData
      });

      console.log('🔍 Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error('❌ API Error:', errorData);
        throw new Error(`Failed to add team member: ${response.status} ${errorData}`);
      }

      const result = await response.json();
      console.log('✅ Team member added successfully:', result);

      // Refresh team members list
      await fetchTeamMembers();
    } catch (err) {
      console.error('❌ Add team member error:', err);
      throw new Error(err instanceof Error ? err.message : "Failed to add team member");
    }
  }, [organizationId, fetchTeamMembers]);

  const inviteUser = useCallback(async (email: string, role: string, specialization?: string) => {
    try {
      console.log('🔍 Sending invitation:', { organizationId, email, role, specialization });
      
      const response = await fetch("/api/team/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          organizationId,
          email,
          name: email.split('@')[0], // Use email username as name placeholder
          role,
          specialization,
          invitedBy: 1, // TODO: Get from auth context
          expiresAt: new Date(Date.now() + 7 * 86400000), // 7 days
        }),
      });

      console.log('🔍 Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error('❌ API Error:', errorData);
        throw new Error(`Failed to send invitation: ${response.status} ${errorData}`);
      }

      const result = await response.json();
      console.log('✅ Invitation successful:', result);

      // Refresh invitations list
      await fetchInvitations();
    } catch (err) {
      console.error('❌ Invitation error:', err);
      throw new Error(err instanceof Error ? err.message : "Failed to invite user");
    }
  }, [organizationId, fetchInvitations]);

  const resendInvitation = useCallback(async (invitationId: number) => {
    try {
      const response = await fetch(`/api/team/invitations/${invitationId}/resend`, {
        method: "PATCH",
      });

      if (!response.ok) {
        throw new Error("Failed to resend invitation");
      }

      // Refresh invitations list
      await fetchInvitations();
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : "Failed to resend invitation");
    }
  }, [fetchInvitations]);

  const cancelInvitation = useCallback(async (invitationId: number) => {
    try {
      const response = await fetch(`/api/team/invitations/${invitationId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to cancel invitation");
      }

      // Remove from local state
      setInvitations(prev => prev.filter(inv => inv.id !== invitationId));
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : "Failed to cancel invitation");
    }
  }, []);

  const updateMemberRole = useCallback(async (userId: number, role: string) => {
    try {
      const response = await fetch(`/api/team/members/${userId}/role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          role,
          organizationId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update member role");
      }

      // Update local state
      setTeamMembers(prev =>
        prev.map(member =>
          member.id === userId
            ? { ...member, role }
            : member
        )
      );
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : "Failed to update member role");
    }
  }, [organizationId]);

  const suspendMember = useCallback(async (userId: number, suspend: boolean) => {
    try {
      const response = await fetch(`/api/team/members/${userId}/suspend`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          suspend,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update member status");
      }

      // Update local state
      setTeamMembers(prev =>
        prev.map(member =>
          member.id === userId
            ? { ...member, status: suspend ? "suspended" : "active" }
            : member
        )
      );
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : "Failed to update member status");
    }
  }, []);

  const refetch = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    teamMembers,
    invitations,
    loading,
    error,
    addTeamMember,
    inviteUser,
    resendInvitation,
    cancelInvitation,
    updateMemberRole,
    suspendMember,
    refetch,
  };
}