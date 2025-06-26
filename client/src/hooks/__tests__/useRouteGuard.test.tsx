import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRouteGuard } from '../useRouteGuard';
import { setupClerkMocks, resetClerkMocks } from '../../test/clerk-test-utils';

// Mock wouter
vi.mock('wouter', () => ({
  useLocation: vi.fn(() => ['/dashboard', vi.fn()]),
}));

// Mock useAuth hook
vi.mock('../useAuth', () => ({
  useAuth: vi.fn(() => ({
    currentRole: 'admin',
    hasPermission: vi.fn((resource, action) => true),
    loading: false,
  })),
}));

describe('useRouteGuard', () => {
  beforeEach(() => {
    resetClerkMocks();
    vi.clearAllMocks();
  });

  it('should allow access when user is authenticated and authorized', () => {
    setupClerkMocks();
    
    const { result } = renderHook(() => 
      useRouteGuard({
        requireAuth: true,
        requiredRole: 'admin',
      })
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isAuthorized).toBe(true);
    expect(result.current.currentRole).toBe('admin');
  });

  it('should redirect when user is not authenticated', () => {
    const mockSetLocation = vi.fn();
    vi.mocked(require('wouter').useLocation).mockReturnValue(['/dashboard', mockSetLocation]);
    
    setupClerkMocks({
      auth: { isSignedIn: false },
    });

    renderHook(() => 
      useRouteGuard({
        requireAuth: true,
        redirectTo: '/login',
      })
    );

    expect(mockSetLocation).toHaveBeenCalledWith('/login');
  });

  it('should redirect when user has wrong role', () => {
    const mockSetLocation = vi.fn();
    vi.mocked(require('wouter').useLocation).mockReturnValue(['/admin', mockSetLocation]);
    
    setupClerkMocks();
    vi.mocked(require('../useAuth').useAuth).mockReturnValue({
      currentRole: 'team_member',
      hasPermission: vi.fn(() => true),
      loading: false,
    });

    renderHook(() => 
      useRouteGuard({
        requireAuth: true,
        requiredRole: 'admin',
      })
    );

    // Should redirect team members to projects page
    expect(mockSetLocation).toHaveBeenCalledWith('/projects');
  });

  it('should check permissions when required', () => {
    const mockHasPermission = vi.fn((resource, action) => 
      resource === 'projects' && action === 'create'
    );
    
    setupClerkMocks();
    vi.mocked(require('../useAuth').useAuth).mockReturnValue({
      currentRole: 'admin',
      hasPermission: mockHasPermission,
      loading: false,
    });

    const { result } = renderHook(() => 
      useRouteGuard({
        requireAuth: true,
        requiredPermission: 'projects:create',
      })
    );

    expect(mockHasPermission).toHaveBeenCalledWith('projects', 'create');
    expect(result.current.isAuthorized).toBe(true);
  });

  it('should redirect when missing required permission', () => {
    const mockSetLocation = vi.fn();
    vi.mocked(require('wouter').useLocation).mockReturnValue(['/settings', mockSetLocation]);
    
    setupClerkMocks();
    vi.mocked(require('../useAuth').useAuth).mockReturnValue({
      currentRole: 'team_member',
      hasPermission: vi.fn(() => false),
      loading: false,
    });

    renderHook(() => 
      useRouteGuard({
        requireAuth: true,
        requiredPermission: 'billing:view',
      })
    );

    expect(mockSetLocation).toHaveBeenCalledWith('/');
  });

  it('should require organization when specified', () => {
    const mockSetLocation = vi.fn();
    vi.mocked(require('wouter').useLocation).mockReturnValue(['/team', mockSetLocation]);
    
    setupClerkMocks({
      organization: { organization: null },
    });

    renderHook(() => 
      useRouteGuard({
        requireAuth: true,
        requireOrganization: true,
      })
    );

    expect(mockSetLocation).toHaveBeenCalledWith('/');
  });

  it('should call onUnauthorized callback when provided', () => {
    const onUnauthorized = vi.fn();
    
    setupClerkMocks();
    vi.mocked(require('../useAuth').useAuth).mockReturnValue({
      currentRole: 'client',
      hasPermission: vi.fn(() => false),
      loading: false,
    });

    renderHook(() => 
      useRouteGuard({
        requireAuth: true,
        requiredRole: 'admin',
        onUnauthorized,
      })
    );

    expect(onUnauthorized).toHaveBeenCalled();
  });

  it('should show loading state while auth is loading', () => {
    setupClerkMocks({
      auth: { isLoaded: false },
    });

    const { result } = renderHook(() => 
      useRouteGuard({
        requireAuth: true,
      })
    );

    expect(result.current.isLoading).toBe(true);
  });
});