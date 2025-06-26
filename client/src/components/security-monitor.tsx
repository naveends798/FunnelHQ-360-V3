import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Activity,
  Eye,
  AlertCircle
} from "lucide-react";
import { useSecurityValidation, type AuditLogEntry } from "@/hooks/useSecurityValidation";
import { useAuth } from "@/hooks/useAuth";

export default function SecurityMonitor() {
  const { currentRole } = useAuth();
  const { auditLog, getSecuritySummary } = useSecurityValidation();
  const [isOpen, setIsOpen] = useState(false);
  
  const securitySummary = getSecuritySummary();

  // Only show to admins
  if (currentRole !== 'admin') {
    return null;
  }

  const getResultIcon = (result: string) => {
    switch (result) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failure':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'blocked':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getRiskBadge = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high':
        return <Badge className="bg-red-500 text-white">High Risk</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-500 text-black">Medium Risk</Badge>;
      case 'low':
        return <Badge className="bg-green-500 text-white">Low Risk</Badge>;
      default:
        return <Badge className="bg-gray-500 text-white">Unknown</Badge>;
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="border-gray-600 text-gray-300 hover:bg-gray-700 relative"
        >
          <Shield className="mr-2 h-4 w-4" />
          Security Monitor
          {securitySummary.suspiciousActivity && (
            <div className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full"></div>
          )}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden bg-gray-800 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Monitor & Audit Log
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Security Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-400">Risk Level</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  {getRiskBadge(securitySummary.riskScore)}
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-400">Failed Attempts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {securitySummary.failedAttempts}
                </div>
                <p className="text-xs text-gray-500">Last 50 events</p>
              </CardContent>
            </Card>
            
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-400">Total Events</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {securitySummary.totalEvents}
                </div>
                <p className="text-xs text-gray-500">Recent activity</p>
              </CardContent>
            </Card>
          </div>

          {/* Security Alerts */}
          {securitySummary.suspiciousActivity && (
            <Alert className="border-red-800 bg-red-900/20">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-red-200">
                Suspicious activity detected: {securitySummary.failedAttempts} failed attempts in recent activity.
                {securitySummary.lastFailedAttempt && (
                  <span className="block mt-1">
                    Last failed attempt: {formatTimestamp(securitySummary.lastFailedAttempt)}
                  </span>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Audit Log */}
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Security Events
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-96">
                <div className="space-y-2 p-4">
                  {auditLog.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No security events recorded
                    </div>
                  ) : (
                    auditLog.map((entry: AuditLogEntry) => (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-gray-800 border border-gray-700 hover:bg-gray-750"
                      >
                        <div className="flex items-center gap-3">
                          {getResultIcon(entry.result)}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-white">
                              {entry.action.replace(/_/g, ' ').toUpperCase()}
                            </p>
                            <p className="text-xs text-gray-400">
                              Resource: {entry.resource}
                            </p>
                            {entry.metadata?.violations && (
                              <p className="text-xs text-red-400 mt-1">
                                Violations: {entry.metadata.violations.join(', ')}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge 
                              className={`text-xs ${
                                entry.result === 'success' ? 'bg-green-500' :
                                entry.result === 'failure' ? 'bg-red-500' :
                                'bg-yellow-500'
                              } text-white`}
                            >
                              {entry.result}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-500">
                            {formatTimestamp(entry.timestamp)}
                          </p>
                          <p className="text-xs text-gray-500">
                            User: {entry.userId}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Security Best Practices */}
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Security Best Practices
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-gray-300 space-y-2">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  <span>All team member and client signups require admin invitations</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  <span>Invitations expire after 7 days and are single-use</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  <span>All security events are logged and monitored</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  <span>Role-based access controls limit user permissions</span>
                </div>
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5" />
                  <span>Monitor this dashboard regularly for suspicious activity</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}