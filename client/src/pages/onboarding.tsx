import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import FormBuilder from "@/components/form-builder";
import AssignFormModal from "@/components/assign-form-modal";
import Sidebar from "@/components/sidebar";
import { 
  Plus, 
  Search, 
  Filter, 
  Edit3, 
  Trash2, 
  Copy, 
  FileText,
  Users,
  Calendar,
  MoreHorizontal,
  Eye,
  Settings,
  Star,
  X,
  ArrowLeft,
  Folder
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";

interface OnboardingForm {
  id: number;
  ownerId: number;
  organizationId: number;
  projectId?: number | null;
  title: string;
  description: string;
  fields: any[];
  isTemplate: boolean;
  isActive: boolean;
  createdBy: number;
  createdAt?: string;
  updatedAt?: string;
}


export default function OnboardingPage() {
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [showFormBuilder, setShowFormBuilder] = useState(false);
  const [editingForm, setEditingForm] = useState<OnboardingForm | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "active" | "templates">("all");
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [formToAssign, setFormToAssign] = useState<OnboardingForm | null>(null);

  // Fetch forms using React Query
  const { data: forms = [], isLoading: loading } = useQuery<OnboardingForm[]>({
    queryKey: ["/api/onboarding-forms", { organizationId: 1 }],
    queryFn: async () => {
      const response = await fetch('/api/onboarding-forms?organizationId=1');
      if (!response.ok) throw new Error('Failed to fetch onboarding forms');
      return response.json();
    }
  });

  // Fetch projects using React Query
  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ["/api/projects"],
    queryFn: async () => {
      const response = await fetch('/api/projects');
      if (!response.ok) throw new Error('Failed to fetch projects');
      return response.json();
    }
  });


  const handleCreateForm = () => {
    setEditingForm(null);
    setShowFormBuilder(true);
  };

  const handleEditForm = (form: OnboardingForm) => {
    setEditingForm(form);
    setShowFormBuilder(true);
  };

  const handleSaveForm = async (formData: Omit<OnboardingForm, 'id'>) => {
    try {
      console.log('Received form data to save:', formData);
      const url = editingForm ? `/api/onboarding-forms/${editingForm.id}` : '/api/onboarding-forms';
      const method = editingForm ? 'PUT' : 'POST';
      
      console.log(`Making ${method} request to ${url}`);
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const savedForm = await response.json();
        console.log('Form saved successfully:', savedForm);
        setShowFormBuilder(false);
        setEditingForm(null);
        // Invalidate the React Query cache to refetch forms
        queryClient.invalidateQueries({ queryKey: ["/api/onboarding-forms"] });
      } else {
        const errorText = await response.text();
        console.error('Error saving form:', response.status, errorText);
        alert(`Error saving form: ${response.status} ${errorText}`);
      }
    } catch (error) {
      console.error('Error saving form:', error);
      alert(`Error saving form: ${error.message}`);
    }
  };

  const handleDeleteForm = async (formId: number) => {
    if (!confirm('Are you sure you want to delete this form?')) return;

    try {
      const response = await fetch(`/api/onboarding-forms/${formId}`, { method: 'DELETE' });
      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: ["/api/onboarding-forms"] });
      }
    } catch (error) {
      console.error('Error deleting form:', error);
    }
  };

  const handleDuplicateForm = async (form: OnboardingForm) => {
    const duplicateData = {
      ...form,
      title: `${form.title} (Copy)`,
      isTemplate: false
    };
    delete (duplicateData as any).id;
    delete (duplicateData as any).createdAt;
    delete (duplicateData as any).updatedAt;

    try {
      const response = await fetch('/api/onboarding-forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(duplicateData)
      });

      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: ["/api/onboarding-forms"] });
      }
    } catch (error) {
      console.error('Error duplicating form:', error);
    }
  };

  const handleQuickAssign = (form: OnboardingForm) => {
    setFormToAssign(form);
    setAssignModalOpen(true);
  };

  const handleFormAssignment = async (formId: number, projectId: number | null) => {
    try {
      const form = forms.find(f => f.id === formId);
      if (!form) return;

      if (projectId) {
        // Create a copy of the form for this specific project
        const projectFormData = {
          ...form,
          id: undefined, // Remove ID so a new one is generated
          projectId: projectId,
          title: `${form.title}`, // Keep original title
          isTemplate: false, // Mark as project-specific, not a template
          organizationId: form.organizationId,
          createdBy: form.createdBy,
          fields: form.fields
        };

        const response = await fetch('/api/onboarding-forms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(projectFormData)
        });

        if (response.ok) {
          queryClient.invalidateQueries({ queryKey: ["/api/onboarding-forms"] });
          const project = projects.find(p => p.id === projectId);
          console.log(`Form "${form.title}" has been assigned to project "${project?.title || 'Unknown'}"`);
        } else {
          throw new Error('Failed to create form assignment');
        }
      } else {
        // Remove assignment - find and delete the project-specific form
        const projectForm = forms.find(f => f.projectId && !f.isTemplate);
        if (projectForm) {
          const response = await fetch(`/api/onboarding-forms/${projectForm.id}`, {
            method: 'DELETE'
          });
          
          if (response.ok) {
            queryClient.invalidateQueries({ queryKey: ["/api/onboarding-forms"] });
            console.log(`Form assignment has been removed`);
          } else {
            throw new Error('Failed to remove form assignment');
          }
        }
      }
    } catch (error) {
      console.error('Error assigning form:', error);
      throw error;
    }
  };

  const filteredForms = forms.filter(form => {
    const matchesSearch = form.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         form.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = 
      filterType === "all" ||
      (filterType === "active" && form.isActive) ||
      (filterType === "templates" && form.isTemplate);

    return matchesSearch && matchesFilter;
  });

  if (showFormBuilder) {
    console.log("Showing FormBuilder with editingForm:", editingForm);
    return (
      <FormBuilder
        form={editingForm || undefined}
        onSave={handleSaveForm}
        onCancel={() => {
          setShowFormBuilder(false);
          setEditingForm(null);
        }}
      />
    );
  }

  return (
    <>
      <Sidebar />
      
      {/* Main Content */}
      <main className="lg:ml-64 p-4 lg:p-8 pt-20 lg:pt-16">
        <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/dashboard")}
            className="text-slate-400 hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-white">Onboarding Forms</h1>
            <p className="text-slate-400 mt-1">Create and manage client intake forms</p>
          </div>
        </div>
        <Button
          onClick={handleCreateForm}
          className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Form
        </Button>
      </div>

      {/* Filters and Search */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
          <Input
            placeholder="Search forms..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="glass border-0 pl-10 text-white placeholder-slate-400"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSearchTerm("")}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 text-slate-400 hover:text-white"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        <div className="flex items-center glass rounded-lg p-1">
          {[
            { key: "all", label: "All" },
            { key: "active", label: "Active" },
            { key: "templates", label: "Templates" }
          ].map((filter) => (
            <Button
              key={filter.key}
              variant="ghost"
              size="sm"
              onClick={() => setFilterType(filter.key as typeof filterType)}
              className={cn(
                "px-4 py-2 text-slate-400",
                filterType === filter.key && "bg-primary/20 text-primary"
              )}
            >
              {filter.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Total Forms", value: forms.length, icon: FileText },
          { label: "Active Forms", value: forms.filter(f => f.isActive).length, icon: Eye },
          { label: "Templates", value: forms.filter(f => f.isTemplate).length, icon: Star },
          { label: "Assigned Forms", value: forms.filter(f => f.projectId).length, icon: Users }
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="glass rounded-xl p-4"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <stat.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <div className="text-slate-400 text-sm">{stat.label}</div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Forms Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="glass rounded-xl p-6 animate-pulse">
              <div className="h-4 bg-white/10 rounded mb-4"></div>
              <div className="h-3 bg-white/10 rounded mb-2"></div>
              <div className="h-3 bg-white/10 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      ) : filteredForms.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-slate-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-400 mb-2">
            {searchTerm || filterType !== "all" ? "No forms found" : "No forms created yet"}
          </h3>
          <p className="text-slate-500 mb-6">
            {searchTerm || filterType !== "all" 
              ? "Try adjusting your search or filters" 
              : "Create your first onboarding form to get started"}
          </p>
          {!searchTerm && filterType === "all" && (
            <Button onClick={handleCreateForm} className="bg-primary hover:bg-primary/90">
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Form
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredForms.map((form, index) => (
            <motion.div
              key={form.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="glass rounded-xl p-6 group hover:bg-white/5 transition-all duration-200"
            >
              {/* Form Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-primary transition-colors">
                    {form.title}
                  </h3>
                  {form.description && (
                    <p className="text-slate-400 text-sm line-clamp-2">{form.description}</p>
                  )}
                </div>
                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEditForm(form)}
                    className="h-8 w-8 text-slate-400 hover:text-white"
                  >
                    <Edit3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDuplicateForm(form)}
                    className="h-8 w-8 text-slate-400 hover:text-white"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteForm(form.id)}
                    className="h-8 w-8 text-slate-400 hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Form Stats */}
              <div className="space-y-3 mb-4">
                <div className="flex items-center space-x-4 text-sm">
                  <div className="flex items-center space-x-1">
                    <FileText className="h-4 w-4 text-slate-400" />
                    <span className="text-slate-300">{form.fields.length} fields</span>
                  </div>
                </div>
                {form.projectId && (
                  <div className="flex items-center space-x-1 text-sm">
                    <Folder className="h-4 w-4 text-blue-400" />
                    <span className="text-blue-400">
                      Assigned to: {projects.find(p => p.id === form.projectId)?.title || `Project #${form.projectId}`}
                    </span>
                  </div>
                )}
                <div className="flex items-center space-x-1 text-sm">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-400">
                    Updated {new Date(form.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Form Badges */}
              <div className="flex items-center space-x-2">
                {form.isTemplate && (
                  <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                    <Star className="h-3 w-3 mr-1" />
                    Template
                  </Badge>
                )}
                <Badge className={cn(
                  "border",
                  form.isActive 
                    ? "bg-green-500/20 text-green-400 border-green-500/30"
                    : "bg-slate-500/20 text-slate-400 border-slate-500/30"
                )}>
                  {form.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>

              {/* Quick Actions */}
              <div className="mt-4 pt-4 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditForm(form)}
                    className="glass border-white/20 text-white hover:bg-white/10"
                  >
                    <Edit3 className="mr-2 h-3 w-3" />
                    Edit
                  </Button>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleQuickAssign(form)}
                      className={cn(
                        form.projectId 
                          ? "text-orange-400 hover:text-orange-300" 
                          : "text-blue-400 hover:text-blue-300"
                      )}
                    >
                      <Folder className="mr-1 h-3 w-3" />
                      {form.projectId ? 'Reassign' : 'Assign'}
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Assignment Modal */}
      <AssignFormModal
        isOpen={assignModalOpen}
        onClose={() => {
          setAssignModalOpen(false);
          setFormToAssign(null);
        }}
        form={formToAssign}
        onAssign={handleFormAssignment}
      />
        </div>
      </main>
    </>
  );
}