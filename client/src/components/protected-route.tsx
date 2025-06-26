import { useAuth } from "@/hooks/useAuth";
import { canAccessRoute } from "@/lib/permissions";
import { motion } from "framer-motion";
import { Shield, Lock, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermissions?: string[];
  fallback?: React.ReactNode;
  route?: string;
}

export default function ProtectedRoute({ 
  children, 
  requiredPermissions = [], 
  fallback,
  route 
}: ProtectedRouteProps) {
  const { currentRole, permissions, loading, hasPermission } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass p-8 rounded-2xl text-center"
        >
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-white">Loading...</p>
        </motion.div>
      </div>
    );
  }

  // Check route-based permissions
  if (route) {
    const userPermissions = permissions.flatMap(p => 
      p.actions.map(action => `${p.resource}:${action}`)
    );
    
    if (!canAccessRoute(route, userPermissions)) {
      return fallback || <AccessDenied route={route} currentRole={currentRole} />;
    }
  }

  // Check specific permissions
  if (requiredPermissions.length > 0) {
    const hasAllPermissions = requiredPermissions.every(permission => {
      const [resource, action] = permission.split(':');
      return hasPermission(resource, action);
    });

    if (!hasAllPermissions) {
      return fallback || <AccessDenied permissions={requiredPermissions} currentRole={currentRole} />;
    }
  }

  return <>{children}</>;
}

interface AccessDeniedProps {
  route?: string;
  permissions?: string[];
  currentRole: string | null;
}

function AccessDenied({ route, permissions, currentRole }: AccessDeniedProps) {
  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        <Card className="glass border-red-500/20 bg-red-500/5">
          <CardContent className="p-8 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="w-16 h-16 mx-auto mb-6 bg-red-500/20 rounded-full flex items-center justify-center"
            >
              <Lock className="h-8 w-8 text-red-400" />
            </motion.div>
            
            <h1 className="text-2xl font-bold text-white mb-4">
              Access Denied
            </h1>
            
            <p className="text-slate-300 mb-6">
              {route 
                ? `You don't have permission to access ${route}`
                : `You don't have the required permissions for this action`
              }
            </p>
            
            <div className="space-y-4">
              <div className="bg-black/20 rounded-lg p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Current Role:</span>
                  <div className="flex items-center space-x-2">
                    <Shield className="h-4 w-4 text-slate-400" />
                    <span className="text-white font-medium capitalize">
                      {currentRole || 'None'}
                    </span>
                  </div>
                </div>
                
                {permissions && (
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <span className="text-slate-400 text-sm">Required Permissions:</span>
                    <div className="mt-2 space-y-1">
                      {permissions.map((permission, index) => (
                        <div key={index} className="text-xs text-red-400 font-mono">
                          {permission}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <Button
                onClick={() => window.history.back()}
                variant="outline"
                className="w-full glass border-white/20 text-white hover:bg-white/10"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>
            </div>
            
            {import.meta.env.DEV && (
              <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-blue-400 text-sm">
                  🧪 <strong>Development Mode:</strong> Use the role switcher in the top-right to test different access levels.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}