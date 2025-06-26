import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  ClipboardList, 
  Calendar, 
  User, 
  Eye, 
  CheckCircle, 
  Clock,
  FileText,
  Download,
  Filter,
  Search,
  Copy
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

interface FormSubmission {
  id: number;
  formId: number;
  projectId: number;
  clientId: number;
  responses: Record<string, any>;
  submittedAt: string;
  isCompleted: boolean;
  reviewedBy?: number;
  reviewedAt?: string;
  client?: {
    id: number;
    name: string;
    email: string;
    avatar?: string;
  };
  form?: {
    id: number;
    title: string;
    description?: string;
    fields: any[];
  };
}

interface OnboardingSubmissionsBoardProps {
  projectId?: number;
  organizationId?: number;
  showAll?: boolean;
}

export default function OnboardingSubmissionsBoard({ 
  projectId, 
  organizationId = 1, 
  showAll = false 
}: OnboardingSubmissionsBoardProps) {
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<FormSubmission | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'reviewed'>('all');
  const { currentRole, authUser, isClient } = useAuth();

  useEffect(() => {
    fetchSubmissions();
  }, [projectId, organizationId, showAll]);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (projectId && !showAll) {
        // Get submissions for specific project
        params.set('projectId', projectId.toString());
      } else if (showAll) {
        // Get all submissions for organization
        params.set('organizationId', organizationId.toString());
      }
      
      // For team members, add user ID to filter by accessible projects
      if (currentRole === 'team_member' && authUser?.id) {
        params.set('userId', authUser.id.toString());
        if (!params.has('organizationId')) {
          params.set('organizationId', (authUser.organizationId || 1).toString());
        }
      }
      
      const url = `/api/form-submissions?${params.toString()}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setSubmissions(data);
      }
    } catch (error) {
      console.error('Error fetching submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSubmissions = submissions.filter(submission => {
    if (filter === 'pending') return !submission.reviewedBy;
    if (filter === 'reviewed') return !!submission.reviewedBy;
    return true;
  });

  const markAsReviewed = async (submissionId: number) => {
    try {
      const response = await fetch(`/api/form-submissions/${submissionId}/review`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewedBy: 1 }) // TODO: Get current user ID from auth
      });

      if (response.ok) {
        await fetchSubmissions();
        if (selectedSubmission?.id === submissionId) {
          setSelectedSubmission(null);
        }
      }
    } catch (error) {
      console.error('Error marking as reviewed:', error);
    }
  };

  const copyToClipboard = async (submission: FormSubmission) => {
    if (!submission.form) return;

    let copyText = `${submission.form.title}\n`;
    copyText += `Submitted by: ${submission.client?.name || 'Unknown'}\n`;
    copyText += `Date: ${new Date(submission.submittedAt).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}\n\n`;

    submission.form.fields.forEach((field: any) => {
      const value = submission.responses[field.id];
      if (!value || field.type === 'section') return;

      copyText += `${field.label}:\n`;
      copyText += `${formatFieldValue(field, value)}\n\n`;
    });

    try {
      await navigator.clipboard.writeText(copyText);
      // TODO: Add toast notification for successful copy
      console.log('Copied to clipboard');
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const formatFieldValue = (field: any, value: any) => {
    if (!value) return 'Not provided';
    
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    
    if (field.type === 'checkbox' && typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    
    if (field.type === 'select' || field.type === 'radio') {
      const option = field.options?.find((opt: any) => 
        (typeof opt === 'string' ? opt : opt.value) === value
      );
      return option ? (typeof option === 'string' ? option : option.label) : value;
    }
    
    return value.toString();
  };

  if (loading) {
    return (
      <Card className="glass border-white/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span className="ml-2 text-white">Loading submissions...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Onboarding Submissions</h2>
          <p className="text-slate-400">
            {showAll ? 'All submissions across projects' : 'Submissions for this project'}
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
            className={cn(
              filter === 'all' ? 'bg-primary' : 'glass border-white/20 text-white hover:bg-white/10'
            )}
          >
            All ({submissions.length})
          </Button>
          <Button
            variant={filter === 'pending' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('pending')}
            className={cn(
              filter === 'pending' ? 'bg-primary' : 'glass border-white/20 text-white hover:bg-white/10'
            )}
          >
            <Clock className="h-3 w-3 mr-1" />
            Pending ({submissions.filter(s => !s.reviewedBy).length})
          </Button>
          <Button
            variant={filter === 'reviewed' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('reviewed')}
            className={cn(
              filter === 'reviewed' ? 'bg-primary' : 'glass border-white/20 text-white hover:bg-white/10'
            )}
          >
            <CheckCircle className="h-3 w-3 mr-1" />
            Reviewed ({submissions.filter(s => !!s.reviewedBy).length})
          </Button>
        </div>
      </div>

      {filteredSubmissions.length === 0 ? (
        <Card className="glass border-white/20">
          <CardContent className="p-12">
            <div className="text-center">
              <ClipboardList className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-400 mb-2">No submissions found</h3>
              <p className="text-slate-500">
                {filter === 'all' 
                  ? 'No onboarding forms have been submitted yet.'
                  : `No ${filter} submissions found.`
                }
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredSubmissions.map((submission) => (
            <motion.div
              key={submission.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="glass border-white/20 hover:border-primary/30 transition-all duration-200 cursor-pointer group"
                    onClick={() => setSelectedSubmission(submission)}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      {submission.client?.avatar ? (
                        <img
                          src={submission.client.avatar}
                          alt={submission.client.name}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-medium">
                          {submission.client?.name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                      )}
                      <div>
                        <CardTitle className="text-white text-sm">
                          {submission.client?.name || 'Unknown Client'}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {submission.form?.title || 'Onboarding Form'}
                        </CardDescription>
                      </div>
                    </div>
                    
                    <Badge 
                      className={cn(
                        "text-xs",
                        submission.reviewedBy 
                          ? "bg-green-500/20 text-green-400 border-green-500/30"
                          : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                      )}
                    >
                      {submission.reviewedBy ? 'Reviewed' : 'Pending'}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    <div className="flex items-center text-xs text-slate-400">
                      <Calendar className="h-3 w-3 mr-1" />
                      {new Date(submission.submittedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                    
                    <div className="text-xs text-slate-300">
                      {Object.keys(submission.responses).length} fields completed
                    </div>
                    
                    <div className="flex items-center justify-between pt-2">
                      <Button 
                        size="sm" 
                        variant="ghost"
                        className="text-primary hover:text-primary/80 hover:bg-primary/10 text-xs h-7 px-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSubmission(submission);
                        }}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View Details
                      </Button>
                      
                      {!submission.reviewedBy && (
                        <Button 
                          size="sm" 
                          variant="ghost"
                          className="text-green-400 hover:text-green-300 hover:bg-green-500/10 text-xs h-7 px-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsReviewed(submission.id);
                          }}
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Mark Reviewed
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Detailed View Modal */}
      {selectedSubmission && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedSubmission(null)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-slate-900/95 backdrop-blur-xl rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-white/10 bg-gradient-to-r from-slate-900 to-slate-800">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">Form Submission Details</h2>
                <div className="flex items-center space-x-3 text-sm text-slate-400">
                  <span>{selectedSubmission.client?.name}</span>
                  <span>•</span>
                  <span>{selectedSubmission.form?.title}</span>
                  <span>•</span>
                  <span>{new Date(selectedSubmission.submittedAt).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {!isClient && (
                  <Button
                    onClick={() => copyToClipboard(selectedSubmission)}
                    variant="outline"
                    className="glass border-white/20 text-white hover:bg-white/10"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy All Data
                  </Button>
                )}
                {!selectedSubmission.reviewedBy && (
                  <Button
                    onClick={() => markAsReviewed(selectedSubmission.id)}
                    className="bg-green-500 hover:bg-green-600"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark as Reviewed
                  </Button>
                )}
                <Button
                  variant="ghost"
                  onClick={() => setSelectedSubmission(null)}
                  className="text-slate-400 hover:text-white hover:bg-white/10"
                >
                  ×
                </Button>
              </div>
            </div>
            
            <ScrollArea className="max-h-[calc(90vh-120px)] p-6">
              <div className="space-y-6">
                {selectedSubmission.form?.fields?.map((field: any) => {
                  const value = selectedSubmission.responses[field.id];
                  if (!value && field.type !== 'checkbox') return null;
                  
                  return (
                    <div key={field.id} className="glass rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-white">{field.label}</h4>
                        {field.required && (
                          <Badge variant="outline" className="text-xs bg-primary/20 text-primary border-primary/30">
                            Required
                          </Badge>
                        )}
                      </div>
                      <div className="text-slate-300 leading-relaxed">
                        {formatFieldValue(field, value)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}