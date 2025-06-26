import React, { useState, useEffect } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Plus, 
  Trash2, 
  GripVertical, 
  Eye,
  Save,
  Settings,
  Type,
  Mail,
  Phone,
  List,
  ToggleLeft,
  FileText,
  Hash,
  ChevronDown,
  ChevronUp,
  Copy,
  X,
  ArrowLeft
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FormField {
  id: string;
  type: "text" | "email" | "tel" | "select" | "radio" | "checkbox" | "textarea" | "section";
  label: string;
  required: boolean;
  placeholder?: string;
  options?: { label: string; value: string }[];
}

interface OnboardingForm {
  id?: number;
  ownerId: number;
  organizationId: number;
  projectId?: number | null;
  title: string;
  description: string;
  fields: FormField[];
  isTemplate: boolean;
  isActive: boolean;
  createdBy: number;
  createdAt?: string;
  updatedAt?: string;
}

interface FormBuilderProps {
  form?: OnboardingForm;
  onSave: (form: Omit<OnboardingForm, 'id'>) => void;
  onCancel: () => void;
}

const FIELD_TYPES = [
  { type: "text", icon: Type, label: "Text Input" },
  { type: "email", icon: Mail, label: "Email" },
  { type: "tel", icon: Phone, label: "Phone" },
  { type: "select", icon: List, label: "Dropdown" },
  { type: "radio", icon: ToggleLeft, label: "Radio Buttons" },
  { type: "checkbox", icon: ToggleLeft, label: "Checkboxes" },
  { type: "textarea", icon: FileText, label: "Text Area" },
  { type: "section", icon: Hash, label: "Section Header" },
];

