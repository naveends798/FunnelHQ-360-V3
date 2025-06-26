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

// Middleware to check plan limits before creation
export const enforcePlanLimits = (resourceType: 'projects' | 'team_members' | 'storage') => {
  return async (req: any, res: any, next: any) => {
    try {
      const organizationId = parseInt(req.organizationId);
      
      if (!organizationId) {
        return res.status(400).json({ error: 'Organization ID required' });
      }

      const org = await storage.getOrganization(organizationId);
      if (!org) {
        return res.status(404).json({ error: 'Organization not found' });
      }

      const planDetails = BILLING_PLANS[org.plan as keyof typeof BILLING_PLANS];
      if (!planDetails) {
        return res.status(400).json({ error: 'Invalid plan configuration' });
      }

      const currentUsage = await getCurrentUsageCount(organizationId, resourceType);
      const limit = planDetails.limits[resourceType === 'team_members' ? 'collaborators' : resourceType];

      // Check if limit would be exceeded
      if (limit !== -1 && currentUsage >= limit) {
        // Log the violation
        await logPlanViolation(organizationId, resourceType, currentUsage, limit);

        return res.status(403).json({
          error: `${resourceType.replace('_', ' ')} limit exceeded`,
          message: `Your ${org.plan} plan allows ${limit === -1 ? 'unlimited' : limit} ${resourceType.replace('_', ' ')}. You currently have ${currentUsage}.`,
          currentUsage,
          limit,
          plan: org.plan,
          upgradeRequired: true
        });
      }

      // Add usage info to request for potential warnings
      req.planInfo = {
        currentUsage,
        limit,
        plan: org.plan,
        percentage: limit === -1 ? 0 : Math.round((currentUsage / limit) * 100)
      };

      next();
    } catch (error) {
      console.error('Error enforcing plan limits:', error);
      res.status(500).json({ error: 'Failed to verify plan limits' });
    }
  };
};

