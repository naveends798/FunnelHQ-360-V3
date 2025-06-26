import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  FileText, 
  Check, 
  AlertCircle, 
  Loader2,
  Save,
  Edit3,
  Eye,
  RefreshCw,
  ClipboardList
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

interface FormSubmission {
  id?: number;
  projectId: number;
  clientId: number;
  responses: Record<string, any>;
  isCompleted: boolean;
  submittedAt?: string;
}

interface ProjectOnboardingFormProps {
  projectId: number;
  clientId: number;
  existingSubmission?: FormSubmission | null;
  onSubmissionComplete?: (submission: FormSubmission) => void;
  refreshTrigger?: number; // Add this to force refresh when forms are assigned
}

export default function ProjectOnboardingForm({ 
  projectId, 
  clientId, 
  existingSubmission,
  onSubmissionComplete,
  refreshTrigger
}: ProjectOnboardingFormProps) {
  const [form, setForm] = useState<OnboardingForm | null>(null);
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submissionDate, setSubmissionDate] = useState<Date | null>(null);

  useEffect(() => {
    fetchOnboardingForm();
  }, [projectId, refreshTrigger]);

  // Log when existing submission is detected
  useEffect(() => {
    if (existingSubmission) {
      console.log('🔒 Existing submission detected, showing read-only view:', existingSubmission);
    }
  }, [existingSubmission]);

  const fetchOnboardingForm = async () => {
    try {
      setLoading(true);
      console.log(`🔍 Fetching onboarding form for project ${projectId}...`);
      
      // Fetch the onboarding form template for this project
      const formResponse = await fetch(`/api/projects/${projectId}/onboarding-form`);
      console.log(`📊 Form response status: ${formResponse.status}`);
      
      if (formResponse.ok) {
        const formData = await formResponse.json();
        console.log('✅ Form data received:', formData);
        setForm(formData);
        
        // Always start with empty template form
        setResponses({});
        setIsSubmitted(false);
        setSubmissionDate(null);
      } else {
        console.log('❌ No form assigned to this project');
        // No form assigned - clear any cached submission data
        setForm(null);
        setResponses({});
        setIsSubmitted(false);
        setSubmissionDate(null);
      }
    } catch (error) {
      console.error('💥 Error fetching onboarding template:', error);
      setForm(null);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!form) return false;

    form.fields.forEach(field => {
      if (field.required && field.type !== 'section' && (!responses[field.id] || responses[field.id] === '')) {
        errors[field.id] = `${field.label} is required`;
      }
      
      if (field.type === 'email' && responses[field.id]) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(responses[field.id])) {
          errors[field.id] = 'Please enter a valid email address';
        }
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (fieldId: string, value: any) => {
    setResponses(prev => ({
      ...prev,
      [fieldId]: value
    }));
    
    // Clear validation error for this field
    if (validationErrors[fieldId]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldId];
        return newErrors;
      });
    }
  };

  const handleSave = async () => {
    if (!form || !validateForm()) return;

    try {
      setSaving(true);
      
      // Create the submission data according to the API schema
      const submissionData = {
        formId: form.id,
        projectId,
        clientId,
        responses,
        isCompleted: true
      };

      console.log('Submitting form data:', submissionData);
      
      // Submit to the API
      const response = await fetch('/api/form-submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit form');
      }

      const savedSubmission = await response.json();
      console.log('Form submitted successfully:', savedSubmission);
      
      // Show success state
      setIsSubmitted(true);
      setSubmissionDate(new Date());
      
      // Notify parent component with the saved submission
      onSubmissionComplete?.({
        ...savedSubmission,
        projectId,
        clientId,
        responses,
        isCompleted: true,
        submittedAt: savedSubmission.submittedAt || new Date().toISOString()
      } as FormSubmission);
      
    } catch (error) {
      console.error('Error submitting form:', error);
      // You might want to show an error toast here
      alert('Failed to submit form. Please try again.');
    } finally {
      setSaving(false);
    }
  };


  const renderField = (field: FormField) => {
    const value = responses[field.id] || '';
    const hasError = !!validationErrors[field.id];

    switch (field.type) {
      case 'text':
      case 'email':
      case 'number':
      case 'tel':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id} className="text-white">
              {field.label} {field.required && <span className="text-red-400">*</span>}
            </Label>
            <Input
              id={field.id}
              type={field.type}
              placeholder={field.placeholder}
              value={value}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              className={cn(
                "glass border-white/20 text-white placeholder-slate-400",
                hasError && "border-red-500"
              )}
            />
            {hasError && (
              <p className="text-red-400 text-sm flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {validationErrors[field.id]}
              </p>
            )}
          </div>
        );

      case 'textarea':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id} className="text-white">
              {field.label} {field.required && <span className="text-red-400">*</span>}
            </Label>
            <Textarea
              id={field.id}
              placeholder={field.placeholder}
              value={value}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              className={cn(
                "glass border-white/20 text-white placeholder-slate-400 min-h-[100px]",
                hasError && "border-red-500"
              )}
            />
            {hasError && (
              <p className="text-red-400 text-sm flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {validationErrors[field.id]}
              </p>
            )}
          </div>
        );

      case 'select':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id} className="text-white">
              {field.label} {field.required && <span className="text-red-400">*</span>}
            </Label>
            <select
              id={field.id}
              value={value}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              className={cn(
                "w-full p-3 rounded-lg glass border-white/20 text-white bg-transparent",
                hasError && "border-red-500"
              )}
            >
              <option value="">Select an option</option>
              {field.options?.map((option, index) => {
                const optionValue = typeof option === 'string' ? option : option.value;
                const optionLabel = typeof option === 'string' ? option : option.label;
                return (
                  <option key={`${field.id}-${optionValue}-${index}`} value={optionValue} className="bg-slate-800">
                    {optionLabel}
                  </option>
                );
              })}
            </select>
            {hasError && (
              <p className="text-red-400 text-sm flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {validationErrors[field.id]}
              </p>
            )}
          </div>
        );

      case 'radio':
        return (
          <div key={field.id} className="space-y-2">
            <Label className="text-white">
              {field.label} {field.required && <span className="text-red-400">*</span>}
            </Label>
            <div className="space-y-2">
              {field.options?.map((option, index) => {
                const optionValue = typeof option === 'string' ? option : option.value;
                const optionLabel = typeof option === 'string' ? option : option.label;
                return (
                  <div key={`${field.id}-${optionValue}-${index}`} className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id={`${field.id}-${optionValue}`}
                      name={field.id}
                      value={optionValue}
                      checked={value === optionValue}
                      onChange={(e) => handleInputChange(field.id, e.target.value)}
                      className="border-white/20 text-primary focus:ring-primary"
                    />
                    <Label htmlFor={`${field.id}-${optionValue}`} className="text-white">
                      {optionLabel}
                    </Label>
                  </div>
                );
              })}
            </div>
            {hasError && (
              <p className="text-red-400 text-sm flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {validationErrors[field.id]}
              </p>
            )}
          </div>
        );

      case 'checkbox':
        if (field.options && field.options.length > 0) {
          // Checkbox group
          const selectedValues = Array.isArray(value) ? value : [];
          return (
            <div key={field.id} className="space-y-2">
              <Label className="text-white">
                {field.label} {field.required && <span className="text-red-400">*</span>}
              </Label>
              <div className="space-y-2">
                {field.options.map((option, index) => {
                  const optionValue = typeof option === 'string' ? option : option.value;
                  const optionLabel = typeof option === 'string' ? option : option.label;
                  return (
                    <div key={`${field.id}-${optionValue}-${index}`} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`${field.id}-${optionValue}`}
                        checked={selectedValues.includes(optionValue)}
                        onChange={(e) => {
                          const newValues = e.target.checked
                            ? [...selectedValues, optionValue]
                            : selectedValues.filter(v => v !== optionValue);
                          handleInputChange(field.id, newValues);
                        }}
                        className="rounded border-white/20 text-primary focus:ring-primary"
                      />
                      <Label htmlFor={`${field.id}-${optionValue}`} className="text-white">
                        {optionLabel}
                      </Label>
                    </div>
                  );
                })}
              </div>
              {hasError && (
                <p className="text-red-400 text-sm flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {validationErrors[field.id]}
                </p>
              )}
            </div>
          );
        } else {
          // Single checkbox
          return (
            <div key={field.id} className="flex items-center space-x-2">
              <input
                type="checkbox"
                id={field.id}
                checked={value === true}
                onChange={(e) => handleInputChange(field.id, e.target.checked)}
                className="rounded border-white/20 text-primary focus:ring-primary"
              />
              <Label htmlFor={field.id} className="text-white">
                {field.label} {field.required && <span className="text-red-400">*</span>}
              </Label>
              {hasError && (
                <p className="text-red-400 text-sm flex items-center ml-2">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {validationErrors[field.id]}
                </p>
              )}
            </div>
          );
        }

      case 'section':
        return (
          <div key={field.id} className="py-4">
            <h3 className="text-lg font-semibold text-white border-b border-white/20 pb-2">
              {field.label}
            </h3>
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Card className="glass border-white/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-white">Loading onboarding template...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!form) {
    return (
      <Card className="glass border-white/20">
        <CardContent className="p-6">
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-400 mb-2">No Onboarding Template Assigned</h3>
            <p className="text-slate-500 mb-4">
              Please assign an onboarding form template to this project from the Onboarding menu in the sidebar.
            </p>
            <Button 
              onClick={fetchOnboardingForm}
              disabled={loading}
              variant="outline"
              className="glass border-white/20 text-white hover:bg-white/10"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Check for Forms
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <Card className="glass border-white/20">
        <CardHeader className="border-b border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white flex items-center">
                <FileText className="h-5 w-5 mr-2 text-primary" />
                {form.title}
              </CardTitle>
              {form.description && (
                <CardDescription className="text-slate-400 mt-2">
                  {form.description}
                </CardDescription>
              )}
            </div>
            {(existingSubmission || isSubmitted) && form && (
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                <Check className="h-3 w-3 mr-1" />
                Submitted
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {(existingSubmission || isSubmitted) && form ? (
            // Success State - Form Already Submitted
            <div className="text-center py-12">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.5 }}
                className="w-24 h-24 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6"
              >
                <Check className="h-12 w-12 text-green-400" />
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <h3 className="text-2xl font-bold text-white mb-3">
                  {existingSubmission ? 'Form Already Submitted' : 'Template Form Completed!'}
                </h3>
                <p className="text-slate-400 text-lg mb-2">
                  {existingSubmission 
                    ? 'This onboarding form has been completed and cannot be modified.'
                    : 'This onboarding form template has been successfully completed.'
                  }
                </p>
                <p className="text-slate-500 text-sm mb-8">
                  Submitted on {(existingSubmission?.submittedAt 
                    ? new Date(existingSubmission.submittedAt) 
                    : submissionDate
                  )?.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
                
                {!existingSubmission && (
                  <Button 
                    onClick={() => {
                      setIsSubmitted(false);
                      setSubmissionDate(null);
                      setResponses({});
                    }}
                    className="bg-primary hover:bg-primary/90 text-white px-8 py-3"
                    size="lg"
                  >
                    <RefreshCw className="h-5 w-5 mr-2" />
                    Reset Template
                  </Button>
                )}
                
                {existingSubmission && (
                  <p className="text-slate-400 text-sm">
                    View the complete submission data in the Submission tab above.
                  </p>
                )}
              </motion.div>
            </div>
          ) : (
            // Form Filling Mode
            <>
              <Alert className="border-blue-500/30 bg-blue-500/10">
                <ClipboardList className="h-4 w-4 text-blue-400" />
                <AlertDescription className="text-blue-400">
                  Please fill out this form to the best of your knowledge so we can build out anything for you.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                {form.fields.map(renderField)}
              </div>

              <div className="flex items-center justify-end space-x-3 pt-6 border-t border-white/10">
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-primary hover:bg-primary/90 min-w-[120px]"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Form
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}