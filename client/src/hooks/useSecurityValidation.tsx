import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';

export interface SecurityValidationResult {
  isValid: boolean;
  violations: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  requiredActions: string[];
}

export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  userId: string;
  action: string;
  resource: string;
  ipAddress?: string;
  userAgent?: string;
  result: 'success' | 'failure' | 'blocked';
  metadata?: Record<string, any>;
}

export function useSecurityValidation() {
  const { currentRole, authUser } = useAuth();
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [isLoggingEnabled, setIsLoggingEnabled] = useState(true);

  // Security validation rules
  const validateRoleAccess = (requiredRole: string, requiredPermission?: string): SecurityValidationResult => {
    const violations: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    const requiredActions: string[] = [];

    // Check if user has required role
    if (currentRole !== requiredRole && currentRole !== 'admin') {
      violations.push(`Insufficient role: required ${requiredRole}, current ${currentRole}`);
      riskLevel = 'high';
      requiredActions.push('Contact administrator for role upgrade');
    }

    // Check for admin-only actions by non-admins
    if (requiredRole === 'admin' && currentRole !== 'admin') {
      violations.push('Administrative access required');
      riskLevel = 'critical';
      requiredActions.push('Administrative privileges required');
    }

    // Check for team member attempting client-only actions
    if (requiredRole === 'client' && currentRole === 'team_member') {
      violations.push('Client-specific access attempted by team member');
      riskLevel = 'medium';
      requiredActions.push('Access restricted to clients only');
    }

    return {
      isValid: violations.length === 0,
      violations,
      riskLevel,
      requiredActions
    };
  };

  const validateInvitationSecurity = (invitation: any): SecurityValidationResult => {
    const violations: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    const requiredActions: string[] = [];

    // Check invitation expiration
    if (invitation.expiresAt && new Date(invitation.expiresAt) < new Date()) {
      violations.push('Invitation has expired');
      riskLevel = 'high';
      requiredActions.push('Request new invitation from administrator');
    }

    // Check invitation status
    if (invitation.status !== 'pending') {
      violations.push(`Invalid invitation status: ${invitation.status}`);
      riskLevel = 'high';
      requiredActions.push('Use a valid, pending invitation');
    }

    // Check for suspicious invitation patterns
    if (invitation.usedAt && invitation.acceptedAt) {
      const timeDiff = new Date(invitation.usedAt).getTime() - new Date(invitation.acceptedAt).getTime();
      if (timeDiff < 0) {
        violations.push('Invitation timestamps are inconsistent');
        riskLevel = 'critical';
        requiredActions.push('Report suspicious activity to administrator');
      }
    }

    return {
      isValid: violations.length === 0,
      violations,
      riskLevel,
      requiredActions
    };
  };

  const validateProjectAccess = (projectId: number, action: string): SecurityValidationResult => {
    const violations: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    const requiredActions: string[] = [];

    // Admins have access to all projects
    if (currentRole === 'admin') {
      return { isValid: true, violations: [], riskLevel: 'low', requiredActions: [] };
    }

    // For non-admins, check project-specific access
    // This would typically involve checking the user's project assignments
    // For now, we'll implement basic role-based validation

    const destructiveActions = ['delete', 'archive', 'transfer'];
    if (destructiveActions.includes(action) && currentRole !== 'admin') {
      violations.push(`Destructive action '${action}' requires administrator privileges`);
      riskLevel = 'critical';
      requiredActions.push('Contact administrator for destructive operations');
    }

    const teamMemberActions = ['view', 'edit', 'comment', 'upload'];
    if (!teamMemberActions.includes(action) && currentRole === 'team_member') {
      violations.push(`Action '${action}' not allowed for team members`);
      riskLevel = 'medium';
      requiredActions.push('Limited to viewing and collaboration actions');
    }

    const clientActions = ['view', 'comment'];
    if (!clientActions.includes(action) && currentRole === 'client') {
      violations.push(`Action '${action}' not allowed for clients`);
      riskLevel = 'medium';
      requiredActions.push('Limited to viewing and commenting');
    }

    return {
      isValid: violations.length === 0,
      violations,
      riskLevel,
      requiredActions
    };
  };

  // Audit logging functions
  const logSecurityEvent = async (
    action: string,
    resource: string,
    result: 'success' | 'failure' | 'blocked',
    metadata?: Record<string, any>
  ) => {
    if (!isLoggingEnabled || !authUser) return;

    const auditEntry: AuditLogEntry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      userId: authUser.id.toString(),
      action,
      resource,
      result,
      metadata: {
        userRole: currentRole,
        ...metadata
      }
    };

    // Add to local audit log
    setAuditLog(prev => [auditEntry, ...prev.slice(0, 99)]); // Keep last 100 entries

    // In a real application, this would send to a secure audit service
    try {
      await fetch('/api/audit/security', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(auditEntry),
      });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  };

  const logRoleViolation = async (violation: SecurityValidationResult, attemptedAction: string) => {
    await logSecurityEvent(
      'role_violation',
      attemptedAction,
      'blocked',
      {
        violations: violation.violations,
        riskLevel: violation.riskLevel,
        requiredActions: violation.requiredActions
      }
    );
  };

  const logInvitationEvent = async (
    invitationId: string,
    eventType: 'validate' | 'accept' | 'reject' | 'expire',
    result: 'success' | 'failure'
  ) => {
    await logSecurityEvent(
      `invitation_${eventType}`,
      `invitation:${invitationId}`,
      result,
      {
        invitationId,
        eventType
      }
    );
  };

  const logProjectAccess = async (
    projectId: number,
    action: string,
    result: 'success' | 'failure' | 'blocked'
  ) => {
    await logSecurityEvent(
      'project_access',
      `project:${projectId}`,
      result,
      {
        projectId,
        accessAction: action
      }
    );
  };

  // Security monitoring
  const getSecuritySummary = () => {
    const recentEvents = auditLog.slice(0, 50);
    const failedAttempts = recentEvents.filter(entry => entry.result === 'failure' || entry.result === 'blocked');
    const suspiciousActivity = failedAttempts.length > 5;

    return {
      totalEvents: recentEvents.length,
      failedAttempts: failedAttempts.length,
      suspiciousActivity,
      lastFailedAttempt: failedAttempts[0]?.timestamp,
      riskScore: suspiciousActivity ? 'high' : failedAttempts.length > 2 ? 'medium' : 'low'
    };
  };

  return {
    // Validation functions
    validateRoleAccess,
    validateInvitationSecurity,
    validateProjectAccess,

    // Audit logging
    logSecurityEvent,
    logRoleViolation,
    logInvitationEvent,
    logProjectAccess,

    // Security monitoring
    auditLog,
    getSecuritySummary,
    isLoggingEnabled,
    setIsLoggingEnabled,
  };
}