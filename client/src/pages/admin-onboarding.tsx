import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Sidebar from "@/components/sidebar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  ArrowLeft,
  Send, 
  Search, 
  Filter, 
  Users,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  User,
  Mail,
  Plus,
  Eye
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";
import { formTemplates, FormTemplate } from "@/lib/formTemplates";

interface Client {
  id: number;
  name: string;
  company: string;
  email: string;
  avatar: string;
  status: string;
}

interface FormAssignment {
  id: number;
  formTemplateId: string;
  clientId: number;
  projectId?: number;
  status: 'pending' | 'completed' | 'overdue';
  assignedAt: string;
  dueDate?: string;
  completedAt?: string;
  customInstructions?: string;
}


export default function AdminOnboardingPage() {
  const [location, setLocation] = useLocation();
  const [assignments, setAssignments] = useState<FormAssignment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [customInstructions, setCustomInstructions] = useState("");
  const [dueDate, setDueDate] = useState("");

  // Initialize empty data - real data would come from API calls
  useEffect(() => {
    // TODO: Replace with actual API calls to fetch assignments and clients
    setAssignments([]);
    setClients([]);
  }, []);

  const handleAssignForm = () => {
    if (!selectedTemplate || !selectedClient) return;

    const newAssignment: FormAssignment = {
      id: Date.now(),
      formTemplateId: selectedTemplate.id,
      clientId: selectedClient.id,
      status: "pending",
      assignedAt: new Date().toISOString(),
      dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
      customInstructions: customInstructions.trim() || undefined
    };

    setAssignments(prev => [newAssignment, ...prev]);
    
    // Reset form
    setSelectedTemplate(null);
    setSelectedClient(null);
    setCustomInstructions("");
    setDueDate("");
    setShowAssignDialog(false);
  };

  const getAssignmentClient = (clientId: number) => {
    return clients.find(client => client.id === clientId);
  };

  const getAssignmentTemplate = (templateId: string) => {
    return formTemplates.find(template => template.id === templateId);
  };

  const filteredTemplates = formTemplates.filter(template => {
    const matchesSearch = template.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === "all" || template.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const filteredAssignments = assignments.filter(assignment => {
    const client = getAssignmentClient(assignment.clientId);
    const template = getAssignmentTemplate(assignment.formTemplateId);
    
    const matchesSearch = client?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client?.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template?.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || assignment.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: FormAssignment['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'pending':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'overdue':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'branding':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'development':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'marketing':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      default:
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    }
  };

  return (
    <>
      <Sidebar />
      
      {/* Main Content */}
      <main className="lg:ml-64 p-4 lg:p-8 pt-20 lg:pt-16 min-h-screen gradient-bg">
        <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/dashboard")}
              className="text-slate-400 hover:text-white border border-white/20 rounded-xl"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white">Client Onboarding</h1>
              <p className="text-slate-400 mt-1">Assign onboarding forms to clients and track progress</p>
            </div>
          </div>
          <Button
            onClick={() => setShowAssignDialog(true)}
            className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
          >
            <Plus className="mr-2 h-4 w-4" />
            Assign Form
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { 
              label: "Total Assignments", 
              value: assignments.length, 
              icon: FileText,
              color: "text-blue-400"
            },
            { 
              label: "Pending", 
              value: assignments.filter(a => a.status === 'pending').length, 
              icon: Clock,
              color: "text-yellow-400"
            },
            { 
              label: "Completed", 
              value: assignments.filter(a => a.status === 'completed').length, 
              icon: CheckCircle2,
              color: "text-green-400"
            },
            { 
              label: "Overdue", 
              value: assignments.filter(a => a.status === 'overdue').length, 
              icon: AlertCircle,
              color: "text-red-400"
            }
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="glass rounded-xl p-4"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-white/10">
                  <stat.icon className={cn("h-5 w-5", stat.color)} />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{stat.value}</div>
                  <div className="text-slate-400 text-sm">{stat.label}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
            <Input
              placeholder="Search assignments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="glass border-0 pl-10 text-white placeholder-slate-400"
            />
          </div>
          
          <div className="flex gap-3">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40 glass border-0 text-white">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent className="glass border-white/10">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Assignments List */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-white">Active Assignments</h2>
          
          {filteredAssignments.length === 0 ? (
            <div className="text-center py-12 glass rounded-xl">
              <FileText className="h-12 w-12 text-slate-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-400 mb-2">No assignments found</h3>
              <p className="text-slate-500 mb-6">Start by assigning onboarding forms to your clients</p>
              <Button onClick={() => setShowAssignDialog(true)} className="bg-primary hover:bg-primary/90">
                <Plus className="mr-2 h-4 w-4" />
                Assign First Form
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAssignments.map((assignment, index) => {
                const client = getAssignmentClient(assignment.clientId);
                const template = getAssignmentTemplate(assignment.formTemplateId);
                
                if (!client || !template) return null;
                
                return (
                  <motion.div
                    key={assignment.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="glass rounded-xl p-6 hover:bg-white/5 transition-all duration-200"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
                              {client.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div>
                              <h3 className="font-semibold text-white">{client.name}</h3>
                              <p className="text-slate-400 text-sm">{client.company}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Badge className={cn("text-xs", getStatusColor(assignment.status))}>
                              {assignment.status.charAt(0).toUpperCase() + assignment.status.slice(1)}
                            </Badge>
                            <Badge className={cn("text-xs", getCategoryColor(template.category))}>
                              {template.category.charAt(0).toUpperCase() + template.category.slice(1)}
                            </Badge>
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="text-white font-medium">{template.title}</h4>
                          <p className="text-slate-400 text-sm">{template.description}</p>
                        </div>
                        
                        {assignment.customInstructions && (
                          <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                            <p className="text-slate-300 text-sm italic">"{assignment.customInstructions}"</p>
                          </div>
                        )}
                        
                        <div className="flex items-center space-x-6 text-sm text-slate-400">
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-4 w-4" />
                            <span>Assigned {new Date(assignment.assignedAt).toLocaleDateString()}</span>
                          </div>
                          {assignment.dueDate && (
                            <div className="flex items-center space-x-1">
                              <Clock className="h-4 w-4" />
                              <span>Due {new Date(assignment.dueDate).toLocaleDateString()}</span>
                            </div>
                          )}
                          {assignment.completedAt && (
                            <div className="flex items-center space-x-1 text-green-400">
                              <CheckCircle2 className="h-4 w-4" />
                              <span>Completed {new Date(assignment.completedAt).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setLocation(`/onboarding/submissions/${assignment.id}`)}
                          className="glass border-white/20 text-white hover:bg-white/10"
                        >
                          <Eye className="mr-2 h-3 w-3" />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="glass border-white/20 text-white hover:bg-white/10"
                        >
                          <Mail className="mr-2 h-3 w-3" />
                          Remind
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Form Templates Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Available Form Templates</h2>
            <div className="flex gap-3">
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-40 glass border-0 text-white">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent className="glass border-white/10">
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="branding">Branding</SelectItem>
                  <SelectItem value="development">Development</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template, index) => (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="glass rounded-xl p-6 group hover:bg-white/5 transition-all duration-200 cursor-pointer"
                onClick={() => {
                  setSelectedTemplate(template);
                  setShowAssignDialog(true);
                }}
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="text-2xl">{template.icon}</div>
                    <Badge className={cn("text-xs", getCategoryColor(template.category))}>
                      {template.category}
                    </Badge>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-white mb-2 group-hover:text-primary transition-colors">
                      {template.title}
                    </h3>
                    <p className="text-slate-400 text-sm line-clamp-3">
                      {template.description}
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm text-slate-400">
                    <div className="flex items-center space-x-1">
                      <FileText className="h-4 w-4" />
                      <span>{template.fields.length} fields</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4" />
                      <span>{template.estimatedTime}</span>
                    </div>
                  </div>
                  
                  <Button
                    size="sm"
                    className="w-full bg-primary/20 hover:bg-primary text-primary hover:text-white border border-primary/30"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedTemplate(template);
                      setShowAssignDialog(true);
                    }}
                  >
                    <Send className="mr-2 h-3 w-3" />
                    Assign to Client
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Assign Form Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="sm:max-w-[600px] glass border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Assign Onboarding Form</DialogTitle>
            <DialogDescription className="text-slate-400">
              Send an onboarding form to a client with custom instructions.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {selectedTemplate && (
              <div className="glass rounded-lg p-4 border border-white/10">
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">{selectedTemplate.icon}</div>
                  <div>
                    <h3 className="font-semibold text-white">{selectedTemplate.title}</h3>
                    <p className="text-slate-400 text-sm">{selectedTemplate.description}</p>
                    <div className="flex items-center space-x-4 mt-2 text-xs text-slate-400">
                      <span>{selectedTemplate.fields.length} fields</span>
                      <span>{selectedTemplate.estimatedTime}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div>
              <Label htmlFor="client" className="text-white">Select Client</Label>
              <Select 
                value={selectedClient?.id.toString() || ""} 
                onValueChange={(value) => {
                  const client = clients.find(c => c.id === parseInt(value));
                  setSelectedClient(client || null);
                }}
              >
                <SelectTrigger className="glass border-white/10 text-white">
                  <SelectValue placeholder={clients.length === 0 ? "No clients available" : "Choose a client"} />
                </SelectTrigger>
                <SelectContent className="glass border-white/10">
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id.toString()}>
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-semibold">
                          {client.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <span className="font-medium">{client.name}</span>
                          <span className="text-slate-400 text-sm ml-2">({client.company})</span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="dueDate" className="text-white">Due Date (Optional)</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="glass border-white/10 text-white"
              />
            </div>
            
            <div>
              <Label htmlFor="instructions" className="text-white">Custom Instructions (Optional)</Label>
              <Textarea
                id="instructions"
                placeholder="Add any specific instructions or notes for the client..."
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                rows={3}
                className="glass border-white/10 text-white placeholder:text-slate-400"
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <Button 
              variant="outline" 
              onClick={() => setShowAssignDialog(false)}
              className="border-white/20 text-white hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAssignForm} 
              disabled={!selectedTemplate || !selectedClient}
              className="bg-primary hover:bg-primary/90"
            >
              <Send className="h-4 w-4 mr-2" />
              Assign Form
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      </main>
    </>
  );
}