// Check plan compliance endpoint
router.get('/check-compliance',
  authenticateUser,
  requireOrganizationAccess(),
  async (req: any, res) => {
    try {
      const organizationId = parseInt(req.organizationId);

      const org = await storage.getOrganization(organizationId);
      if (!org) {
        return res.status(404).json({ error: 'Organization not found' });
      }

      const compliance = await checkPlanCompliance(organizationId, org.plan);
      
      res.json({
        organizationId,
        plan: org.plan,
        compliance,
        lastChecked: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error checking compliance:', error);
      res.status(500).json({ error: 'Failed to check plan compliance' });
    }
  }
);

// Get plan upgrade recommendations
router.get('/upgrade-recommendations',
  authenticateUser,
  requireOrganizationAccess(),
  async (req: any, res) => {
    try {
      const organizationId = parseInt(req.organizationId);

      const org = await storage.getOrganization(organizationId);
      if (!org) {
        return res.status(404).json({ error: 'Organization not found' });
      }

      const recommendations = await getUpgradeRecommendations(organizationId, org.plan);
      
      res.json({
        organizationId,
        currentPlan: org.plan,
        recommendations,
        generatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error getting upgrade recommendations:', error);
      res.status(500).json({ error: 'Failed to get upgrade recommendations' });
    }
  }
);

// Resolve plan violation (mark as resolved)
router.patch('/violations/:violationId/resolve',
  authenticateUser,
  requireOrganizationAccess(['manage_organization']),
  async (req: any, res) => {
    try {
      const violationId = parseInt(req.params.violationId);
      const organizationId = parseInt(req.organizationId);
      const { resolution, notes } = req.body;

      const { data: violation, error } = await supabase
        .from('plan_limit_violations')
        .update({
          resolved_at: new Date().toISOString(),
          action_taken: resolution || 'manual_resolution',
          metadata: {
            ...req.body.metadata,
            resolutionNotes: notes
          }
        })
        .eq('id', violationId)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) throw error;

      res.json({
        success: true,
        violation,
        message: 'Violation marked as resolved'
      });
    } catch (error) {
      console.error('Error resolving violation:', error);
      res.status(500).json({ error: 'Failed to resolve violation' });
    }
  }
);

// Create usage alert
router.post('/alerts',
  authenticateUser,
  requireOrganizationAccess(['manage_organization']),
  async (req: any, res) => {
    try {
      const organizationId = parseInt(req.organizationId);
      const { resourceType, threshold, severity = 'warning', message } = req.body;

      const currentUsage = await getCurrentUsageCount(organizationId, resourceType);
      const org = await storage.getOrganization(organizationId);
      
      if (!org) {
        return res.status(404).json({ error: 'Organization not found' });
      }

      const planDetails = BILLING_PLANS[org.plan as keyof typeof BILLING_PLANS];
      const limit = planDetails.limits[resourceType === 'team_members' ? 'collaborators' : resourceType];

      // Get organization admins to notify
      const { data: admins } = await supabase
        .from('organization_memberships')
        .select('users!inner(id, email, name)')
        .eq('organization_id', organizationId)
        .eq('role', 'admin')
        .eq('is_active', true);

      const adminIds = admins?.map(a => a.users.id) || [];

      const { data: alert, error } = await supabase
        .from('usage_alerts')
        .insert({
          organization_id: organizationId,
          alert_type: 'custom',
          resource_type: resourceType,
          threshold,
          current_value: currentUsage,
          limit_value: limit,
          severity,
          message: message || `${resourceType} usage requires attention`,
          action_required: severity === 'critical',
          sent_to_users: adminIds
        })
        .select()
        .single();

      if (error) throw error;

      res.status(201).json({
        success: true,
        alert,
        message: 'Usage alert created successfully'
      });
    } catch (error) {
      console.error('Error creating usage alert:', error);
      res.status(500).json({ error: 'Failed to create usage alert' });
    }
  }
);

// Get plan features and limits
router.get('/features',
  authenticateUser,
  requireOrganizationAccess(),
  async (req: any, res) => {
    try {
      const organizationId = parseInt(req.organizationId);

      const org = await storage.getOrganization(organizationId);
      if (!org) {
        return res.status(404).json({ error: 'Organization not found' });
      }

      const planDetails = BILLING_PLANS[org.plan as keyof typeof BILLING_PLANS];
      const currentUsage = await getDetailedUsage(organizationId);

      res.json({
        organizationId,
        plan: {
          current: org.plan,
          details: planDetails,
          features: planDetails.features,
          limits: planDetails.limits
        },
        usage: currentUsage,
        available: Object.keys(BILLING_PLANS).map(planId => ({
          id: planId,
          ...BILLING_PLANS[planId as keyof typeof BILLING_PLANS]
        }))
      });
    } catch (error) {
      console.error('Error getting plan features:', error);
      res.status(500).json({ error: 'Failed to get plan features' });
    }
  }
);

// Helper function to get current usage count
async function getCurrentUsageCount(organizationId: number, resourceType: string): Promise<number> {
  switch (resourceType) {
    case 'projects':
      const { count: projectCount } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId);
      return projectCount || 0;

    case 'team_members':
      const { count: memberCount } = await supabase
        .from('organization_memberships')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('is_active', true);
      return memberCount || 0;

    case 'storage':
      // This would need actual file size calculation
      // For now, return estimated storage usage
      const { data: documents } = await supabase
        .from('documents')
        .select('size');
      return documents?.reduce((total, doc) => total + (doc.size || 0), 0) || 0;

    default:
      return 0;
  }
}

// Helper function to check plan compliance
async function checkPlanCompliance(organizationId: number, plan: string): Promise<any> {
  const planDetails = BILLING_PLANS[plan as keyof typeof BILLING_PLANS];
  if (!planDetails) {
    return { compliant: false, error: 'Invalid plan' };
  }

  const [projectsCount, membersCount, storageUsed] = await Promise.all([
    getCurrentUsageCount(organizationId, 'projects'),
    getCurrentUsageCount(organizationId, 'team_members'),
    getCurrentUsageCount(organizationId, 'storage')
  ]);

  const limits = planDetails.limits;
  
  const compliance = {
    compliant: true,
    violations: [] as any[],
    warnings: [] as any[],
    usage: {
      projects: { current: projectsCount, limit: limits.projects },
      teamMembers: { current: membersCount, limit: limits.collaborators },
      storage: { current: storageUsed, limit: limits.storage }
    }
  };

  // Check each limit
  if (limits.projects !== -1 && projectsCount > limits.projects) {
    compliance.compliant = false;
    compliance.violations.push({
      type: 'projects',
      current: projectsCount,
      limit: limits.projects,
      excess: projectsCount - limits.projects
    });
  }

  if (limits.collaborators !== -1 && membersCount > limits.collaborators) {
    compliance.compliant = false;
    compliance.violations.push({
      type: 'team_members',
      current: membersCount,
      limit: limits.collaborators,
      excess: membersCount - limits.collaborators
    });
  }

  if (storageUsed > limits.storage) {
    compliance.compliant = false;
    compliance.violations.push({
      type: 'storage',
      current: storageUsed,
      limit: limits.storage,
      excess: storageUsed - limits.storage
    });
  }

  // Check for warnings (approaching limits)
  Object.entries(compliance.usage).forEach(([type, usage]: [string, any]) => {
    if (usage.limit !== -1) {
      const percentage = (usage.current / usage.limit) * 100;
      if (percentage > 80 && percentage <= 100) {
        compliance.warnings.push({
          type,
          percentage: Math.round(percentage),
          message: `Approaching ${type} limit`
        });
      }
    }
  });

  return compliance;
}

// Helper function to get upgrade recommendations
async function getUpgradeRecommendations(organizationId: number, currentPlan: string): Promise<any> {
  const compliance = await checkPlanCompliance(organizationId, currentPlan);
  
  if (compliance.compliant && compliance.warnings.length === 0) {
    return {
      recommended: false,
      reason: 'Current plan meets all requirements',
      suggestions: []
    };
  }

  const recommendations = {
    recommended: true,
    reason: compliance.violations.length > 0 ? 'Plan limits exceeded' : 'Approaching plan limits',
    currentPlan,
    suggestedPlans: [] as any[],
    benefits: [] as string[]
  };

  // For now, if on solo plan and have violations, recommend pro
  if (currentPlan === 'solo' && (compliance.violations.length > 0 || compliance.warnings.length > 0)) {
    recommendations.suggestedPlans.push({
      id: 'pro',
      ...BILLING_PLANS.pro,
      reason: 'Unlimited projects and team members'
    });
    
    recommendations.benefits = [
      'Unlimited projects',
      'Unlimited team members',
      'Advanced collaboration features',
      '100GB storage'
    ];
  }

  return recommendations;
}

// Helper function to log plan violations
async function logPlanViolation(organizationId: number, resourceType: string, currentUsage: number, limit: number): Promise<void> {
  try {
    await supabase
      .from('plan_limit_violations')
      .insert({
        organization_id: organizationId,
        violation_type: resourceType,
        current_usage: currentUsage,
        plan_limit: limit,
        violation_level: currentUsage > limit * 1.2 ? 'hard_limit' : 'soft_limit',
        action_taken: 'request_blocked',
        metadata: {
          attemptedAction: 'creation_blocked',
          timestamp: new Date().toISOString()
        }
      });
  } catch (error) {
    console.error('Error logging plan violation:', error);
  }
}

// Helper function to get detailed usage
async function getDetailedUsage(organizationId: number): Promise<any> {
  const [projectsCount, membersCount, storageUsed] = await Promise.all([
    getCurrentUsageCount(organizationId, 'projects'),
    getCurrentUsageCount(organizationId, 'team_members'),
    getCurrentUsageCount(organizationId, 'storage')
  ]);

  return {
    projects: projectsCount,
    teamMembers: membersCount,
    storage: storageUsed,
    lastCalculated: new Date().toISOString()
  };
}

export default router;