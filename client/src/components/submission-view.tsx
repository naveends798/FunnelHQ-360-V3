import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { 
  ClipboardCheck,
  Copy,
  CheckSquare,
  FileText,
  User,
  Calendar,
  Mail,
  Phone,
  Globe,
  Building,
  Tag,
  Loader2,
  Download
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FormField {
  id: string;
  type: "text" | "textarea" | "email" | "number" | "tel" | "select" | "checkbox" | "radio" | "section";
  label: string;
  placeholder?: string;
  required: boolean;
  options?: Array<string | { label: string; value: string; }>;
}

interface OnboardingForm {
  id: number;
  title: string;
  description: string;
  fields: FormField[];
}

interface SubmissionData {
  id?: number;
  projectId: number;
  clientId: number;
  responses: Record<string, any>;
  isCompleted: boolean;
  submittedAt?: string;
}

interface SubmissionViewProps {
  submissionData: SubmissionData | null;
  projectId: number;
  projectName?: string;
}

export default function SubmissionView({ 
  submissionData, 
  projectId, 
  projectName 
}: SubmissionViewProps) {
  const [form, setForm] = useState<OnboardingForm | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { isClient } = useAuth();

  useEffect(() => {
    if (submissionData && projectId) {
      fetchFormDefinition();
    }
  }, [submissionData, projectId]);

  const fetchFormDefinition = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/projects/${projectId}/onboarding-form`);
      if (response.ok) {
        const formData = await response.json();
        setForm(formData);
      }
    } catch (error) {
      console.error('Error fetching form definition:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFieldLabel = (fieldId: string): string => {
    if (!form) return fieldId;
    
    const field = form.fields.find(f => f.id === fieldId);
    return field ? field.label : fieldId;
  };

  const getFieldIcon = (fieldId: string, value: any) => {
    const label = getFieldLabel(fieldId).toLowerCase();
    
    if (label.includes('email')) return <Mail className="h-4 w-4" />;
    if (label.includes('phone') || label.includes('tel')) return <Phone className="h-4 w-4" />;
    if (label.includes('website') || label.includes('url')) return <Globe className="h-4 w-4" />;
    if (label.includes('company') || label.includes('business')) return <Building className="h-4 w-4" />;
    if (label.includes('name')) return <User className="h-4 w-4" />;
    if (label.includes('date')) return <Calendar className="h-4 w-4" />;
    
    return <Tag className="h-4 w-4" />;
  };

  const formatValue = (value: any): string => {
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    return String(value || 'Not provided');
  };

  const copyToClipboard = async () => {
    if (!submissionData || !form) return;

    try {
      const submissionText = `${form.title} - Submission\n` +
        `Project: ${projectName || 'Unknown'}\n` +
        `Submitted: ${submissionData.submittedAt ? new Date(submissionData.submittedAt).toLocaleString() : new Date().toLocaleString()}\n` +
        `Status: ${submissionData.isCompleted ? 'Completed' : 'Draft'}\n\n` +
        `--- SUBMISSION DETAILS ---\n\n` +
        Object.entries(submissionData.responses || {})
          .map(([fieldId, value]) => {
            const label = getFieldLabel(fieldId);
            const formattedValue = formatValue(value);
            return `${label}:\n${formattedValue}\n`;
          })
          .join('\n');
      
      await navigator.clipboard.writeText(submissionText);
      toast({
        title: "Copied to clipboard",
        description: "Form submission data has been copied to your clipboard."
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Unable to copy to clipboard. Please try again.",
        variant: "destructive"
      });
    }
  };

  const exportToText = () => {
    if (!submissionData || !form) return;

    const submissionText = `${form.title} - Submission\n` +
      `Project: ${projectName || 'Unknown'}\n` +
      `Submitted: ${submissionData.submittedAt ? new Date(submissionData.submittedAt).toLocaleString() : new Date().toLocaleString()}\n` +
      `Status: ${submissionData.isCompleted ? 'Completed' : 'Draft'}\n\n` +
      `--- SUBMISSION DETAILS ---\n\n` +
      Object.entries(submissionData.responses || {})
        .map(([fieldId, value]) => {
          const label = getFieldLabel(fieldId);
          const formattedValue = formatValue(value);
          return `${label}:\n${formattedValue}\n`;
        })
        .join('\n');

    const blob = new Blob([submissionText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${form.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_submission.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!submissionData) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-xl p-6"
      >
        <div className="text-center py-12">
          <ClipboardCheck className="h-16 w-16 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-400 mb-2">No Submission Yet</h3>
          <p className="text-slate-500">
            Complete the onboarding form to see the submission data here.
          </p>
        </div>
      </motion.div>
    );
  }

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-xl p-6"
      >
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-white">Loading submission details...</span>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header Card */}
      <Card className="glass border-white/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white flex items-center">
                <FileText className="h-5 w-5 mr-2 text-primary" />
                {form?.title || 'Form Submission'}
              </CardTitle>
              <CardDescription className="text-slate-400 mt-2">
                Submitted {submissionData.submittedAt 
                  ? new Date(submissionData.submittedAt).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })
                  : new Date().toLocaleDateString()
                }
              </CardDescription>
            </div>
            {!isClient && (
              <div className="flex items-center space-x-2">
                <Button
                  onClick={copyToClipboard}
                  size="sm"
                  variant="outline"
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  <Copy className="h-3 w-3 mr-2" />
                  Copy
                </Button>
                <Button
                  onClick={exportToText}
                  size="sm"
                  variant="outline"
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  <Download className="h-3 w-3 mr-2" />
                  Export
                </Button>
              </div>
            )}
          </div>
          {submissionData.isCompleted && (
            <div className="flex items-center gap-2 text-green-400 bg-green-400/10 rounded-lg p-3 border border-green-400/20 mt-4">
              <CheckSquare className="h-4 w-4" />
              <span className="text-sm font-medium">Form completed successfully</span>
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Submission Data List */}
      <Card className="glass border-white/20">
        <CardHeader>
          <CardTitle className="text-white text-lg flex items-center">
            <ClipboardCheck className="h-5 w-5 mr-2 text-primary" />
            Submission Details
          </CardTitle>
          <CardDescription className="text-slate-400">
            Review all submitted information below
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-96 overflow-y-auto">
            <div className="space-y-0">
              {Object.entries(submissionData.responses || {}).map(([fieldId, value], index) => {
                const label = getFieldLabel(fieldId);
                const formattedValue = formatValue(value);
                const icon = getFieldIcon(fieldId, value);
                const isLast = index === Object.entries(submissionData.responses || {}).length - 1;
                
                return (
                  <motion.div
                    key={fieldId}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={cn(
                      "p-4 hover:bg-white/5 transition-all duration-200 border-b border-white/10",
                      isLast && "border-b-0"
                    )}
                  >
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0 mt-1">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                          {icon}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="space-y-2">
                          <h4 className="font-medium text-white text-sm leading-tight">
                            {label}
                          </h4>
                          <div className="bg-slate-800/30 rounded-lg p-3 border border-white/5">
                            <p className="text-slate-300 text-sm break-words leading-relaxed">
                              {formattedValue}
                            </p>
                          </div>
                        </div>
                      </div>
                      {!isClient && (
                        <div className="flex-shrink-0">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(formattedValue);
                                toast({
                                  title: "Copied",
                                  description: `${label} copied to clipboard`
                                });
                              } catch (error) {
                                console.error('Copy failed:', error);
                              }
                            }}
                            className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-white/10"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Card */}
      <Card className="glass border-white/20">
        <CardHeader>
          <CardTitle className="text-white text-sm flex items-center">
            <ClipboardCheck className="h-4 w-4 mr-2 text-primary" />
            Submission Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-slate-400">Status</p>
              <Badge className={cn(
                "mt-1",
                submissionData.isCompleted 
                  ? "bg-green-500/20 text-green-400 border-green-500/30"
                  : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
              )}>
                {submissionData.isCompleted ? 'Completed' : 'Draft'}
              </Badge>
            </div>
            <div>
              <p className="text-slate-400">Fields Completed</p>
              <p className="text-white font-medium mt-1">
                {Object.keys(submissionData.responses || {}).length}
              </p>
            </div>
            <div>
              <p className="text-slate-400">Project</p>
              <p className="text-white font-medium mt-1">
                {projectName || `Project #${projectId}`}
              </p>
            </div>
            <div>
              <p className="text-slate-400">Form</p>
              <p className="text-white font-medium mt-1">
                {form?.title || 'Onboarding Form'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}