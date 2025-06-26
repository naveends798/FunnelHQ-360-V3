import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouteGuard } from '../route-guard';

// Mock the useRouteGuard hook
vi.mock('../../hooks/useRouteGuard', () => ({
  useRouteGuard: vi.fn(),
}));

// Mock wouter
const mockSetLocation = vi.fn();
vi.mock('wouter', () => ({
  useLocation: () => ['/test', mockSetLocation],
}));

describe('RouteGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render children when authorized', () => {
    vi.mocked(require('../../hooks/useRouteGuard').useRouteGuard).mockReturnValue({
      isLoading: false,
      isAuthorized: true,
      currentRole: 'admin',
    });

    render(
      <RouteGuard>
        <div>Protected Content</div>
      </RouteGuard>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('should show loading state', () => {
    vi.mocked(require('../../hooks/useRouteGuard').useRouteGuard).mockReturnValue({
      isLoading: true,
      isAuthorized: false,
      currentRole: null,
    });

    render(
      <RouteGuard>
        <div>Protected Content</div>
      </RouteGuard>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('should show custom loading component', () => {
    vi.mocked(require('../../hooks/useRouteGuard').useRouteGuard).mockReturnValue({
      isLoading: true,
      isAuthorized: false,
      currentRole: null,
    });

    render(
      <RouteGuard loadingComponent={<div>Custom Loading</div>}>
        <div>Protected Content</div>
      </RouteGuard>
    );

    expect(screen.getByText('Custom Loading')).toBeInTheDocument();
  });

  it('should show unauthorized state with role info', () => {
    vi.mocked(require('../../hooks/useRouteGuard').useRouteGuard).mockReturnValue({
      isLoading: false,
      isAuthorized: false,
      currentRole: 'team_member',
    });

    render(
      <RouteGuard requiredRole="admin">
        <div>Protected Content</div>
      </RouteGuard>
    );

    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    expect(screen.getByText(/This page requires admin access/)).toBeInTheDocument();
    expect(screen.getByText(/Your current role is:.*team_member/)).toBeInTheDocument();
  });

  it('should show custom unauthorized component', () => {
    vi.mocked(require('../../hooks/useRouteGuard').useRouteGuard).mockReturnValue({
      isLoading: false,
      isAuthorized: false,
      currentRole: 'client',
    });

    render(
      <RouteGuard unauthorizedComponent={<div>Custom Unauthorized</div>}>
        <div>Protected Content</div>
      </RouteGuard>
    );

    expect(screen.getByText('Custom Unauthorized')).toBeInTheDocument();
  });

  it('should show fallback when provided', () => {
    vi.mocked(require('../../hooks/useRouteGuard').useRouteGuard).mockReturnValue({
      isLoading: false,
      isAuthorized: false,
      currentRole: null,
    });

    render(
      <RouteGuard fallback={<div>Fallback Content</div>}>
        <div>Protected Content</div>
      </RouteGuard>
    );

    expect(screen.getByText('Fallback Content')).toBeInTheDocument();
  });

  it('should navigate back when Go Back button is clicked', async () => {
    vi.mocked(require('../../hooks/useRouteGuard').useRouteGuard).mockReturnValue({
      isLoading: false,
      isAuthorized: false,
      currentRole: 'client',
    });

    const mockBack = vi.fn();
    Object.defineProperty(window, 'history', {
      value: { back: mockBack },
      writable: true,
    });

    render(
      <RouteGuard requiredRole="admin">
        <div>Protected Content</div>
      </RouteGuard>
    );

    const goBackButton = screen.getByText('Go Back');
    await userEvent.click(goBackButton);

    expect(mockBack).toHaveBeenCalled();
  });

  it('should navigate to dashboard when button is clicked', async () => {
    vi.mocked(require('../../hooks/useRouteGuard').useRouteGuard).mockReturnValue({
      isLoading: false,
      isAuthorized: false,
      currentRole: 'client',
    });

    render(
      <RouteGuard requiredRole="admin">
        <div>Protected Content</div>
      </RouteGuard>
    );

    const dashboardButton = screen.getByText('Go to Dashboard');
    await userEvent.click(dashboardButton);

    expect(mockSetLocation).toHaveBeenCalledWith('/');
  });
});