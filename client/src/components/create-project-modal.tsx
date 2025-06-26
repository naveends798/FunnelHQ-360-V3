import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon, X, Plus, Users, DollarSign, Search, AlertTriangle, FileText } from "lucide-react";
import { format } from "date-fns";
import { type Client, BILLING_PLANS, type BillingPlan } from "@shared/schema";
import CreateClientModal from "@/components/create-client-modal";
import { useAuth } from "@/hooks/useAuth";
import { useTeam } from "@/hooks/useTeam";

interface CreateProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateProjectModal({ open, onOpenChange }: CreateProjectModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [clientSearchTerm, setClientSearchTerm] = useState("");
  const [showCreateClient, setShowCreateClient] = useState(false);
  const { authUser, isTeamMember } = useAuth();
  const testPlan = 'pro' as BillingPlan;
  
  // Get team members from the team hook
  const { teamMembers: allTeamMembers, loading: teamLoading } = useTeam({
    organizationId: authUser?.organizationId || 1
  });
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    clientId: "",
    priority: "",
    budget: "",
    startDate: undefined as Date | undefined,
    endDate: undefined as Date | undefined,
    teamMembers: [] as number[],
    tags: [] as string[],
    onboardingFormId: "",
  });
  const [newTag, setNewTag] = useState("");

  const { data: clients, isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  // Fetch onboarding forms for selection
  const { data: onboardingForms, isLoading: formsLoading } = useQuery({
    queryKey: ["/api/onboarding-forms", { organizationId: authUser?.organizationId || 1 }],
    queryFn: async () => {
      const response = await fetch(`/api/onboarding-forms?organizationId=${authUser?.organizationId || 1}`);
      if (!response.ok) throw new Error('Failed to fetch onboarding forms');
      return response.json();
    },
    enabled: !!authUser?.organizationId
  });

  // Fetch organization billing data to check project limits
  const { data: billingData } = useQuery({
    queryKey: [`/api/billing/${authUser?.organizationId || 1}`],
    queryFn: async () => {
      const response = await fetch(`/api/billing/${authUser?.organizationId || 1}`);
      if (!response.ok) throw new Error('Failed to fetch billing data');
      return response.json();
    },
    enabled: !!authUser?.organizationId
  });

  // Fetch current project count for the organization
  const { data: projectCount } = useQuery({
    queryKey: [`/api/organizations/${authUser?.organizationId || 1}/projects/count`],
    queryFn: async () => {
      const response = await fetch(`/api/organizations/${authUser?.organizationId || 1}/projects/count`);
      if (!response.ok) throw new Error('Failed to fetch project count');
      const data = await response.json();
      return data.count || 0;
    },
    enabled: !!authUser?.organizationId
  });

  const filteredClients = clients?.filter(client =>
    client.name.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(clientSearchTerm.toLowerCase())
  ) || [];

  // Check if organization can create more projects (using test plan)
  const canCreateProject = () => {
    if (isTeamMember) return true; // Team members don't have project limits
    if (projectCount === undefined) return true; // Allow if data not loaded yet
    
    const planLimits = BILLING_PLANS['pro'];
    
    if (!planLimits) return true; // Allow if plan not found
    if (planLimits.limits.projects === -1) return true; // Unlimited projects
    
    return projectCount < planLimits.limits.projects;
  };

  const getProjectLimitMessage = () => {
    if (isTeamMember) return null; // Team members don't see limit messages
    if (projectCount === undefined) return null;
    
    const planLimits = BILLING_PLANS['pro'];
    
    if (!planLimits) return null;
    if (planLimits.limits.projects === -1) return null; // Unlimited
    
    const remaining = planLimits.limits.projects - projectCount;
    if (remaining <= 0) {
      return `You've reached your ${planLimits.name} plan limit of ${planLimits.limits.projects} projects. Upgrade to Pro for unlimited projects.`;
    }
    if (remaining <= 1) {
      return `You have ${remaining} project${remaining === 1 ? '' : 's'} remaining on your ${planLimits.name} plan.`;
    }
    return null;
  };


  const steps = [
    { id: 1, title: "Project Details", description: "Basic project information" },
    { id: 2, title: "Client & Team", description: "Assign client and team members" },
    { id: 3, title: "Timeline & Budget", description: "Set dates and budget" },
  ];

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    try {
      // Check project limits first
      if (!canCreateProject()) {
        alert(getProjectLimitMessage() || "You've reached your project limit for this plan.");
        return;
      }
      
      // Validation
      if (!formData.title.trim()) {
        alert("Please enter a project title");
        return;
      }
      if (!formData.clientId || formData.clientId === "" || formData.clientId === "no-clients" || formData.clientId === "loading") {
        alert("Please select a client");
        return;
      }
      if (formData.budget === "" || formData.budget === null || formData.budget === undefined) {
        alert("Please enter a budget amount");
        return;
      }

      const projectData = {
        title: formData.title,
        description: formData.description || "",
        clientId: parseInt(formData.clientId),
        organizationId: authUser?.organizationId || 1, // Use user's organization ID
        ownerId: authUser?.id || 1, // Add required ownerId field
        createdBy: authUser?.id || 1, // Required createdBy field
        priority: formData.priority || "medium",
        budget: formData.budget || "0", // Keep as string for decimal type
        status: "active",
        progress: null, // Auto-calculate progress from tasks
        tags: formData.tags,
        teamMembers: formData.teamMembers.map(id => allTeamMembers.find(member => member.id === id)?.name || `User ${id}`),
        endDate: formData.endDate ? formData.endDate.toISOString() : null, // Auto-calculate from task due dates if not set
        onboardingFormId: formData.onboardingFormId ? parseInt(formData.onboardingFormId) : null
      };

      console.log("Sending project data:", projectData);

      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(projectData),
      });

      const responseText = await response.text();
      console.log("Response:", response.status, responseText);

      if (!response.ok) {
        let errorMessage = "Failed to create project";
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.error || errorMessage;
          if (errorData.details) {
            console.error("Validation errors:", errorData.details);
          }
        } catch (e) {
          console.error("Response was not JSON:", responseText);
        }
        throw new Error(errorMessage);
      }

      const project = JSON.parse(responseText);
      console.log("Project created:", project);

      // Send email notifications to client and team members
      try {
        const selectedClient = clients?.find(c => c.id === parseInt(formData.clientId));
        const selectedTeamMembers = allTeamMembers.filter(member => 
          formData.teamMembers.includes(member.id)
        );

        // Send email to client about project assignment
        if (selectedClient) {
          console.log("Sending client project assignment email...");
          const clientEmailResponse = await fetch("/api/email/client-project-assignment", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              clientEmail: selectedClient.email,
              clientName: selectedClient.name,
              projectTitle: formData.title,
              projectId: project.id,
              companyName: "FunnelHQ 360",
              loginUrl: `${window.location.origin}/client-portal`,
            }),
          });

          if (clientEmailResponse.ok) {
            console.log("✅ Client notification email sent successfully");
          } else {
            console.warn("⚠️ Failed to send client notification email");
          }
        }

        // Send email notifications to assigned team members
        for (const teamMember of selectedTeamMembers) {
          console.log(`Sending team member notification to ${teamMember.email}...`);
          try {
            const teamEmailResponse = await fetch("/api/email/team-project-assignment", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                memberEmail: teamMember.email,
                memberName: teamMember.name,
                projectTitle: formData.title,
                projectId: project.id,
                clientName: selectedClient?.name || "Client",
                loginUrl: `${window.location.origin}/projects/${project.id}`,
              }),
            });

            if (teamEmailResponse.ok) {
              console.log(`✅ Team member notification sent to ${teamMember.email}`);
            } else {
              console.warn(`⚠️ Failed to send notification to ${teamMember.email}`);
            }
          } catch (error) {
            console.warn(`⚠️ Error sending notification to ${teamMember.email}:`, error);
          }
        }
      } catch (error) {
        console.warn("⚠️ Error sending notification emails:", error);
        // Don't block project creation if email fails
      }
      
      // Close modal and reset form
      onOpenChange(false);
      setCurrentStep(1);
      setFormData({
        title: "",
        description: "",
        clientId: "",
        priority: "",
        budget: "",
        startDate: undefined,
        endDate: undefined,
        teamMembers: [],
        tags: [],
        onboardingFormId: "",
      });
      setClientSearchTerm("");
      
      // Invalidate queries to refresh the project list
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      
      // Navigate to the newly created project
      setLocation(`/projects/${project.id}`);
    } catch (error) {
      console.error("Error creating project:", error);
      alert("Failed to create project. Please try again.");
    }
  };

  const handleClientCreated = () => {
    setShowCreateClient(false);
    // The client list will automatically refresh due to query invalidation
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const toggleTeamMember = (memberId: number) => {
    setFormData(prev => ({
      ...prev,
      teamMembers: prev.teamMembers.includes(memberId)
        ? prev.teamMembers.filter(id => id !== memberId)
        : [...prev.teamMembers, memberId]
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-slate-900 border-white/20">
        <DialogHeader>
          <DialogTitle className="text-white text-xl">Create New Project</DialogTitle>
          <DialogDescription className="text-slate-400">
            Set up a new project with team members and timeline
          </DialogDescription>
          {getProjectLimitMessage() && (
            <div className="mt-2 p-3 bg-yellow-500/20 border border-yellow-500/30 rounded-lg flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-400 flex-shrink-0" />
              <p className="text-yellow-200 text-sm">{getProjectLimitMessage()}</p>
            </div>
          )}
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-6">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={cn(
                "flex items-center",
                index < steps.length - 1 && "flex-1"
              )}
            >
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-colors",
                  currentStep >= step.id
                    ? "bg-primary border-primary text-white"
                    : "border-slate-600 text-slate-400"
                )}
              >
                {step.id}
              </div>
              <div className="ml-3 hidden sm:block">
                <div className={cn(
                  "text-sm font-medium",
                  currentStep >= step.id ? "text-white" : "text-slate-400"
                )}>
                  {step.title}
                </div>
                <div className="text-xs text-slate-500">{step.description}</div>
              </div>
              {index < steps.length - 1 && (
                <div className={cn(
                  "h-px flex-1 mx-4",
                  currentStep > step.id ? "bg-primary" : "bg-slate-600"
                )} />
              )}
            </div>
          ))}
        </div>

        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="space-y-6"
        >
          {/* Step 1: Project Details */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="title" className="text-white">Project Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter project title"
                  className="bg-white/5 border-white/20 text-white placeholder:text-slate-400"
                />
              </div>

              <div>
                <Label htmlFor="description" className="text-white">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the project goals and scope"
                  className="bg-white/5 border-white/20 text-white placeholder:text-slate-400 min-h-[100px]"
                />
              </div>

              <div>
                <Label htmlFor="priority" className="text-white">Priority</Label>
                <Select value={formData.priority} onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}>
                  <SelectTrigger className="bg-white/5 border-white/20 text-white">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low Priority</SelectItem>
                    <SelectItem value="medium">Medium Priority</SelectItem>
                    <SelectItem value="high">High Priority</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-white">Tags</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Add a tag"
                    className="bg-white/5 border-white/20 text-white placeholder:text-slate-400"
                    onKeyPress={(e) => e.key === 'Enter' && addTag()}
                  />
                  <Button onClick={addTag} size="sm" variant="outline" className="border-white/20">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="bg-white/10 text-white">
                      {tag}
                      <X 
                        className="h-3 w-3 ml-1 cursor-pointer" 
                        onClick={() => removeTag(tag)}
                      />
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Client & Team */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-white">Select Client</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCreateClient(true)}
                    className="text-purple-400 hover:text-purple-300"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    New Client
                  </Button>
                </div>
                
                {/* Client Search */}
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search clients..."
                    value={clientSearchTerm}
                    onChange={(e) => setClientSearchTerm(e.target.value)}
                    className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-slate-400"
                  />
                </div>
                
                <Select value={formData.clientId} onValueChange={(value) => setFormData(prev => ({ ...prev, clientId: value }))}>
                  <SelectTrigger className="bg-white/5 border-white/20 text-white">
                    <SelectValue placeholder="Choose a client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientsLoading ? (
                      <SelectItem value="loading" disabled>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                          Loading clients...
                        </div>
                      </SelectItem>
                    ) : filteredClients.length === 0 ? (
                      <SelectItem value="no-clients" disabled>
                        <div className="text-slate-500">
                          {clientSearchTerm ? "No clients found" : "No clients available"}
                        </div>
                      </SelectItem>
                    ) : (
                      filteredClients.map((client) => (
                        <SelectItem key={client.id} value={client.id.toString()}>
                          <div className="flex items-center gap-3">
                            {client.avatar ? (
                              <div className="w-6 h-6 rounded-full overflow-hidden">
                                <img 
                                  src={client.avatar} 
                                  alt={client.name} 
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
                                {client.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <div className="font-medium">{client.name}</div>
                              <div className="text-sm text-slate-500">{client.email}</div>
                            </div>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-white flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Team Members
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      // TODO: Implement add team member functionality
                      console.log("Add team member clicked");
                    }}
                    className="text-purple-400 hover:text-purple-300"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Member
                  </Button>
                </div>
                {teamLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span className="ml-2 text-slate-400">Loading team members...</span>
                  </div>
                ) : allTeamMembers.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-slate-400 text-sm">No team members available</p>
                    <p className="text-slate-500 text-xs mt-1">Add team members first in the Team Management page</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                    {allTeamMembers.map((member) => (
                      <div
                        key={member.id}
                        onClick={() => toggleTeamMember(member.id)}
                        className={cn(
                          "p-3 rounded-lg border cursor-pointer transition-all",
                          formData.teamMembers.includes(member.id)
                            ? "border-primary bg-primary/20"
                            : "border-white/20 bg-white/5 hover:bg-white/10"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          {member.avatar ? (
                            <img
                              src={member.avatar}
                              alt={member.name}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-medium">
                              {member.name.split(' ').map(n => n[0]).join('')}
                            </div>
                          )}
                          <div>
                            <div className="text-white font-medium">{member.name}</div>
                            <div className="text-slate-400 text-sm">{member.role}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Onboarding Form Assignment */}
              <div>
                <Label className="text-white flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Assign Onboarding Form (Optional)
                </Label>
                <p className="text-slate-400 text-sm mb-3">
                  Assign an onboarding form that clients will have access to for this project
                </p>
                <Select value={formData.onboardingFormId} onValueChange={(value) => setFormData(prev => ({ ...prev, onboardingFormId: value }))}>
                  <SelectTrigger className="bg-white/5 border-white/20 text-white">
                    <SelectValue placeholder="Choose an onboarding form" />
                  </SelectTrigger>
                  <SelectContent>
                    {formsLoading ? (
                      <SelectItem value="loading" disabled>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                          Loading forms...
                        </div>
                      </SelectItem>
                    ) : !onboardingForms || onboardingForms.length === 0 ? (
                      <SelectItem value="no-forms" disabled>
                        <div className="text-slate-500">
                          No onboarding forms available. Create one first.
                        </div>
                      </SelectItem>
                    ) : (
                      onboardingForms.map((form: any) => (
                        <SelectItem key={form.id} value={form.id.toString()}>
                          <div className="flex flex-col">
                            <div className="font-medium">{form.title}</div>
                            <div className="text-sm text-slate-500">{form.description}</div>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Step 3: Timeline & Budget */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div>
                <Label className="text-white flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Budget
                </Label>
                <Input
                  type="number"
                  value={formData.budget}
                  onChange={(e) => setFormData(prev => ({ ...prev, budget: e.target.value }))}
                  placeholder="0.00"
                  className="bg-white/5 border-white/20 text-white placeholder:text-slate-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-white">Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal bg-white/5 border-white/20 text-white",
                          !formData.startDate && "text-slate-400"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.startDate ? format(formData.startDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.startDate}
                        onSelect={(date) => setFormData(prev => ({ ...prev, startDate: date }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label className="text-white">End Date (Optional)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal bg-white/5 border-white/20 text-white",
                          !formData.endDate && "text-slate-400"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.endDate ? format(formData.endDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.endDate}
                        onSelect={(date) => setFormData(prev => ({ ...prev, endDate: date }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Actions */}
        <div className="flex justify-between pt-6 border-t border-white/20">
          <Button
            onClick={handlePrevious}
            disabled={currentStep === 1}
            variant="outline"
            className="border-white/20 text-white hover:bg-white/10"
          >
            Previous
          </Button>
          
          <div className="flex gap-2">
            <Button
              onClick={() => onOpenChange(false)}
              variant="ghost"
              className="text-slate-400 hover:text-white"
            >
              Cancel
            </Button>
            
            {currentStep === steps.length ? (
              <Button
                onClick={handleSubmit}
                disabled={!canCreateProject()}
                className="bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Project
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                className="bg-primary hover:bg-primary/90"
              >
                Next
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
      
      <CreateClientModal 
        open={showCreateClient} 
        onOpenChange={(open) => {
          setShowCreateClient(open);
          if (!open) {
            // Client modal was closed, refresh might have happened
            setClientSearchTerm(""); // Clear search to show all clients
          }
        }} 
      />
    </Dialog>
  );
}