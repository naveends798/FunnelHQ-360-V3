import { useEffect } from 'react';
import { useAuth as useClerkAuth, useOrganization } from '@clerk/clerk-react';
import { useLocation } from 'wouter';
import { useAuth } from './useAuth';
import { useTrialStatus } from './useTrialStatus';

interface RouteGuardOptions {
  requireAuth?: boolean;
  requireOrganization?: boolean;
  requiredRole?: 'admin' | 'team_member' | 'client';
  requiredPermission?: string;
  redirectTo?: string;
  onUnauthorized?: () => void;
}

export function useRouteGuard(options: RouteGuardOptions = {}) {
  const {
    requireAuth = true,
    requireOrganization = false,
    requiredRole,
    requiredPermission,
    redirectTo = '/login',
    onUnauthorized
  } = options;

  const { isLoaded: clerkLoaded, isSignedIn } = useClerkAuth();
  const { organization, isLoaded: orgLoaded } = useOrganization();
  const { currentRole, hasPermission, loading: authLoading } = useAuth();
  const { isTrialExpired } = useTrialStatus();
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Wait for all auth data to load
    if (!clerkLoaded || authLoading || (requireOrganization && !orgLoaded)) {
      return;
    }

    // Check if authentication is required
    if (requireAuth && !isSignedIn) {
      console.log('🔒 Route guard: User not authenticated, redirecting to', redirectTo);
      setLocation(redirectTo);
      return;
    }

    // Check if organization is required
    if (requireOrganization && !organization) {
      console.log('🔒 Route guard: No organization selected');
      if (onUnauthorized) {
        onUnauthorized();
      } else {
        setLocation('/');
      }
      return;
    }

    // Check trial expiration - redirect to billing if trial expired and not on allowed routes
    if (isTrialExpired && isSignedIn) {
      const currentPath = window.location.pathname;
      const allowedRoutes = ['/billing', '/support', '/login', '/signup'];
      const isAllowedRoute = allowedRoutes.some(route => currentPath.startsWith(route));
      
      if (!isAllowedRoute) {
        console.log('🔒 Route guard: Trial expired, redirecting to billing');
        setLocation('/billing');
        return;
      }
    }

    // Check role requirement
    if (requiredRole && currentRole !== requiredRole) {
      console.log(`🔒 Route guard: Required role ${requiredRole}, but user has ${currentRole}`);
      if (onUnauthorized) {
        onUnauthorized();
      } else {
        // Redirect based on user role
        switch (currentRole) {
          case 'client':
            setLocation('/client-dashboard');
            break;
          case 'team_member':
            setLocation('/projects');
            break;
          default:
            setLocation('/');
        }
      }
      return;
    }

    // Check permission requirement
    if (requiredPermission && currentRole) {
      const [resource, action] = requiredPermission.split(':');
      console.log(`🔍 Checking permission: ${requiredPermission} (${resource}:${action}) for role: ${currentRole}`);
      const hasPermissionResult = hasPermission(resource, action);
      console.log(`🔍 Permission result:`, hasPermissionResult);
      if (!hasPermissionResult) {
        console.log(`🔒 Route guard: Missing permission ${requiredPermission}`);
        if (onUnauthorized) {
          onUnauthorized();
        } else {
          setLocation('/');
        }
        return;
      }
      console.log(`✅ Permission granted: ${requiredPermission}`);
    }
  }, [
    clerkLoaded,
    orgLoaded,
    authLoading,
    isSignedIn,
    organization,
    currentRole,
    isTrialExpired,
    requireAuth,
    requireOrganization,
    requiredRole,
    requiredPermission,
    redirectTo,
    setLocation,
    hasPermission,
    onUnauthorized
  ]);

  return {
    isLoading: !clerkLoaded || authLoading || (requireOrganization && !orgLoaded),
    isAuthorized: isSignedIn && (!requiredRole || currentRole === requiredRole),
    currentRole,
    organization
  };
}