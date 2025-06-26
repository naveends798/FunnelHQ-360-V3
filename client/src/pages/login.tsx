import { useState } from "react";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { useAuth as useClerkAuth, useSignIn, useClerk } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Eye, EyeOff, Shield, Users, UserCheck, ArrowLeft } from "lucide-react";
import type { UserInvitation } from "@shared/schema";

export default function LoginPage() {
  const { isSignedIn } = useClerkAuth();
  const { signIn, setActive } = useSignIn();
  const clerk = useClerk();
  const [location, setLocation] = useLocation();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [invitation, setInvitation] = useState<UserInvitation | null>(null);
  const [invitationError, setInvitationError] = useState("");
  const [isValidatingInvite, setIsValidatingInvite] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [portalPath, setPortalPath] = useState<string>("");

  // Role options for dropdown
  const roleOptions = [
    {
      value: 'admin',
      label: 'Administrator',
      description: 'Full system access',
      icon: Shield,
      color: 'bg-red-500',
      portalPath: '/dashboard'
    },
    {
      value: 'team_member',
      label: 'Team Member',
      description: 'Project collaboration access',
      icon: Users,
      color: 'bg-blue-500',
      portalPath: '/projects'
    },
    {
      value: 'client',
      label: 'Client',
      description: 'Project viewing access',
      icon: UserCheck,
      color: 'bg-green-500',
      portalPath: '/client-dashboard'
    }
  ];

  // Check for invitation token and role parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const inviteToken = urlParams.get('invite');
    const role = urlParams.get('role');
    const portal = urlParams.get('portal');
    
    if (urlParams.get('force_logout') === 'true' && clerk) {
      clerk.signOut();
      // Clear the URL parameter
      window.history.replaceState({}, '', '/login');
      return;
    }

    // Set role and portal from URL parameters
    if (role) {
      setSelectedRole(role);
    }
    if (portal) {
      setPortalPath(decodeURIComponent(portal));
    }

    if (inviteToken) {
      setIsValidatingInvite(true);
      validateInvitation(inviteToken);
    }
  }, [clerk]);

  const validateInvitation = async (token: string) => {
    try {
      const response = await fetch('/api/invitations/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      if (response.ok) {
        const invitationData = await response.json();
        setInvitation(invitationData);
        setEmail(invitationData.email); // Pre-fill email
        setInvitationError("");
      } else {
        const errorData = await response.json();
        setInvitationError(errorData.error || "Invalid invitation link");
      }
    } catch (error) {
      console.error('Error validating invitation:', error);
      setInvitationError("Unable to validate invitation. Please try again.");
    } finally {
      setIsValidatingInvite(false);
    }
  };

  const getRoleDisplayInfo = (role: string) => {
    switch (role) {
      case 'admin':
        return {
          label: 'Administrator',
          description: 'Full system access',
          icon: Shield,
          color: 'bg-red-500'
        };
      case 'team_member':
        return {
          label: 'Team Member',
          description: 'Project collaboration access',
          icon: Users,
          color: 'bg-blue-500'
        };
      case 'client':
        return {
          label: 'Client',
          description: 'Project viewing access',
          icon: UserCheck,
          color: 'bg-green-500'
        };
      default:
        return {
          label: 'User',
          description: 'Basic access',
          icon: UserCheck,
          color: 'bg-gray-500'
        };
    }
  };

  useEffect(() => {
    if (isSignedIn && !location.includes('force_logout')) {
      // Redirect to appropriate portal based on role
      if (portalPath) {
        setLocation(portalPath);
      } else {
        // Default redirect based on role or general dashboard
        switch (selectedRole) {
          case 'admin':
            setLocation('/dashboard');
            break;
          case 'team_member':
            setLocation('/projects');
            break;
          case 'client':
            setLocation('/client-dashboard');
            break;
          default:
            setLocation('/');
        }
      }
    }
  }, [isSignedIn, setLocation, location, portalPath, selectedRole]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signIn) return;

    setIsLoading(true);
    setError("");

    try {
      const result = await signIn.create({
        identifier: email,
        password,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        
        // Redirect to appropriate portal based on role
        if (portalPath) {
          setLocation(portalPath);
        } else {
          // Default redirect based on role
          switch (selectedRole) {
            case 'admin':
              setLocation('/dashboard');
              break;
            case 'team_member':
              setLocation('/projects');
              break;
            case 'client':
              setLocation('/client-dashboard');
              break;
            default:
              setLocation('/');
          }
        }
      } else {
        setError("Login failed. Please check your credentials.");
      }
    } catch (err: any) {
      console.error('Login error:', err);
      
      // Better error handling for common cases
      if (err.errors && err.errors.length > 0) {
        const errorMessage = err.errors[0].message;
        
        // Handle specific error cases
        if (errorMessage.includes("account") || errorMessage.includes("user")) {
          setError("Account not found. Please check your email or create a new account.");
        } else if (errorMessage.includes("verification") || errorMessage.includes("verify")) {
          setError("Please verify your email address before logging in. Check your inbox for a verification email.");
        } else if (errorMessage.includes("password")) {
          setError("Incorrect password. Please try again.");
        } else {
          setError(errorMessage);
        }
      } else {
        setError("Login failed. Please check your credentials and try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
      <Card className="w-full max-w-md bg-gray-800 border border-transparent bg-gradient-to-r from-purple-500/20 to-pink-500/20 p-[1px] rounded-lg">
        <div className="bg-gray-800 rounded-lg p-6">
          <CardHeader className="text-center">
            {selectedRole && (
              <div className="flex items-center justify-center mb-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLocation('/')}
                  className="text-gray-400 hover:text-gray-300 mr-auto"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
              </div>
            )}
            <CardTitle className="text-2xl font-bold text-white mb-2">
              {selectedRole ? `${getRoleDisplayInfo(selectedRole).label} Login` : 'Sign in to FunnelHQ 360'}
            </CardTitle>
            {invitation ? (
              <div className="space-y-3">
                <p className="text-gray-400">You've been invited to join as:</p>
                <div className="flex items-center justify-center gap-2">
                  {(() => {
                    const roleInfo = getRoleDisplayInfo(invitation.role);
                    const Icon = roleInfo.icon;
                    return (
                      <>
                        <Badge className={`${roleInfo.color} text-white flex items-center gap-1 px-3 py-1`}>
                          <Icon size={14} />
                          {roleInfo.label}
                        </Badge>
                      </>
                    );
                  })()}
                </div>
                <p className="text-sm text-gray-500">
                  {getRoleDisplayInfo(invitation.role).description}
                </p>
                {invitation.projectId && (
                  <p className="text-xs text-blue-400">
                    Project-specific access included
                  </p>
                )}
              </div>
            ) : selectedRole ? (
              <div className="space-y-3">
                <p className="text-gray-400">Logging in as:</p>
                <div className="flex items-center justify-center gap-2">
                  {(() => {
                    const roleInfo = getRoleDisplayInfo(selectedRole);
                    const Icon = roleInfo.icon;
                    return (
                      <Badge className={`${roleInfo.color} text-white flex items-center gap-1 px-3 py-1`}>
                        <Icon size={14} />
                        {roleInfo.label}
                      </Badge>
                    );
                  })()}
                </div>
                <p className="text-sm text-gray-500">
                  {getRoleDisplayInfo(selectedRole).description}
                </p>
                {portalPath && (
                  <p className="text-xs text-blue-400">
                    Portal: {portalPath}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-gray-400">Enter your credentials to access your dashboard</p>
            )}
            
            {isValidatingInvite && (
              <div className="flex items-center justify-center gap-2 text-yellow-400 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Validating invitation...
              </div>
            )}
            
            {invitationError && (
              <div className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded p-3">
                {invitationError}
              </div>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-300">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={invitation ? "Email from invitation" : "Enter your email"}
                  required
                  disabled={!!invitation}
                  className={`${invitation ? 'bg-gray-600' : 'bg-gray-700'} border-gray-600 text-white placeholder-gray-400`}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-300">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Role Selector */}
              {!invitation && (
                <div className="space-y-2">
                  <Label htmlFor="role" className="text-gray-300">
                    Login as
                  </Label>
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                      <SelectValue placeholder="Select your role..." />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-gray-600">
                      {roleOptions.map((role) => {
                        const Icon = role.icon;
                        return (
                          <SelectItem 
                            key={role.value} 
                            value={role.value}
                            className="text-white hover:bg-gray-600 focus:bg-gray-600"
                          >
                            <div className="flex items-center gap-2">
                              <Icon size={16} />
                              <span>{role.label}</span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  {selectedRole && (
                    <div className="flex items-center gap-2 mt-2">
                      {(() => {
                        const roleInfo = roleOptions.find(r => r.value === selectedRole);
                        if (!roleInfo) return null;
                        const Icon = roleInfo.icon;
                        return (
                          <>
                            <Badge className={`${roleInfo.color} text-white flex items-center gap-1 px-2 py-1 text-xs`}>
                              <Icon size={12} />
                              {roleInfo.label}
                            </Badge>
                            <span className="text-xs text-gray-400">{roleInfo.description}</span>
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded p-3">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                disabled={isLoading || (!invitation && !selectedRole)}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-gray-400">
                {invitation ? (
                  <>
                    Need to create an account?{" "}
                    <button
                      onClick={() => {
                        const urlParams = new URLSearchParams(window.location.search);
                        const inviteToken = urlParams.get('invite');
                        setLocation(`/signup${inviteToken ? `?invite=${inviteToken}` : ''}`);
                      }}
                      className="text-blue-400 hover:text-blue-300 underline"
                    >
                      Sign up with invitation
                    </button>
                  </>
                ) : (
                  <>
                    Don't have an account?{" "}
                    <button
                      onClick={() => setLocation("/signup")}
                      className="text-blue-400 hover:text-blue-300 underline"
                    >
                      Sign up here
                    </button>
                  </>
                )}
              </p>
            </div>
          </CardContent>
        </div>
      </Card>
    </div>
  );
}