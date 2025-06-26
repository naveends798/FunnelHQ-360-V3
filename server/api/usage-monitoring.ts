import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { storage } from '../storage';
import { authenticateUser, requireOrganizationAccess } from './auth-middleware';
import { BILLING_PLANS } from '@shared/schema';

const router = Router();

// Server-side Supabase client with service role key
const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface UsageMetrics {
  projects: number;
  activeProjects: number;
  clients: number;
  teamMembers: number;
  activeTeamMembers: number;
  tasks: number;
  completedTasks: number;
  comments: number;
  documents: number;
  storage: {
    total: number;
    documents: number;
    avatars: number;
  };
  activity: {
    logins: number;
    apiRequests: number;
  };
}

interface PlanLimits {
  projects: number; // -1 for unlimited
  teamMembers: number; // -1 for unlimited  
  storage: number; // bytes
}

// Get current organization usage
router.get('/usage',
  authenticateUser,
  requireOrganizationAccess(),
  async (req: any, res) => {
    try {
      const organizationId = parseInt(req.organizationId);

      const usage = await calculateCurrentUsage(organizationId);
      const org = await storage.getOrganization(organizationId);
      
      if (!org) {
        return res.status(404).json({ error: 'Organization not found' });
      }

      const planLimits = getPlanLimits(org.plan);
      const limitStatus = checkLimitStatus(usage, planLimits);

      res.json({
        organizationId,
        plan: org.plan,
        usage,
        limits: planLimits,
        limitStatus,
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error fetching usage:', error);
      res.status(500).json({ error: 'Failed to fetch usage data' });
    }
  }
);

// Get usage tracking history
router.get('/usage/history',
  authenticateUser,
  requireOrganizationAccess(),
  async (req: any, res) => {
    try {
      const organizationId = parseInt(req.organizationId);
      const { period = 'monthly', limit = 12 } = req.query;

      const { data: history, error } = await supabase
        .from('organization_usage_tracking')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('tracking_period', period)
        .order('period_start', { ascending: false })
        .limit(parseInt(limit));

      if (error) throw error;

      res.json({
        organizationId,
        period,
        history: history || [],
        summary: history ? calculateUsageTrends(history) : null
      });
    } catch (error) {
      console.error('Error fetching usage history:', error);
      res.status(500).json({ error: 'Failed to fetch usage history' });
    }
  }
);

// Get active plan limit violations
router.get('/violations',
  authenticateUser,
  requireOrganizationAccess(),
  async (req: any, res) => {
    try {
      const organizationId = parseInt(req.organizationId);

      const { data: violations, error } = await supabase
        .from('plan_limit_violations')
        .select('*')
        .eq('organization_id', organizationId)
        .is('resolved_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      res.json({
        organizationId,
        activeViolations: violations || [],
        summary: violations ? summarizeViolations(violations) : null
      });
    } catch (error) {
      console.error('Error fetching violations:', error);
      res.status(500).json({ error: 'Failed to fetch violations' });
    }
  }
);

// Get usage alerts
router.get('/alerts',
  authenticateUser,
  requireOrganizationAccess(),
  async (req: any, res) => {
    try {
      const organizationId = parseInt(req.organizationId);
      const { severity, resolved = false } = req.query;

      let query = supabase
        .from('usage_alerts')
        .select('*')
        .eq('organization_id', organizationId);

      if (severity) {
        query = query.eq('severity', severity);
      }

      if (!resolved) {
        query = query.is('resolved_at', null);
      }

      query = query.order('created_at', { ascending: false }).limit(50);

      const { data: alerts, error } = await query;

      if (error) throw error;

      res.json({
        organizationId,
        alerts: alerts || [],
        unreadCount: alerts?.filter(a => !a.resolvedAt).length || 0
      });
    } catch (error) {
      console.error('Error fetching alerts:', error);
      res.status(500).json({ error: 'Failed to fetch alerts' });
    }
  }
);

// Acknowledge usage alert
router.patch('/alerts/:alertId/acknowledge',
  authenticateUser,
  requireOrganizationAccess(),
  async (req: any, res) => {
    try {
      const alertId = parseInt(req.params.alertId);
      const userId = parseInt(req.userId);
      const organizationId = parseInt(req.organizationId);

      // Get current alert
      const { data: alert, error: fetchError } = await supabase
        .from('usage_alerts')
        .select('*')
        .eq('id', alertId)
        .eq('organization_id', organizationId)
        .single();

      if (fetchError || !alert) {
        return res.status(404).json({ error: 'Alert not found' });
      }

      // Add user to acknowledged list
      const acknowledgedBy = [...(alert.acknowledged_by || []), userId];
      const isResolved = acknowledgedBy.length >= (alert.sent_to_users || []).length;

      const { data: updatedAlert, error } = await supabase
        .from('usage_alerts')
        .update({
          acknowledged_by: acknowledgedBy,
          resolved_at: isResolved ? new Date().toISOString() : null
        })
        .eq('id', alertId)
        .select()
        .single();

      if (error) throw error;

      res.json({
        success: true,
        alert: updatedAlert,
        message: isResolved ? 'Alert resolved' : 'Alert acknowledged'
      });
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      res.status(500).json({ error: 'Failed to acknowledge alert' });
    }
  }
);

// Force usage recalculation (admin only)
router.post('/recalculate',
  authenticateUser,
  requireOrganizationAccess(['manage_organization']),
  async (req: any, res) => {
    try {
      const organizationId = parseInt(req.organizationId);

      const usage = await calculateCurrentUsage(organizationId);
      await recordUsageSnapshot(organizationId, usage, 'manual');

      // Check for violations
      const org = await storage.getOrganization(organizationId);
      if (org) {
        const violations = await checkAndRecordViolations(organizationId, usage, org.plan);
        
        res.json({
          success: true,
          usage,
          violations,
          message: 'Usage recalculated successfully'
        });
      } else {
        res.status(404).json({ error: 'Organization not found' });
      }
    } catch (error) {
      console.error('Error recalculating usage:', error);
      res.status(500).json({ error: 'Failed to recalculate usage' });
    }
  }
);

// Get usage comparison between periods
router.get('/usage/compare',
  authenticateUser,
  requireOrganizationAccess(),
  async (req: any, res) => {
    try {
      const organizationId = parseInt(req.organizationId);
      const { period1, period2 } = req.query;

      if (!period1 || !period2) {
        return res.status(400).json({ error: 'Both period1 and period2 are required' });
      }

      const [usage1, usage2] = await Promise.all([
        getUsageForPeriod(organizationId, period1),
        getUsageForPeriod(organizationId, period2)
      ]);

      const comparison = calculateUsageComparison(usage1, usage2);

      res.json({
        organizationId,
        periods: { period1, period2 },
        usage: { period1: usage1, period2: usage2 },
        comparison
      });
    } catch (error) {
      console.error('Error comparing usage:', error);
      res.status(500).json({ error: 'Failed to compare usage' });
    }
  }
);

// Helper function to calculate current usage
async function calculateCurrentUsage(organizationId: number): Promise<UsageMetrics> {
  const [
    { count: projectsCount },
    { count: activeProjectsCount },
    { count: clientsCount },
    { count: teamMembersCount },
    { count: tasksCount },
    { count: commentsCount },
    { count: documentsCount }
  ] = await Promise.all([
    supabase.from('projects').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId),
    supabase.from('projects').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId).eq('status', 'active'),
    supabase.from('clients').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId),
    supabase.from('organization_memberships').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId).eq('is_active', true),
    supabase.from('project_tasks').select('*', { count: 'exact', head: true }),
    supabase.from('project_comments').select('*', { count: 'exact', head: true }),
    supabase.from('documents').select('*', { count: 'exact', head: true })
  ]);

  // Get completed tasks count
  const { count: completedTasksCount } = await supabase
    .from('project_tasks')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'done');

  // Calculate storage usage
  const storageUsage = await calculateStorageUsage(organizationId);

  // Get active team members (logged in last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { count: activeTeamMembersCount } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .gte('last_login_at', thirtyDaysAgo);

  return {
    projects: projectsCount || 0,
    activeProjects: activeProjectsCount || 0,
    clients: clientsCount || 0,
    teamMembers: teamMembersCount || 0,
    activeTeamMembers: activeTeamMembersCount || 0,
    tasks: tasksCount || 0,
    completedTasks: completedTasksCount || 0,
    comments: commentsCount || 0,
    documents: documentsCount || 0,
    storage: storageUsage,
    activity: {
      logins: 0, // Would need activity tracking
      apiRequests: 0 // Would need request logging
    }
  };
}

