import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft,
  User,
  Building,
  Mail,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocation, useRoute } from "wouter";
import ProjectOnboardingForm from "@/components/project-onboarding-form";

interface Project {
  id: number;
  title: string;
  client?: {
    id: number;
    name: string;
    email: string;
  };
}

export default function ClientOnboardingPage() {
  const [location, setLocation] = useLocation();
  const [match, params] = useRoute("/onboarding/client/:sessionId");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [clientId, setClientId] = useState<number | null>(null);

  // Extract project and client info from session ID or URL params
  useEffect(() => {
    if (!params?.sessionId) {
      setError("Invalid session ID");
      setLoading(false);
      return;
    }

    // Parse session ID to extract project and client IDs
    // Format: projectId-clientId or just use API to get session info
    const loadSessionData = async () => {
      try {
        // For now, we'll parse the sessionId as "projectId-clientId"
        // In a real app, you'd validate this session ID against your backend
        const parts = params.sessionId.split('-');
        if (parts.length !== 2) {
          setError("Invalid session format");
          setLoading(false);
          return;
        }

        const projectId = parseInt(parts[0]);
        const clientIdFromSession = parseInt(parts[1]);

        if (isNaN(projectId) || isNaN(clientIdFromSession)) {
          setError("Invalid session parameters");
          setLoading(false);
          return;
        }

        // Fetch project details
        const response = await fetch(`/api/projects/${projectId}`);
        if (!response.ok) {
          setError("Project not found");
          setLoading(false);
          return;
        }

        const projectData = await response.json();
        setProject(projectData);
        setClientId(clientIdFromSession);
        setLoading(false);

      } catch (err) {
        console.error('Error loading session:', err);
        setError("Failed to load session");
        setLoading(false);
      }
    };

    loadSessionData();
  }, [params?.sessionId]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Loading your form...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Unable to Load Form</h1>
          <p className="text-slate-400 mb-6">{error}</p>
          <button
            onClick={() => setLocation('/')}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  // Invalid data state
  if (!project || !clientId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Invalid Session</h1>
          <p className="text-slate-400 mb-6">This form session is not valid or has expired.</p>
          <button
            onClick={() => setLocation('/')}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header with project info */}
        <div className="text-center mb-8">
          <div className="glass rounded-xl p-6 mb-6">
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white text-xl font-bold">
                {project.client?.name ? project.client.name.split(' ').map(n => n[0]).join('') : 'C'}
              </div>
            </div>
            
            <h1 className="text-3xl font-bold text-white mb-2">
              Project Onboarding Form
            </h1>
            <p className="text-slate-400 mb-4">
              Please complete this form for: <strong className="text-white">{project.title}</strong>
            </p>
            
            {project.client && (
              <div className="flex items-center justify-center space-x-6 text-sm text-slate-400">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4" />
                  <span>{project.client.name}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4" />
                  <span>{project.client.email}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Form Component */}
        <ProjectOnboardingForm
          projectId={project.id}
          clientId={clientId}
          editMode={true} // Always allow editing for clients
          onSubmissionComplete={(submission) => {
            console.log('Form submitted:', submission);
            setLocation('/onboarding/success');
          }}
        />
      </div>
    </div>
  );
}