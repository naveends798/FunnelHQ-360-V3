import React from "react";
import { RouteGuard } from "@/components/route-guard";

interface ClerkProtectedRouteProps {
  children: React.ReactNode;
  requiresPermission?: string;
}

export function ClerkProtectedRoute({ children, requiresPermission }: ClerkProtectedRouteProps) {
  return (
    <RouteGuard
      requireAuth={true}
      requireOrganization={false}
      requiredPermission={requiresPermission}
    >
      {children}
    </RouteGuard>
  );
}