import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { 
  ArrowLeft,
  Download,
  Mail,
  Calendar,
  Clock,
  User,
  Building,
  CheckCircle2,
  FileText,
  MessageSquare,
  Star,
  Share,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocation, useRoute } from "wouter";
import { formTemplates } from "@/lib/formTemplates";
import { useAuth } from "@/hooks/useAuth";

interface FormSubmission {
  id: number;
  formId?: number;
  formTemplateId?: string;
  clientId: number;
  responses: Record<string, string | string[]>;
  submittedAt: string;
  assignedAt: string;
  dueDate?: string;
  customInstructions?: string;
  assignedBy: string;
  completionTime: string;
  formDefinition?: {
    id: number;
    title: string;
    description: string;
    fields: any[];
  };
}

export default function SubmissionViewerPage() {
  const [location, setLocation] = useLocation();
  const [match, params] = useRoute('/onboarding/submissions/:id');
  const [submission, setSubmission] = useState<FormSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [dynamicForm, setDynamicForm] = useState<any>(null);
  const { isClient, currentRole, authUser } = useAuth();

  useEffect(() => {
    if (!params?.id) return;
    fetchSubmission();
  }, [params?.id]);

  const fetchSubmission = async () => {
    try {
      setLoading(true);
      
      // Try to fetch real form submission from the form-submissions API
      const url = new URL(`/api/form-submissions/${params?.id}`, window.location.origin);
      
      // For team members, add user ID to filter by accessible projects
      if (currentRole === 'team_member' && authUser?.id) {
        url.searchParams.set('userId', authUser.id.toString());
        url.searchParams.set('organizationId', (authUser.organizationId || 1).toString());
      }
      
      const response = await fetch(url.toString());
      
      if (response.ok) {
        const submissionData = await response.json();
        console.log('Real submission data:', submissionData);
        setSubmission(submissionData);
        
        // Use the form data included in the submission response
        if (submissionData.form) {
          console.log('Real form data:', submissionData.form);
          setDynamicForm(submissionData.form);
        } else if (submissionData.formId) {
          // Fallback: fetch the dynamic form definition separately
          const formResponse = await fetch(`/api/onboarding-forms/${submissionData.formId}`);
          if (formResponse.ok) {
            const formData = await formResponse.json();
            console.log('Real form data (fallback):', formData);
            setDynamicForm(formData);
          }
        }
      } else {
        // Try to get submission by project ID as fallback
        const projectUrl = new URL('/api/form-submissions', window.location.origin);
        projectUrl.searchParams.set('projectId', params?.id || '');
        
        // For team members, add user ID to filter by accessible projects
        if (currentRole === 'team_member' && authUser?.id) {
          projectUrl.searchParams.set('userId', authUser.id.toString());
          projectUrl.searchParams.set('organizationId', (authUser.organizationId || 1).toString());
        }
        
        const projectSubmissionResponse = await fetch(projectUrl.toString());
        
        if (projectSubmissionResponse.ok) {
          const submissionsData = await projectSubmissionResponse.json();
          console.log('Project submissions data:', submissionsData);
          
          if (submissionsData && submissionsData.length > 0) {
            const latestSubmission = submissionsData[0]; // Get the most recent one
            setSubmission(latestSubmission);
            
            // Get the form definition
            if (latestSubmission.form) {
              setDynamicForm(latestSubmission.form);
            } else if (latestSubmission.formId) {
              const formResponse = await fetch(`/api/onboarding-forms/${latestSubmission.formId}`);
              if (formResponse.ok) {
                const formData = await formResponse.json();
                setDynamicForm(formData);
              }
            }
          } else {
            // No real data found, show empty state
            setSubmission(null);
            setDynamicForm(null);
          }
        } else {
          // No real data found
          setSubmission(null);
          setDynamicForm(null);
        }
      }
    } catch (error) {
      console.error('Error fetching submission:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTemplate = () => {
    if (!submission) return null;
    
    // Prefer dynamic form over static template
    if (dynamicForm) {
      return {
        id: dynamicForm.id.toString(),
        title: dynamicForm.title,
        description: dynamicForm.description,
        category: 'general' as const,
        estimatedTime: '15-20 minutes',
        icon: '📋',
        fields: dynamicForm.fields
      };
    }
    
    // Fallback to static template if available
    if (submission.formTemplateId) {
      return formTemplates.find(t => t.id === submission.formTemplateId);
    }
    
    return null;
  };

  const getClient = () => {
    if (!submission) return null;
    
    // TODO: Replace with actual API call to fetch client data
    // For now, return a default client structure
    return {
      id: submission.clientId,
      name: 'Client User',
      email: 'client@example.com',
      company: 'Client Company',
      avatar: null,
      phone: '',
      role: 'client' as const,
      status: 'active' as const,
      joinedAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      projects: []
    };
  };

  const formatFieldValue = (value: string | string[], field: any) => {
    // Handle array values (checkboxes, multi-select)
    if (Array.isArray(value)) {
      if (value.length === 0) return "Not specified";
      return (
        <div className="space-y-1">
          {value.map((item, index) => (
            <Badge key={index} variant="secondary" className="mr-1 mb-1 bg-white/10 text-slate-300 border-white/20">
              {field?.options?.find((opt: any) => opt.value === item)?.label || item}
            </Badge>
          ))}
        </div>
      );
    }

    // Handle single string values that might be comma-separated (from checkbox fields)
    if (typeof value === 'string' && field?.type === 'checkbox' && value.includes(',')) {
      const values = value.split(',').map(v => v.trim());
      return (
        <div className="space-y-1">
          {values.map((item, index) => (
            <Badge key={index} variant="secondary" className="mr-1 mb-1 bg-white/10 text-slate-300 border-white/20">
              {field?.options?.find((opt: any) => opt.value === item)?.label || item}
            </Badge>
          ))}
        </div>
      );
    }

    if (!value || value.trim() === '') return "Not specified";

    // Handle long text with line breaks
    if (value.length > 100 || value.includes('\\n')) {
      return (
        <div className="whitespace-pre-wrap text-slate-300 bg-white/5 rounded-lg p-3 border border-white/10">
          {value}
        </div>
      );
    }

    // Handle select field display
    if (field?.options && field?.options.length > 0) {
      const option = field.options.find((opt: any) => opt.value === value);
      return option ? option.label : value;
    }

    return value;
  };

  const exportToPDF = () => {
    // Mock PDF export functionality
    alert("PDF export would be implemented here");
  };

  const sendToClient = () => {
    // Mock email functionality
    alert("Email functionality would be implemented here");
  };

  if (loading) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="text-center">
          <FileText className="h-16 w-16 text-slate-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">No Submission Found</h2>
          <p className="text-slate-400 mb-6">
            No form submission was found for this ID. The form may not have been submitted yet, or the submission ID may be incorrect.
          </p>
          <div className="space-x-3">
            <Button 
              onClick={() => setLocation('/admin-onboarding')} 
              className="bg-primary hover:bg-primary/90"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Onboarding
            </Button>
            <Button 
              onClick={() => window.location.reload()} 
              variant="outline"
              className="glass border-white/20 text-white hover:bg-white/10"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const template = getTemplate();
  const client = getClient();

  if (!template || !client) return null;

  const getFieldById = (fieldId: string) => {
    return template.fields.find(f => f.id === fieldId);
  };

  // Group responses by sections
  const groupedResponses: any[] = [];
  let currentSection: any = null;
  let currentFields: any[] = [];

  template.fields.forEach(field => {
    if (field.type === 'section') {
      if (currentSection && currentFields.length > 0) {
        groupedResponses.push({
          section: currentSection,
          fields: currentFields
        });
      }
      currentSection = field;
      currentFields = [];
    } else if (submission.responses[field.id] !== undefined) {
      currentFields.push({
        field,
        value: submission.responses[field.id]
      });
    }
  });

  // Add the last section
  if (currentSection && currentFields.length > 0) {
    groupedResponses.push({
      section: currentSection,
      fields: currentFields
    });
  }

  // Handle fields without sections - show all fields that have responses
  const fieldsWithoutSection = template.fields
    .filter(f => f.type !== 'section' && submission.responses[f.id] !== undefined)
    .filter(f => !groupedResponses.some(group => 
      group.fields.some((gf: any) => gf.field.id === f.id)
    ));

  if (fieldsWithoutSection.length > 0) {
    groupedResponses.unshift({
      section: null,
      fields: fieldsWithoutSection.map(field => ({
        field,
        value: submission.responses[field.id]
      }))
    });
  }
  
  // If no grouped responses (no matching fields), create a fallback group with all responses
  if (groupedResponses.length === 0 && submission.responses && Object.keys(submission.responses).length > 0) {
    const allResponseFields = Object.keys(submission.responses).map(responseKey => {
      // Try to find matching field definition
      const matchingField = template.fields.find(f => f.id === responseKey);
      
      // Create a default field if no matching definition found  
      const field = matchingField || {
        id: responseKey,
        type: 'text',
        label: responseKey
          .replace(/[-_]/g, ' ')
          .replace(/\b\w/g, l => l.toUpperCase())
          .replace(/\s+/g, ' ')
          .trim(),
        required: false,
        options: []
      };
      
      return {
        field,
        value: submission.responses[responseKey]
      };
    });
    
    groupedResponses.push({
      section: null,
      fields: allResponseFields
    });
  }

  return (
    <div className="min-h-screen gradient-bg">
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation('/admin-onboarding')}
              className="text-slate-400 hover:text-white border border-white/20 rounded-xl"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white">Form Submission</h1>
              <p className="text-slate-400">Complete onboarding form details</p>
            </div>
          </div>
          
          {!isClient && (
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                onClick={sendToClient}
                className="glass border-white/20 text-white hover:bg-white/10"
              >
                <Mail className="mr-2 h-4 w-4" />
                Email Client
              </Button>
              <Button
                variant="outline"
                onClick={exportToPDF}
                className="glass border-white/20 text-white hover:bg-white/10"
              >
                <Download className="mr-2 h-4 w-4" />
                Export PDF
              </Button>
            </div>
          )}
        </div>

        {/* Summary Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-xl p-6 mb-8"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Client Info */}
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white text-xl font-bold">
                  {client.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">{client.name}</h3>
                  <p className="text-slate-400">{client.company}</p>
                  <p className="text-slate-400 text-sm">{client.email}</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm text-slate-400">
                  <User className="h-4 w-4" />
                  <span>Assigned by {submission.assignedBy}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-slate-400">
                  <Calendar className="h-4 w-4" />
                  <span>Assigned {new Date(submission.assignedAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-green-400">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Completed {new Date(submission.submittedAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-slate-400">
                  <Clock className="h-4 w-4" />
                  <span>Completion time: {submission.completionTime}</span>
                </div>
              </div>
            </div>

            {/* Form Info */}
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="text-3xl">{template.icon}</div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{template.title}</h3>
                  <p className="text-slate-400 text-sm">{template.description}</p>
                  <div className="flex items-center space-x-4 mt-2">
                    <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                      {template.category}
                    </Badge>
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                      Completed
                    </Badge>
                  </div>
                </div>
              </div>

              {submission.customInstructions && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                  <div className="flex items-start space-x-2">
                    <MessageSquare className="h-4 w-4 text-blue-400 mt-0.5" />
                    <div>
                      <p className="text-blue-300 text-sm font-medium">Custom Instructions:</p>
                      <p className="text-blue-300 text-sm mt-1">{submission.customInstructions}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Form Responses - Clean List View */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-xl p-6"
        >
          <h2 className="text-xl font-bold text-white mb-6">Form Responses</h2>
          
          <div className="space-y-6">
            {groupedResponses.map((group, groupIndex) => 
              group.fields.map((item: any, fieldIndex: number) => (
                <motion.div
                  key={item.field.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: fieldIndex * 0.05 }}
                  className="border-b border-white/10 pb-4 last:border-b-0"
                >
                  <div className="mb-2">
                    <Label className="text-slate-300 font-medium text-base block">
                      {item.field.label}
                      {item.field.required && <span className="text-red-400 ml-1">*</span>}
                    </Label>
                  </div>

                  <div className="text-white text-sm">
                    {formatFieldValue(item.value, item.field)}
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>

        {/* Footer Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-8 glass rounded-xl p-6"
        >
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-400">
              <p>Form completed on {new Date(submission.submittedAt).toLocaleString()}</p>
              <p>Total completion time: {submission.completionTime}</p>
            </div>
            
            <div className="flex items-center space-x-3">
              {!isClient && (
                <Button
                  variant="outline"
                  onClick={() => window.print()}
                  className="glass border-white/20 text-white hover:bg-white/10"
                >
                  <Share className="mr-2 h-4 w-4" />
                  Print
                </Button>
              )}
              <Button
                onClick={() => setLocation('/admin-onboarding')}
                className="bg-primary hover:bg-primary/90"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Onboarding
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}