import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { App } from '../App';
import { setupClerkMocks, resetClerkMocks } from './clerk-test-utils';

// Mock wouter
const mockSetLocation = vi.fn();
const mockLocation = vi.fn(() => '/');

vi.mock('wouter', () => ({
  useLocation: () => [mockLocation(), mockSetLocation],
  Route: ({ path, children }: any) => {
    if (mockLocation() === path) return children;
    return null;
  },
  Switch: ({ children }: any) => children,
  Link: ({ href, children }: any) => <a href={href}>{children}</a>,
}));

// Mock components to simplify testing
vi.mock('../pages/dashboard', () => ({
  default: () => <div>Dashboard</div>,
}));

vi.mock('../pages/projects', () => ({
  default: () => <div>Projects Page</div>,
}));

vi.mock('../pages/client-dashboard', () => ({
  default: () => <div>Client Dashboard</div>,
}));

vi.mock('../pages/billing-fixed', () => ({
  default: () => <div>Billing Page</div>,
}));

vi.mock('../components/sidebar', () => ({
  default: () => <div>Sidebar</div>,
}));

describe('Role-based Redirection', () => {
  beforeEach(() => {
    resetClerkMocks();
    vi.clearAllMocks();
    mockLocation.mockReturnValue('/');
  });

  it('should redirect admin users to main dashboard', async () => {
    setupClerkMocks({
      user: {
        user: {
          id: 'user_admin',
          publicMetadata: { role: 'admin' },
        },
      },
      organization: {
        membership: { role: 'admin' },
      },
    });

    vi.mocked(require('../hooks/useAuth').useAuth).mockReturnValue({
      currentRole: 'admin',
      isAdmin: true,
      isTeamMember: false,
      isClient: false,
      hasPermission: () => true,
      loading: false,
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
  });

  it('should redirect team members to projects page', async () => {
    mockLocation.mockReturnValue('/');
    
    setupClerkMocks({
      user: {
        user: {
          id: 'user_team',
          publicMetadata: { role: 'team_member' },
        },
      },
      organization: {
        membership: { role: 'member' },
      },
    });

    vi.mocked(require('../hooks/useAuth').useAuth).mockReturnValue({
      currentRole: 'team_member',
      isAdmin: false,
      isTeamMember: true,
      isClient: false,
      hasPermission: (resource: string) => resource === 'projects',
      loading: false,
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Projects Page')).toBeInTheDocument();
    });
  });

  it('should redirect client users to client dashboard', async () => {
    mockLocation.mockReturnValue('/');
    
    setupClerkMocks({
      user: {
        user: {
          id: 'user_client',
          publicMetadata: { role: 'client' },
        },
      },
      organization: {
        membership: { role: 'client' },
      },
    });

    vi.mocked(require('../hooks/useAuth').useAuth).mockReturnValue({
      currentRole: 'client',
      isAdmin: false,
      isTeamMember: false,
      isClient: true,
      hasPermission: () => false,
      loading: false,
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Client Dashboard')).toBeInTheDocument();
    });
  });

  it('should redirect to billing when trial expires', async () => {
    mockLocation.mockReturnValue('/projects');
    
    setupClerkMocks({
      organization: {
        organization: {
          id: 'org_expired',
          publicMetadata: {
            plan: 'pro_trial',
            trialEndsAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          },
        },
      },
    });

    // Mock the useTrialStatus hook to trigger redirect
    vi.mock('../hooks/useTrialStatus', () => ({
      useTrialStatus: () => ({
        isProTrial: true,
        isTrialExpired: true,
        trialEndDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
        daysLeft: 0,
        hoursLeft: 0,
        showUpgradeBanner: true,
      }),
    }));

    render(<App />);

    await waitFor(() => {
      expect(mockSetLocation).toHaveBeenCalledWith('/billing');
    });
  });

  it('should prevent access to restricted routes for team members', async () => {
    mockLocation.mockReturnValue('/team');
    
    setupClerkMocks({
      user: {
        user: {
          id: 'user_team',
          publicMetadata: { role: 'team_member' },
        },
      },
    });

    vi.mocked(require('../hooks/useAuth').useAuth).mockReturnValue({
      currentRole: 'team_member',
      isAdmin: false,
      isTeamMember: true,
      isClient: false,
      hasPermission: (resource: string) => resource !== 'users',
      loading: false,
    });

    render(<App />);

    await waitFor(() => {
      expect(mockSetLocation).toHaveBeenCalledWith('/projects');
    });
  });

  it('should redirect unauthenticated users to login', async () => {
    mockLocation.mockReturnValue('/dashboard');
    
    setupClerkMocks({
      auth: {
        isLoaded: true,
        isSignedIn: false,
      },
    });

    render(<App />);

    await waitFor(() => {
      expect(mockSetLocation).toHaveBeenCalledWith('/login');
    });
  });

  it('should allow access to billing and support pages during expired trial', async () => {
    mockLocation.mockReturnValue('/billing');
    
    setupClerkMocks({
      organization: {
        organization: {
          id: 'org_expired',
          publicMetadata: {
            plan: 'pro_trial',
            trialEndsAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          },
        },
      },
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Billing Page')).toBeInTheDocument();
      expect(mockSetLocation).not.toHaveBeenCalledWith('/billing');
    });
  });
});