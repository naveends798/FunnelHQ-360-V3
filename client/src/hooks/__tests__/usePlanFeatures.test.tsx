import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePlanFeatures } from '../usePlanFeatures';
import { setupClerkMocks, resetClerkMocks } from '../../test/clerk-test-utils';

// Mock useToast
vi.mock('../use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe('usePlanFeatures', () => {
  beforeEach(() => {
    resetClerkMocks();
    vi.clearAllMocks();
  });

  it('should return Pro Trial features by default', () => {
    setupClerkMocks({
      organization: {
        organization: {
          id: 'org_test',
          name: 'Test Org',
          publicMetadata: {
            plan: 'pro_trial',
            trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          },
        },
      },
    });

    const { result } = renderHook(() => usePlanFeatures());

    expect(result.current.currentPlan).toBe('pro_trial');
    expect(result.current.canInviteMembers).toBe(true);
    expect(result.current.canUseAdvancedFeatures).toBe(true);
    expect(result.current.features.maxProjects).toBe(-1); // unlimited
  });

  it('should return Solo plan features', () => {
    setupClerkMocks({
      organization: {
        organization: {
          id: 'org_test',
          name: 'Test Org',
          publicMetadata: {
            plan: 'solo',
          },
        },
      },
    });

    const { result } = renderHook(() => usePlanFeatures());

    expect(result.current.currentPlan).toBe('solo');
    expect(result.current.canInviteMembers).toBe(false);
    expect(result.current.features.maxProjects).toBe(3);
    expect(result.current.features.maxTeamMembers).toBe(0);
  });

  it('should detect expired trial', () => {
    setupClerkMocks({
      organization: {
        organization: {
          id: 'org_test',
          name: 'Test Org',
          publicMetadata: {
            plan: 'pro_trial',
            trialEndsAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
          },
        },
      },
    });

    const { result } = renderHook(() => usePlanFeatures());

    expect(result.current.isTrialExpired).toBe(true);
    expect(result.current.canInviteMembers).toBe(false); // All features disabled
  });

  it('should calculate days left in trial', () => {
    const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000); // 5 days
    
    setupClerkMocks({
      organization: {
        organization: {
          id: 'org_test',
          name: 'Test Org',
          publicMetadata: {
            plan: 'pro_trial',
            trialEndsAt: futureDate.toISOString(),
          },
        },
      },
    });

    const { result } = renderHook(() => usePlanFeatures());

    expect(result.current.getDaysLeftInTrial()).toBe(5);
  });

  it('should check project limits', () => {
    setupClerkMocks({
      organization: {
        organization: {
          id: 'org_test',
          name: 'Test Org',
          publicMetadata: {
            plan: 'solo',
          },
        },
      },
    });

    const { result } = renderHook(() => usePlanFeatures());

    // Under limit
    let check = result.current.checkLimit('projects', 2);
    expect(check.allowed).toBe(true);
    expect(check.limit).toBe(3);

    // At limit
    check = result.current.checkLimit('projects', 3);
    expect(check.allowed).toBe(true);

    // Over limit
    check = result.current.checkLimit('projects', 3, 1);
    expect(check.allowed).toBe(false);
    expect(check.reason).toContain("You've reached the projects limit");
  });

  it('should allow unlimited resources for Pro plan', () => {
    setupClerkMocks({
      organization: {
        organization: {
          id: 'org_test',
          name: 'Test Org',
          publicMetadata: {
            plan: 'pro',
          },
        },
      },
    });

    const { result } = renderHook(() => usePlanFeatures());

    const check = result.current.checkLimit('projects', 1000);
    expect(check.allowed).toBe(true);
    expect(check.limit).toBeUndefined(); // No limit
  });

  it('should show upgrade prompt', () => {
    const mockToast = vi.fn();
    vi.mocked(require('../use-toast').useToast).mockReturnValue({
      toast: mockToast,
    });

    setupClerkMocks({
      organization: {
        organization: {
          id: 'org_test',
          name: 'Test Org',
          publicMetadata: {
            plan: 'solo',
          },
        },
      },
    });

    const { result } = renderHook(() => usePlanFeatures());

    result.current.showUpgradePrompt('advanced analytics');

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Upgrade Required',
      description: expect.stringContaining('advanced analytics'),
      variant: 'default',
      action: expect.objectContaining({
        label: 'View Plans',
      }),
    });
  });

  it('should return null days for non-trial plans', () => {
    setupClerkMocks({
      organization: {
        organization: {
          id: 'org_test',
          name: 'Test Org',
          publicMetadata: {
            plan: 'pro',
          },
        },
      },
    });

    const { result } = renderHook(() => usePlanFeatures());

    expect(result.current.getDaysLeftInTrial()).toBeNull();
  });
});