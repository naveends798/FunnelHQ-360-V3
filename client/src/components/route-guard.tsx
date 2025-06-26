import React from 'react';
import { useRouteGuard } from '@/hooks/useRouteGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Loader2, Lock } from 'lucide-react';
import { useLocation } from 'wouter';
import { TrialAccessGuard } from '@/components/trial-access-guard';

interface RouteGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireOrganization?: boolean;
  requiredRole?: 'admin' | 'team_member' | 'client';
  requiredPermission?: string;
  redirectTo?: string;
  fallback?: React.ReactNode;
  loadingComponent?: React.ReactNode;
  unauthorizedComponent?: React.ReactNode;
}

export function RouteGuard({
  children,
  requireAuth = true,
  requireOrganization = false,
  requiredRole,
  requiredPermission,
  redirectTo = '/login',
  fallback,
  loadingComponent,
  unauthorizedComponent
}: RouteGuardProps) {
  const [, setLocation] = useLocation();
  const { isLoading, isAuthorized, currentRole } = useRouteGuard({
    requireAuth,
    requireOrganization,
    requiredRole,
    requiredPermission,
    redirectTo
  });

  // Show loading state
  if (isLoading) {
    if (loadingComponent) {
      return <>{loadingComponent}</>;
    }
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Show unauthorized state
  if (!isAuthorized && requireAuth) {
    if (unauthorizedComponent) {
      return <>{unauthorizedComponent}</>;
    }

    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
        <Card className="w-full max-w-md bg-gray-800 border-gray-700">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <Lock className="h-12 w-12 text-red-500" />
            </div>
            <CardTitle className="text-white">Access Denied</CardTitle>
            <CardDescription>
              {requiredRole 
                ? `This page requires ${requiredRole.replace('_', ' ')} access`
                : 'You do not have permission to view this page'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-400 text-center">
              Your current role is: <span className="font-medium text-white">{currentRole || 'None'}</span>
            </p>
            <div className="flex gap-2 justify-center">
              <Button
                variant="outline"
                onClick={() => window.history.back()}
              >
                Go Back
              </Button>
              <Button
                onClick={() => setLocation('/')}
              >
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Authorized - render children with trial access guard
  return (
    <TrialAccessGuard>
      {children}
    </TrialAccessGuard>
  );
}

// HOC version for wrapping components
export function withRouteGuard<P extends object>(
  Component: React.ComponentType<P>,
  guardProps: Omit<RouteGuardProps, 'children'>
) {
  return function GuardedComponent(props: P) {
    return (
      <RouteGuard {...guardProps}>
        <Component {...props} />
      </RouteGuard>
    );
  };
}