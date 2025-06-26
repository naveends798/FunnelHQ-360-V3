import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { useToast } from "@/hooks/use-toast";
import { canAccessRoute } from "@/lib/permissions";
import NotificationCenter from "@/components/notification-center";
import { ThemeToggleCompact } from "@/components/theme-toggle";
import { SidebarPlanInfo } from "@/components/sidebar-plan-info";
import { ProfilePictureUpload } from "@/components/profile-picture-upload";
import { FunnelHQ360Logo } from "@/components/funnelhq-360-logo";
import { ProTrialBadge } from "@/components/pro-trial-badge";
import { BILLING_PLANS } from "@shared/schema";
import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { 
  Home, 
  Folder, 
  Users, 
  MessageCircle, 
  FileText, 
  TrendingUp, 
  CreditCard,
  Settings,
  LogOut,
  Shield,
  UserCheck,
  ClipboardList,
  HelpCircle,
  HardDrive,
  Palette,
  Menu,
  X,
  Camera
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: Home, current: true, count: null },
  { name: "Projects", href: "/projects", icon: Folder, current: false, count: null },
  { name: "Onboarding", href: "/onboarding", icon: ClipboardList, current: false, count: null },
  { name: "Team", href: "/team", icon: UserCheck, current: false, count: null },
  { name: "Clients", href: "/clients", icon: Users, current: false, count: null },
  { name: "Assets", href: "/assets", icon: HardDrive, current: false, count: null },
  { name: "Messages", href: "/messages", icon: MessageCircle, current: false, hasNotification: true },
  { name: "Billing", href: "/billing", icon: CreditCard, current: false, count: null },
  { name: "Support", href: "/support", icon: HelpCircle, current: false, count: null },
];

const teamMemberNavigation = [
  { name: "Projects", href: "/projects", icon: Folder, current: false, count: null },
  { name: "Assets", href: "/assets", icon: HardDrive, current: false, count: null },
  { name: "Messages", href: "/messages", icon: MessageCircle, current: false, hasNotification: true },
];


const clientNavigation = [
  { name: "My Dashboard", href: "/dashboard", icon: Home, current: true, count: null },
  { name: "My Projects", href: "/projects", icon: Folder, current: false, count: null },
  { name: "Messages", href: "/messages", icon: MessageCircle, current: false, hasNotification: true },
];

