import React from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/theme-context";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { SupabaseProvider } from "@/contexts/supabase-context";
import { ClerkProvider, SignedIn, SignedOut, RedirectToSignIn, useAuth as useClerkAuth } from "@clerk/clerk-react";
import { setAuthTokenGetter } from "./lib/queryClient";
import Dashboard from "@/pages/dashboard";
import LoginPage from "@/pages/login";
import SignupPage from "@/pages/signup";
import RoleLoginSelector from "@/components/role-login-selector";
import VerifyEmailPage from "@/pages/verify-email";
import WelcomeBackPage from "@/pages/welcome-back";
import AcceptInvitationPage from "@/pages/accept-invitation";
import { ClerkProtectedRoute } from "@/components/clerk-protected-route";
import ProjectsPage from "@/pages/projects";
import TeamPage from "@/pages/team";
import OnboardingPage from "@/pages/onboarding";
import AdminOnboardingPage from "@/pages/admin-onboarding";
import ClientOnboardingPage from "@/pages/client-onboarding";
import SubmissionViewerPage from "@/pages/submission-viewer";
import OnboardingSuccessPage from "@/pages/onboarding-success";
import AssetsPage from "@/pages/assets";
import BrandKitPage from "@/pages/brand-kit";
import BillingPage from "@/pages/billing-fixed";
import SupportPage from "@/pages/support";
import SettingsPage from "@/pages/settings";
import MessagesPage from "@/pages/messages";
import ProjectDetails from "@/pages/project-details";
import KanbanBoard from "@/pages/kanban";
import CompleteProfilePage from "@/pages/complete-profile";
import TasksPage from "@/pages/tasks";
import ClientDashboard from "@/pages/client-dashboard";
import ClientsPage from "@/pages/clients";
import NotFound from "@/pages/not-found";
import MobileOptimizations from "@/components/mobile-optimizations";
import { useLocation } from "wouter";
import { PERMISSIONS } from "@/lib/permissions";


function ProtectedRoute({ children, requiresPermission }: { children: React.ReactNode, requiresPermission?: string }) {
  const [, setLocation] = useLocation();
  const { currentRole, permissions } = useAuth();

  // Check permissions
  if (requiresPermission) {
    const userPermissions = permissions.flatMap(p => 
      p.actions.map(action => `${p.resource}:${action}`)
    );
    
    if (!userPermissions.includes(requiresPermission)) {
      // Redirect team members to projects if they try to access restricted routes
      if (currentRole === 'team_member') {
        setLocation('/projects');
        return null;
      }
      // Redirect other unauthorized users to appropriate pages
      setLocation('/');
      return null;
    }
  }

  return <>{children}</>;
}

function RoleBasedRouter() {
  const { currentRole, isClient, loading } = useAuth();
  const [location] = useLocation();
  
  console.log("🏠 Role-based redirect for:", currentRole, "loading:", loading);
  
  // Show loading while determining role
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Determining access level...</p>
        </div>
      </div>
    );
  }

  // Check for invitation acceptance flow
  const urlParams = new URLSearchParams(window.location.search);
  const hasInvitation = urlParams.get('invite');
  
  if (hasInvitation && !loading) {
    // Redirect to login with invitation context
    return <LoginPage />;
  }
  
  // Route based on role with fallback
  switch (currentRole) {
    case 'client':
      console.log("🎯 Routing client to dashboard");
      return <ClientDashboard />;
    
    case 'team_member':
      console.log("🎯 Routing team member to projects");
      return <ProjectsPage />;
    
    case 'admin':
    default:
      console.log("🎯 Routing admin/default to main dashboard");
      return <Dashboard />;
  }
}