export default function FormBuilder({ form, onSave, onCancel }: FormBuilderProps) {
  const [formData, setFormData] = useState<Omit<OnboardingForm, 'id'>>(() => {
    const defaults = {
      ownerId: 1, // User who owns this form
      organizationId: 1,
      projectId: null as number | null,
      title: "",
      description: "",
      fields: [] as FormField[],
      isTemplate: false,
      isActive: true,
      createdBy: 1
    };
    return form ? { ...defaults, ...form } : defaults;
  });

  const [showPreview, setShowPreview] = useState(false);
  const [expandedField, setExpandedField] = useState<string | null>(null);
  const [projects, setProjects] = useState<any[]>([]);

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (form) {
      const defaults = {
        ownerId: 8, // Using existing user ID
        organizationId: 1,
        projectId: null as number | null,
        title: "",
        description: "",
        fields: [] as FormField[],
        isTemplate: false,
        isActive: true,
        createdBy: 8 // Using existing user ID
      };
      setFormData({ ...defaults, ...form });
    }
  }, [form]);

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      if (response.ok) {
        const projectsData = await response.json();
        setProjects(projectsData);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const addField = (type: FormField['type']) => {
    const newField: FormField = {
      id: `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      label: `New ${type === 'section' ? 'Section' : 'Field'}`,
      required: type !== 'section',
      placeholder: type === 'section' ? undefined : `Enter ${type === 'textarea' ? 'text' : type}...`,
    };

    if (type === 'select' || type === 'radio' || type === 'checkbox') {
      newField.options = [
        { label: "First Choice", value: "choice1" },
        { label: "Second Choice", value: "choice2" }
      ];
    } else {
      newField.options = [];
    }

    setFormData(prev => ({
      ...prev,
      fields: [...prev.fields, newField]
    }));
    setExpandedField(newField.id);
  };

  const updateField = (fieldId: string, updates: Partial<FormField>) => {
    setFormData(prev => ({
      ...prev,
      fields: prev.fields.map(field => 
        field.id === fieldId ? { ...field, ...updates } : field
      )
    }));
  };

  const deleteField = (fieldId: string) => {
    setFormData(prev => ({
      ...prev,
      fields: prev.fields.filter(field => field.id !== fieldId)
    }));
    if (expandedField === fieldId) {
      setExpandedField(null);
    }
  };

  const duplicateField = (fieldId: string) => {
    const field = formData.fields.find(f => f.id === fieldId);
    if (field) {
      const newField = {
        ...field,
        id: `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        label: `${field.label} (Copy)`
      };
      const index = formData.fields.findIndex(f => f.id === fieldId);
      setFormData(prev => ({
        ...prev,
        fields: [
          ...prev.fields.slice(0, index + 1),
          newField,
          ...prev.fields.slice(index + 1)
        ]
      }));
    }
  };

  const addOption = (fieldId: string) => {
    const field = formData.fields.find(f => f.id === fieldId);
    if (field) {
      const currentOptions = field.options || [];
      const newOption = {
        label: `Choice ${currentOptions.length + 1}`,
        value: `choice${currentOptions.length + 1}`
      };
      updateField(fieldId, {
        options: [...currentOptions, newOption]
      });
    }
  };

  const updateOption = (fieldId: string, optionIndex: number, updates: Partial<{ label: string; value: string }>) => {
    const field = formData.fields.find(f => f.id === fieldId);
    if (field && field.options) {
      const newOptions = field.options.map((option, index) =>
        index === optionIndex ? { ...option, ...updates } : option
      );
      updateField(fieldId, { options: newOptions });
    }
  };

  const deleteOption = (fieldId: string, optionIndex: number) => {
    const field = formData.fields.find(f => f.id === fieldId);
    if (field && field.options && field.options.length > 1) {
      const newOptions = field.options.filter((_, index) => index !== optionIndex);
      updateField(fieldId, { options: newOptions });
    }
  };

  const reorderFields = (newFields: FormField[]) => {
    setFormData(prev => ({ ...prev, fields: newFields }));
  };

  const handleSave = () => {
    if (!formData.title.trim()) {
      alert("Please enter a form title");
      return;
    }
    if (formData.fields.length === 0) {
      alert("Please add at least one field");
      return;
    }
    
    console.log("Saving form data:", formData);
    onSave(formData);
  };

  const renderFieldEditor = (field: FormField, index: number) => {
    const isExpanded = expandedField === field.id;
    const hasOptions = ['select', 'radio', 'checkbox'].includes(field.type);

    return (
      <motion.div
        key={field.id}
        layout
        className="glass rounded-xl border border-white/10 overflow-hidden"
      >
        {/* Field Header */}
        <div 
          className="p-4 cursor-pointer flex items-center space-x-3 hover:bg-white/5 transition-colors"
          onClick={() => setExpandedField(isExpanded ? null : field.id)}
        >
          <div className="flex items-center text-slate-400 cursor-grab">
            <GripVertical className="h-4 w-4" />
          </div>
          
          <div className="flex-1 flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-primary/20">
              {FIELD_TYPES.find(t => t.type === field.type)?.icon && (
                React.createElement(FIELD_TYPES.find(t => t.type === field.type)!.icon, {
                  className: "h-4 w-4 text-primary"
                })
              )}
            </div>
            <div>
              <div className="text-white font-medium">{field.label}</div>
              <div className="text-slate-400 text-sm">
                {FIELD_TYPES.find(t => t.type === field.type)?.label}
                {field.required && <span className="text-red-400 ml-1">*</span>}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                duplicateField(field.id);
              }}
              className="h-8 w-8 text-slate-400 hover:text-white"
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                deleteField(field.id);
              }}
              className="h-8 w-8 text-slate-400 hover:text-red-400"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            )}
          </div>
        </div>

        {/* Field Settings */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="border-t border-white/10 bg-white/5"
            >
              <div className="p-4 space-y-4">
                {/* Label */}
                <div className="space-y-2">
                  <Label className="text-slate-300">Field Label</Label>
                  <Input
                    value={field.label}
                    onChange={(e) => updateField(field.id, { label: e.target.value })}
                    className="glass border-0 text-white"
                    placeholder="Enter field label"
                  />
                </div>

                {/* Placeholder (if applicable) */}
                {field.type !== 'section' && !hasOptions && (
                  <div className="space-y-2">
                    <Label className="text-slate-300">Placeholder</Label>
                    <Input
                      value={field.placeholder || ""}
                      onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                      className="glass border-0 text-white"
                      placeholder="Enter placeholder text"
                    />
                  </div>
                )}

                {/* Required Toggle */}
                {field.type !== 'section' && (
                  <div className="flex items-center space-x-3">
                    <Switch
                      checked={field.required}
                      onCheckedChange={(checked) => updateField(field.id, { required: checked })}
                    />
                    <Label className="text-slate-300">Required field</Label>
                  </div>
                )}

                {/* Options (for select, radio, checkbox) */}
                {hasOptions && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-slate-300">Options</Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addOption(field.id)}
                        className="h-8 text-xs"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Option
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {(field.options || []).map((option, optionIndex) => (
                        <div key={optionIndex} className="flex items-center space-x-2">
                          <Input
                            value={option.label}
                            onChange={(e) => updateOption(field.id, optionIndex, { label: e.target.value })}
                            className="glass border-0 text-white text-sm"
                            placeholder="Option label"
                          />
                          <Input
                            value={option.value}
                            onChange={(e) => updateOption(field.id, optionIndex, { value: e.target.value })}
                            className="glass border-0 text-white text-sm w-32"
                            placeholder="Value"
                          />
                          {(field.options || []).length > 1 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteOption(field.id, optionIndex)}
                              className="h-8 w-8 text-slate-400 hover:text-red-400"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  const renderPreview = () => (
    <div className="space-y-6">
      <div className="text-center space-y-2 pb-6 border-b border-white/10">
        <h2 className="text-2xl font-bold text-white">{formData.title || "Untitled Form"}</h2>
        {formData.description && (
          <p className="text-slate-300">{formData.description}</p>
        )}
      </div>

      <div className="space-y-4">
        {formData.fields.map((field) => (
          <motion.div
            key={field.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2"
          >
            {field.type === 'section' ? (
              <div className="pt-6 first:pt-0">
                <h3 className="text-lg font-semibold text-white pb-2 border-b border-white/10">
                  {field.label}
                </h3>
              </div>
            ) : (
              <>
                <Label className="text-slate-300">
                  {field.label}
                  {field.required && <span className="text-red-400 ml-1">*</span>}
                </Label>
                
                {field.type === 'textarea' ? (
                  <Textarea
                    placeholder={field.placeholder}
                    className="glass border-0 text-white"
                    disabled
                  />
                ) : field.type === 'select' ? (
                  <Select disabled>
                    <SelectTrigger className="glass border-0 text-white">
                      <SelectValue placeholder={field.placeholder || "Select an option"} />
                    </SelectTrigger>
                    <SelectContent>
                      {(field.options || []).map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : field.type === 'radio' ? (
                  <RadioGroup disabled>
                    {(field.options || []).map((option) => (
                      <div key={option.value} className="flex items-center space-x-2">
                        <RadioGroupItem value={option.value} id={`${field.id}-${option.value}`} />
                        <Label htmlFor={`${field.id}-${option.value}`} className="text-slate-300">{option.label}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                ) : field.type === 'checkbox' ? (
                  <div className="space-y-2">
                    {(field.options || []).map((option) => (
                      <div key={option.value} className="flex items-center space-x-2">
                        <Checkbox disabled id={`${field.id}-${option.value}`} />
                        <Label htmlFor={`${field.id}-${option.value}`} className="text-slate-300">{option.label}</Label>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Input
                    type={field.type}
                    placeholder={field.placeholder}
                    className="glass border-0 text-white"
                    disabled
                  />
                )}
              </>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );

  console.log("FormBuilder rendering with data:", formData);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="flex">
        {/* Editor Panel */}
        <div className={cn(
          "transition-all duration-300",
          showPreview ? "w-1/2" : "w-full"
        )}>
          <div className="space-y-6">
            {/* Header */}
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onCancel}
                    className="text-slate-400 hover:text-white"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <div>
                    <h1 className="text-2xl font-bold text-white">Form Builder</h1>
                    <p className="text-slate-400">Create dynamic onboarding forms</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowPreview(!showPreview)}
                    className="glass border-white/20 text-white hover:bg-white/10"
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    {showPreview ? "Hide Preview" : "Show Preview"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={onCancel}
                    className="glass border-white/20 text-white hover:bg-white/10"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    className="bg-primary hover:bg-primary/90"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Save Form
                  </Button>
                </div>
              </div>
            </div>

            {/* Form Settings */}
            <div className="p-6 border-b border-white/10 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Form Title</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    className="glass border-0 text-white"
                    placeholder="Enter form title"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Description</Label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="glass border-0 text-white"
                    placeholder="Optional description"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-slate-300">Assign to Project (Optional)</Label>
                <Select
                  value={formData.projectId?.toString() || "no-project"}
                  onValueChange={(value) => 
                    setFormData(prev => ({ 
                      ...prev, 
                      projectId: value === "no-project" ? null : parseInt(value) 
                    }))
                  }
                >
                  <SelectTrigger className="glass border-0 text-white">
                    <SelectValue placeholder="Select a project or leave as template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no-project">No Project (Template)</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id.toString()}>
                        {project.title} - {project.client?.name || 'No Client'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-400">
                  Assign this form to a specific project, or leave blank to use as a template
                </p>
              </div>
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-3">
                  <Switch
                    checked={formData.isTemplate}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isTemplate: checked }))}
                  />
                  <Label className="text-slate-300">Save as template</Label>
                </div>
                <div className="flex items-center space-x-3">
                  <Switch
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                  />
                  <Label className="text-slate-300">Active</Label>
                </div>
              </div>
            </div>

            {/* Field Types */}
            <div className="p-6 border-b border-white/10">
              <Label className="text-slate-300 mb-3 block">Add Field</Label>
              <div className="flex flex-wrap gap-2">
                {FIELD_TYPES.map((fieldType) => (
                  <Button
                    key={fieldType.type}
                    variant="outline"
                    size="sm"
                    onClick={() => addField(fieldType.type as FormField['type'])}
                    className="glass border-white/20 text-white hover:bg-white/10"
                  >
                    <fieldType.icon className="mr-2 h-4 w-4" />
                    {fieldType.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Fields Editor */}
            <div className="p-6">
              {formData.fields.length === 0 ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <Settings className="h-12 w-12 text-slate-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-400 mb-2">No fields added yet</h3>
                    <p className="text-slate-500">Add your first field using the buttons above</p>
                  </div>
                </div>
              ) : (
                <Reorder.Group
                  axis="y"
                  values={formData.fields}
                  onReorder={reorderFields}
                  className="space-y-4"
                >
                  {formData.fields.map((field, index) => (
                    <Reorder.Item
                      key={field.id}
                      value={field}
                      className="cursor-grab active:cursor-grabbing"
                    >
                      {renderFieldEditor(field, index)}
                    </Reorder.Item>
                  ))}
                </Reorder.Group>
              )}
            </div>
          </div>
        </div>

        {/* Preview Panel */}
        <AnimatePresence>
          {showPreview && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: "50%", opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="border-l border-white/10 bg-white/5"
            >
              <div className="overflow-auto">
                <div className="p-6">
                  <div className="mb-6">
                    <h2 className="text-lg font-semibold text-white mb-2">Preview</h2>
                    <p className="text-slate-400 text-sm">This is how your form will appear to clients</p>
                  </div>
                  <div className="glass rounded-xl p-6">
                    {renderPreview()}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}