// Helper function to get plan limits
function getPlanLimits(plan: string): PlanLimits {
  const planDetails = BILLING_PLANS[plan as keyof typeof BILLING_PLANS];
  
  if (!planDetails) {
    // Default to solo plan limits
    return {
      projects: 3,
      teamMembers: 0,
      storage: 5 * 1024 * 1024 * 1024 // 5GB
    };
  }

  return {
    projects: planDetails.limits.projects,
    teamMembers: planDetails.limits.collaborators,
    storage: planDetails.limits.storage
  };
}

// Helper function to check limit status
function checkLimitStatus(usage: UsageMetrics, limits: PlanLimits): any {
  const status = {
    projects: {
      usage: usage.projects,
      limit: limits.projects,
      exceeded: limits.projects !== -1 && usage.projects > limits.projects,
      percentage: limits.projects === -1 ? 0 : Math.round((usage.projects / limits.projects) * 100)
    },
    teamMembers: {
      usage: usage.teamMembers,
      limit: limits.teamMembers,
      exceeded: limits.teamMembers !== -1 && usage.teamMembers > limits.teamMembers,
      percentage: limits.teamMembers === -1 ? 0 : Math.round((usage.teamMembers / limits.teamMembers) * 100)
    },
    storage: {
      usage: usage.storage.total,
      limit: limits.storage,
      exceeded: usage.storage.total > limits.storage,
      percentage: Math.round((usage.storage.total / limits.storage) * 100)
    }
  };

  return {
    ...status,
    anyExceeded: status.projects.exceeded || status.teamMembers.exceeded || status.storage.exceeded,
    approaching: Object.values(status).some((s: any) => s.percentage > 80 && s.percentage <= 100)
  };
}