function Router() {
  return (
    <>
      <Switch>
        <Route path="/" exact>
          <SignedOut>
            <LoginPage />
          </SignedOut>
          <SignedIn>
            <RoleBasedRouter />
          </SignedIn>
        </Route>
        <Route path="/login">
          <SignedOut>
            <LoginPage />
          </SignedOut>
          <SignedIn>
            <WelcomeBackPage />
          </SignedIn>
        </Route>
        <Route path="/login/*">
          <SignedOut>
            <LoginPage />
          </SignedOut>
          <SignedIn>
            <WelcomeBackPage />
          </SignedIn>
        </Route>
        <Route path="/signup">
          <SignedOut>
            <SignupPage />
          </SignedOut>
          <SignedIn>
            <RoleBasedRouter />
          </SignedIn>
        </Route>
        <Route path="/signup/*">
          <SignedOut>
            <SignupPage />
          </SignedOut>
          <SignedIn>
            <RoleBasedRouter />
          </SignedIn>
        </Route>
        <Route path="/verify-email">
          <SignedOut>
            <VerifyEmailPage />
          </SignedOut>
          <SignedIn>
            <RoleBasedRouter />
          </SignedIn>
        </Route>
        <Route path="/accept-invitation">
          <SignedIn>
            <AcceptInvitationPage />
          </SignedIn>
          <SignedOut>
            <RedirectToSignIn />
          </SignedOut>
        </Route>
        <Route path="/team">
          <ClerkProtectedRoute requiresPermission={PERMISSIONS.USERS.VIEW}>
            <TeamPage />
          </ClerkProtectedRoute>
        </Route>
        <Route path="/onboarding/submissions/:id">
          {(params) => (
            <ClerkProtectedRoute>
              <SubmissionViewerPage />
            </ClerkProtectedRoute>
          )}
        </Route>
        <Route path="/onboarding/client/:sessionId">
          {(params) => (
            <ClientOnboardingPage />
          )}
        </Route>
        <Route path="/onboarding/success">
          <OnboardingSuccessPage />
        </Route>
        <Route path="/admin-onboarding">
          <ClerkProtectedRoute>
            <AdminOnboardingPage />
          </ClerkProtectedRoute>
        </Route>
        <Route path="/onboarding">
          <ClerkProtectedRoute requiresPermission={PERMISSIONS.ORGANIZATION.MANAGE_SETTINGS}>
            <OnboardingPage />
          </ClerkProtectedRoute>
        </Route>
        <Route path="/complete-profile">
          <ClerkProtectedRoute>
            <CompleteProfilePage />
          </ClerkProtectedRoute>
        </Route>
        <Route path="/assets">
          <ClerkProtectedRoute requiresPermission={PERMISSIONS.DOCUMENTS.VIEW}>
            <AssetsPage />
          </ClerkProtectedRoute>
        </Route>
        <Route path="/brand-kit">
          <ClerkProtectedRoute requiresPermission={PERMISSIONS.DOCUMENTS.VIEW}>
            <BrandKitPage />
          </ClerkProtectedRoute>
        </Route>
        <Route path="/billing">
          <ClerkProtectedRoute requiresPermission={PERMISSIONS.BILLING.VIEW}>
            <BillingPage />
          </ClerkProtectedRoute>
        </Route>
        <Route path="/support">
          <ClerkProtectedRoute requiresPermission={PERMISSIONS.SUPPORT.VIEW_TICKETS}>
            <SupportPage />
          </ClerkProtectedRoute>
        </Route>
        <Route path="/settings">
          <ClerkProtectedRoute>
            <SettingsPage />
          </ClerkProtectedRoute>
        </Route>
        <Route path="/messages">
          <ClerkProtectedRoute>
            <MessagesPage />
          </ClerkProtectedRoute>
        </Route>
        <Route path="/projects/:projectId">
          {(params) => (
            <ClerkProtectedRoute>
              <ProjectDetails projectId={params.projectId} />
            </ClerkProtectedRoute>
          )}
        </Route>
        <Route path="/projects/:projectId/kanban">
          {(params) => (
            <ClerkProtectedRoute>
              <KanbanBoard projectId={params.projectId} />
            </ClerkProtectedRoute>
          )}
        </Route>
        <Route path="/projects">
          <ClerkProtectedRoute>
            <ProjectsPage />
          </ClerkProtectedRoute>
        </Route>
        <Route path="/clients">
          <ClerkProtectedRoute requiresPermission={PERMISSIONS.CLIENTS.VIEW_ALL}>
            <ClientsPage />
          </ClerkProtectedRoute>
        </Route>
        <Route path="/client-dashboard">
          <ClerkProtectedRoute>
            <ClientDashboard />
          </ClerkProtectedRoute>
        </Route>
        <Route path="/client-portal">
          <ClerkProtectedRoute>
            <ClientDashboard />
          </ClerkProtectedRoute>
        </Route>
        <Route path="/tasks">
          <ClerkProtectedRoute>
            <TasksPage />
          </ClerkProtectedRoute>
        </Route>
        <Route path="/kanban">
          <ClerkProtectedRoute>
            <KanbanBoard />
          </ClerkProtectedRoute>
        </Route>
        <Route path="/dashboard">
          <ClerkProtectedRoute>
            <Dashboard />
          </ClerkProtectedRoute>
        </Route>
        <Route path="/">
          <ClerkProtectedRoute>
            <RoleBasedRouter />
          </ClerkProtectedRoute>
        </Route>
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

// Component to set up authentication for API calls
function AuthSetup({ children }: { children: React.ReactNode }) {
  const { getToken } = useClerkAuth();

  React.useEffect(() => {
    // Set up the auth token getter for all API calls
    setAuthTokenGetter(async () => {
      try {
        const token = await getToken();
        console.log('🎫 AuthSetup - Token retrieved:', token ? `${token.substring(0, 20)}...` : 'null');
        return token;
      } catch (error) {
        console.warn("❌ AuthSetup - Failed to get Clerk token:", error);
        return null;
      }
    });
  }, [getToken]);

  return <>{children}</>;
}

function App() {
  console.log("🎯 App component rendering...");
  console.log("🔑 Clerk key:", import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ? `${import.meta.env.VITE_CLERK_PUBLISHABLE_KEY.substring(0, 20)}...` : 'MISSING');

  const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

  // Check if we have a real Clerk key or just a placeholder
  const isClerkConfigured = clerkPublishableKey && !clerkPublishableKey.includes('placeholder');

  if (!clerkPublishableKey) {
    throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in .env");
  }

  return (
    <ClerkProvider publishableKey={clerkPublishableKey}>
      <AuthSetup>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider defaultTheme="dark" storageKey="funnel-portal-theme">
            <AuthProvider>
              <SupabaseProvider>
                <TooltipProvider>
                  <MobileOptimizations />
                  <Toaster />
                  <Router />
                </TooltipProvider>
              </SupabaseProvider>
            </AuthProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </AuthSetup>
    </ClerkProvider>
  );
}

export default App;