export default function Sidebar() {
  const { user, authUser, currentRole, permissions, signOut, isAdmin, isClient, isTeamMember } = useAuth();
  const { organization, isLoaded: orgLoaded } = useOrganization();
  const { toast } = useToast();
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showProfileUpload, setShowProfileUpload] = useState(false);
  const [currentAvatar, setCurrentAvatar] = useState<string>('');

  // Load saved avatar on component mount
  useEffect(() => {
    const savedAvatar = localStorage.getItem('user_avatar');
    if (savedAvatar) {
      setCurrentAvatar(savedAvatar);
    }
  }, []);

  // Get user permissions as array
  const userPermissions = permissions.flatMap(p => 
    p.actions.map(action => `${p.resource}:${action}`)
  );

  // Choose navigation based on role
  const baseNavigation = isClient ? clientNavigation : 
                        currentRole === 'team_member' ? teamMemberNavigation : navigation;

  // Filter navigation based on user permissions and plan restrictions
  const availableNavigation = baseNavigation.filter(item => {
    // Basic permission check
    if (!canAccessRoute(item.href, userPermissions)) {
      return false;
    }
    
    // Plan-based restrictions for Solo users
    const currentPlan = organization?.currentPlan?.name?.toLowerCase();
    if (currentPlan === 'solo') {
      // Hide team management features for Solo plan users (no collaboration)
      if (item.href === '/team' || item.href === '/clients') {
        return false;
      }
    }
    
    return true;
  });

  // Mock user data for testing when bypassing auth
  const mockUser = {
    email: "demo@portlhq.com",
    user_metadata: {
      full_name: "Demo User",
      company_name: "PortlHQ Agency",
      avatar_url: currentAvatar || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=32&h=32&q=80"
    }
  };
  
  const displayUser = user || mockUser;

  // Handle avatar update
  const handleAvatarUpdate = (newAvatarUrl: string) => {
    setCurrentAvatar(newAvatarUrl);
    // Save to localStorage for persistence
    if (newAvatarUrl) {
      localStorage.setItem('user_avatar', newAvatarUrl);
    } else {
      localStorage.removeItem('user_avatar');
    }
    // In a real app, you would also update the user's avatar in your database
    // await updateUserAvatar(authUser.id, newAvatarUrl);
  };

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast({
        title: "Error signing out",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Signed out successfully",
        description: "You have been logged out.",
      });
    }
  };

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="glass-dark text-sidebar-foreground hover:bg-sidebar-accent"
        >
          {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed left-0 top-0 h-full w-64 bg-sidebar border-r border-sidebar-border z-40 transition-transform duration-300 ease-in-out",
        "lg:translate-x-0", // Always visible on large screens
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full" // Mobile slide behavior
      )}>
        <div className="flex flex-col h-full">
          {/* Header Section */}
          <div className="p-3">
            {/* Logo */}
            <div className="flex items-center space-x-3 mb-4">
              <FunnelHQ360Logo size={44} />
              <div>
                <h1 className="text-xl font-bold text-white dark:text-white tracking-tight">
                  FunnelHQ 360
                </h1>
              </div>
            </div>


            {/* Current Role Badge */}
            {currentRole && (
              <div className="mb-3">
                <Badge 
                  className={cn(
                    "w-full justify-center py-1.5 text-xs font-medium",
                    currentRole === 'admin' && "bg-red-500/20 text-red-400 border-red-500/30",
                    currentRole === 'team_member' && "bg-blue-500/20 text-blue-400 border-blue-500/30",
                    currentRole === 'client' && "bg-green-500/20 text-green-400 border-green-500/30"
                  )}
                >
                  {currentRole.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>
            )}

          </div>

          {/* Navigation Section */}
          <div className="flex-1 px-3 overflow-y-auto">
            <nav className="space-y-1">
          {availableNavigation.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href || (item.href === '/dashboard' && location === '/');
            return (
              <Link key={item.name} href={item.href}>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start h-10 px-3 text-left font-medium transition-all duration-200",
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  )}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Icon className="mr-3 h-4 w-4" />
                  <span className="flex-1 text-sm">{item.name}</span>
                  {item.count && (
                    <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
                      {item.count}
                    </span>
                  )}
                  {item.hasNotification && (
                    <span className="w-2 h-2 bg-destructive rounded-full"></span>
                  )}
                </Button>
              </Link>
            );
          })}
          
            </nav>
          </div>

          {/* Account Plan Info - Show for Solo users and Pro users */}
          {organization && orgLoaded && (!isTeamMember || (organization.publicMetadata as any)?.plan === 'pro') && (
            <div className="px-3 mb-3">
              <SidebarPlanInfo 
                organization={organization as any}
                isClient={isClient}
              />
            </div>
          )}

          {/* Pro Trial Badge - Show only for admin users at bottom */}
          <div className="px-3 mb-2">
            <ProTrialBadge />
          </div>

          {/* User Profile */}
          <div className="p-2 mt-auto">
            <div className="bg-card border border-border rounded-lg p-2">
              <div className="flex items-center space-x-2">
                <div className="relative group">
                  <img 
                    src={displayUser?.user_metadata?.avatar_url || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=32&h=32&q=80"} 
                    alt="User avatar" 
                    className="w-7 h-7 rounded-md object-cover flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity" 
                    onClick={() => setShowProfileUpload(true)}
                  />
                  {/* Camera overlay on hover */}
                  <div 
                    className="absolute inset-0 bg-black/50 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    onClick={() => setShowProfileUpload(true)}
                  >
                    <Camera className="h-3 w-3 text-white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0 overflow-hidden">
                  <p className="text-xs font-medium text-sidebar-foreground leading-tight truncate" title={displayUser?.user_metadata?.full_name || displayUser?.email?.split('@')[0] || 'Demo User'}>
                    {displayUser?.user_metadata?.full_name || displayUser?.email?.split('@')[0] || 'Demo User'}
                  </p>
                  <p className="text-xs text-muted-foreground leading-tight truncate" title={currentRole?.replace('_', ' ') || 'No Role'}>
                    {currentRole?.replace('_', ' ') || 'No Role'}
                  </p>
                </div>
                <div className="flex space-x-0.5 flex-shrink-0">
                  <ThemeToggleCompact />
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setShowProfileUpload(true)}
                    className="text-muted-foreground hover:text-sidebar-foreground h-6 w-6 p-0"
                    title="Update Profile Picture"
                  >
                    <Camera className="h-3 w-3" />
                  </Button>
                  <Link href="/settings">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-muted-foreground hover:text-sidebar-foreground h-6 w-6 p-0"
                      title="Settings"
                    >
                      <Settings className="h-3 w-3" />
                    </Button>
                  </Link>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleSignOut}
                    className="text-muted-foreground hover:text-destructive h-6 w-6 p-0"
                    title="Sign Out"
                  >
                    <LogOut className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
    </aside>

    {/* Profile Picture Upload Modal */}
    <ProfilePictureUpload
      open={showProfileUpload}
      onOpenChange={setShowProfileUpload}
      currentAvatar={displayUser?.user_metadata?.avatar_url || ''}
      userName={displayUser?.user_metadata?.full_name || displayUser?.email?.split('@')[0] || 'Demo User'}
      onAvatarUpdate={handleAvatarUpdate}
    />
    </>
  );
}