// Helper function to calculate storage usage
async function calculateStorageUsage(organizationId: number): Promise<{total: number, documents: number, avatars: number}> {
  // This would need to calculate actual file sizes
  // For now, return estimated values
  const { data: documents } = await supabase
    .from('documents')
    .select('size')
    .not('size', 'is', null);

  const documentsSize = documents?.reduce((total, doc) => total + (doc.size || 0), 0) || 0;

  // Estimate avatar storage (rough estimate)
  const { count: avatarCount } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .not('avatar', 'is', null);

  const avatarsSize = (avatarCount || 0) * 50000; // ~50KB per avatar

  return {
    total: documentsSize + avatarsSize,
    documents: documentsSize,
    avatars: avatarsSize
  };
}

// Helper function to record usage snapshot
async function recordUsageSnapshot(organizationId: number, usage: UsageMetrics, period: string): Promise<void> {
  const org = await storage.getOrganization(organizationId);
  if (!org) return;

  const limits = getPlanLimits(org.plan);
  const limitStatus = checkLimitStatus(usage, limits);

  await supabase
    .from('organization_usage_tracking')
    .insert({
      organization_id: organizationId,
      tracking_period: period,
      period_start: new Date().toISOString(),
      period_end: new Date().toISOString(),
      projects_count: usage.projects,
      active_projects_count: usage.activeProjects,
      clients_count: usage.clients,
      team_members_count: usage.teamMembers,
      active_team_members_count: usage.activeTeamMembers,
      tasks_count: usage.tasks,
      completed_tasks_count: usage.completedTasks,
      comments_count: usage.comments,
      documents_count: usage.documents,
      total_storage_used: usage.storage.total,
      documents_storage: usage.storage.documents,
      avatars_storage: usage.storage.avatars,
      login_count: usage.activity.logins,
      api_requests_count: usage.activity.apiRequests,
      projects_limit_exceeded: limitStatus.projects.exceeded,
      team_members_limit_exceeded: limitStatus.teamMembers.exceeded,
      storage_limit_exceeded: limitStatus.storage.exceeded,
      plan: org.plan
    });
}

// Helper function to check and record violations
async function checkAndRecordViolations(organizationId: number, usage: UsageMetrics, plan: string): Promise<any[]> {
  const limits = getPlanLimits(plan);
  const violations = [];

  // Check each limit type
  const checks = [
    { type: 'projects', usage: usage.projects, limit: limits.projects },
    { type: 'team_members', usage: usage.teamMembers, limit: limits.teamMembers },
    { type: 'storage', usage: usage.storage.total, limit: limits.storage }
  ];

  for (const check of checks) {
    if (check.limit !== -1 && check.usage > check.limit) {
      const violation = {
        organization_id: organizationId,
        violation_type: check.type,
        current_usage: check.usage,
        plan_limit: check.limit,
        violation_level: check.usage > check.limit * 1.2 ? 'hard_limit' : 'soft_limit',
        metadata: {
          previousUsage: 0, // Would need historical data
          recommendedAction: check.type === 'storage' ? 'cleanup_files' : 'upgrade_plan'
        }
      };

      const { data } = await supabase
        .from('plan_limit_violations')
        .insert(violation)
        .select()
        .single();

      violations.push(data);
    }
  }

  return violations;
}

// Helper functions for trends and comparisons
function calculateUsageTrends(history: any[]): any {
  if (history.length < 2) return null;

  const latest = history[0];
  const previous = history[1];

  return {
    projectsChange: latest.projects_count - previous.projects_count,
    clientsChange: latest.clients_count - previous.clients_count,
    teamMembersChange: latest.team_members_count - previous.team_members_count,
    storageChange: latest.total_storage_used - previous.total_storage_used,
    trend: latest.projects_count > previous.projects_count ? 'increasing' : 'decreasing'
  };
}

function summarizeViolations(violations: any[]): any {
  const summary = {
    total: violations.length,
    byType: {} as any,
    bySeverity: {} as any
  };

  violations.forEach(v => {
    summary.byType[v.violation_type] = (summary.byType[v.violation_type] || 0) + 1;
    summary.bySeverity[v.violation_level] = (summary.bySeverity[v.violation_level] || 0) + 1;
  });

  return summary;
}

function calculateUsageComparison(usage1: any, usage2: any): any {
  if (!usage1 || !usage2) return null;

  return {
    projectsChange: (usage1.projects_count || 0) - (usage2.projects_count || 0),
    clientsChange: (usage1.clients_count || 0) - (usage2.clients_count || 0),
    storageChange: (usage1.total_storage_used || 0) - (usage2.total_storage_used || 0),
    percentageChanges: {
      projects: usage2.projects_count ? ((usage1.projects_count - usage2.projects_count) / usage2.projects_count) * 100 : 0,
      clients: usage2.clients_count ? ((usage1.clients_count - usage2.clients_count) / usage2.clients_count) * 100 : 0,
      storage: usage2.total_storage_used ? ((usage1.total_storage_used - usage2.total_storage_used) / usage2.total_storage_used) * 100 : 0
    }
  };
}

async function getUsageForPeriod(organizationId: number, period: string): Promise<any> {
  const { data, error } = await supabase
    .from('organization_usage_tracking')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('tracking_period', period)
    .order('period_start', { ascending: false })
    .limit(1)
    .single();

  if (error) return null;
  return data;
}

export default router;