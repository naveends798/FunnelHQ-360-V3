import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth as useClerkAuth, useSignUp, useClerk, useOrganizationList } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Eye, EyeOff, Shield, Users, UserCheck, AlertCircle, CheckCircle, Building2 } from "lucide-react";
import type { UserInvitation } from "@shared/schema";

export default function SignupPage() {
  const { isSignedIn } = useClerkAuth();
  const { signUp, setActive } = useSignUp();
  const clerk = useClerk();
  const { createOrganization } = useOrganizationList();
  const [, setLocation] = useLocation();
  
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [invitation, setInvitation] = useState<UserInvitation | null>(null);
  const [invitationError, setInvitationError] = useState("");
  const [isValidatingInvite, setIsValidatingInvite] = useState(false);
  const [isAdminSignup, setIsAdminSignup] = useState(false);
  const [signupStep, setSignupStep] = useState<'form' | 'creating' | 'verifying' | 'complete'>('form');
  const [progressMessage, setProgressMessage] = useState("");

  // Check for invitation token or role from login page
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const inviteToken = urlParams.get('invite');
    const roleParam = urlParams.get('role');
    
    if (inviteToken) {
      setIsValidatingInvite(true);
      validateInvitation(inviteToken);
    } else if (roleParam === 'admin') {
      // Admin signup from login page
      setIsAdminSignup(true);
    } else {
      // Default to admin for direct access
      setIsAdminSignup(true);
    }
  }, []);


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
        setEmail(invitationData.email);
        setFirstName(invitationData.name.split(' ')[0] || '');
        setLastName(invitationData.name.split(' ').slice(1).join(' ') || '');
        setInvitationError("");
        setIsAdminSignup(false);
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
    if (isSignedIn) {
      setLocation("/");
    }
  }, [isSignedIn, setLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signUp) return;

    // Allow open signup with Pro Trial - no invitation required
    console.log('🎯 Allowing open signup with Pro Trial access');

    setIsLoading(true);
    setError("");
    setSignupStep('creating');
    setProgressMessage("Creating your account...");

    try {
      // Create Clerk account with better error handling
      console.log('🔄 Step 1: Creating Clerk account...');
      const result = await signUp.create({
        firstName,
        lastName,
        emailAddress: email,
        password,
      });
      
      console.log('✅ Step 1 Complete: Clerk account created');
      
      console.log('Signup result:', result);

      if (result.status === "complete") {
        setProgressMessage("Setting up your account...");
        console.log('🔄 Step 2: Activating session...');
        
        await setActive({ session: result.createdSessionId });
        console.log('✅ Step 2 Complete: Session activated');
        
        // Set up user metadata based on role
        setProgressMessage("Configuring your account...");
        console.log('🔄 Step 3: Setting up user metadata...');
        
        try {
          const userRole = invitation?.role || 'admin';
          
          // Only admins get Pro Trial - others get basic access
          const metadata = userRole === 'admin' ? {
            role: 'admin',
            subscriptionPlan: 'pro_trial',
            trialStartDate: new Date().toISOString(),
            trialEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
            maxProjects: -1, // Unlimited during trial
            maxStorage: 107374182400 // 100GB
          } : {
            role: userRole,
            subscriptionPlan: 'basic',
            maxProjects: 0, // Will be set by organization admin
            maxStorage: 1073741824 // 1GB
          };
          
          await clerk?.user?.update({
            publicMetadata: metadata
          });
          
          console.log(`✅ Step 3 Complete: ${userRole} metadata set`);
        } catch (metadataError) {
          console.error('⚠️ Error setting user metadata:', metadataError);
          // Continue anyway - user is created
          console.log('⚠️ Continuing without metadata - webhook will handle this');
        }

        // Account created successfully - organization will be set up later
        console.log('✅ Account created successfully - user can set up organization after login');
        
        // If we have an invitation, accept it
        if (invitation) {
          try {
            const urlParams = new URLSearchParams(window.location.search);
            const inviteToken = urlParams.get('invite');
            
            if (inviteToken) {
              await fetch('/api/invitations/accept', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                  token: inviteToken, 
                  userId: result.createdUserId 
                }),
              });
            }
          } catch (inviteError) {
            console.error('Error accepting invitation:', inviteError);
            // Continue anyway - user is created
          }
        }
        
        setSignupStep('complete');
        setProgressMessage("Account created successfully!");
        
        // Role-based redirect
        const userRole = invitation?.role || 'admin';
        console.log(`✅ Step 4 Complete: Account created successfully! User role: ${userRole}`);
        
        // Brief delay to show completion before redirect
        setTimeout(() => {
          if (userRole === 'admin') {
            console.log('🎯 Redirecting admin to organization setup');
            setLocation("/organization-setup");
          } else {
            console.log(`🎯 Redirecting ${userRole} to invitation waiting page`);
            setLocation("/waiting-for-invitation");
          }
        }, 1500);
      } else if (result.status === "missing_requirements") {
        // Handle verification requirements
        console.log('Signup requires additional steps:', result);
        console.log('Missing fields:', result.missingFields);
        console.log('Unverified fields:', result.unverifiedFields);
        
        // Check if email verification is needed
        const needsEmailVerification = result.unverifiedFields?.includes("email_address");
        
        if (needsEmailVerification) {
          // Send verification email with better error handling
          try {
            await result.prepareEmailAddressVerification({ strategy: "email_code" });
            console.log(`✅ Verification email sent to: ${email}`);
            setError(""); // Clear any errors
            
            // Store signup data for later completion
            localStorage.setItem('pendingSignup', JSON.stringify({
              email,
              firstName,
              lastName,
              isAdminSignup,
              invitation: invitation?.id || null,
              createdUserId: result.createdUserId,
              timestamp: Date.now()
            }));
            
            setLocation(`/verify-email?email=${encodeURIComponent(email)}&userId=${result.createdUserId}&signup=true`);
          } catch (verificationError) {
            console.error('Error preparing email verification:', verificationError);
            setError("Failed to send verification email. Please check your email address and try again.");
          }
        } else {
          // Handle other missing requirements with better messaging
          console.log('No email verification needed, but other requirements missing');
          console.log('Missing fields:', result.missingFields);
          console.log('Unverified fields:', result.unverifiedFields);
          
          // Try to handle specific missing requirements
          const missingFields = result.missingFields || [];
          const unverifiedFields = result.unverifiedFields || [];
          
          if (missingFields.length > 0) {
            setError(`Please complete the following required fields: ${missingFields.join(', ')}`);
          } else if (unverifiedFields.length > 0) {
            setError(`The following fields need verification: ${unverifiedFields.join(', ')}`);
          } else {
            // Handle based on role
            const userRole = invitation?.role || 'admin';
            if (userRole === 'admin') {
              console.log('Admin user - attempting to proceed despite missing requirements');
              try {
                await setActive({ session: result.createdSessionId });
                setLocation("/organization-setup");
              } catch (activationError) {
                console.error('Failed to activate session:', activationError);
                setError("Account created but unable to sign in automatically. Please try logging in manually.");
              }
            } else {
              console.log(`${userRole} user - redirecting to waiting page`);
              try {
                await setActive({ session: result.createdSessionId });
                setLocation("/waiting-for-invitation");
              } catch (activationError) {
                console.error('Failed to activate session:', activationError);
                setError("Account created but requires additional verification. Please contact support or try logging in.");
              }
            }
          }
        }
      } else {
        console.error('Unexpected signup status:', result.status, result);
        console.error('Full result object:', JSON.stringify(result, null, 2));
        setError(`Account creation failed. Status: ${result.status}. Please check the console for details.`);
      }
    } catch (err: any) {
      console.error('Signup error:', err);
      console.error('Error details:', JSON.stringify(err, null, 2));
      
      // More detailed error messages
      if (err.errors && err.errors.length > 0) {
        setError(err.errors[0].message);
      } else if (err.message) {
        setError(err.message);
      } else {
        setError("Account creation failed. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Block non-admin signup without invitation
  if (!isValidatingInvite && !invitation && !isAdminSignup) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
        <Card className="w-full max-w-md bg-gray-800 border border-transparent bg-gradient-to-r from-red-500/20 to-orange-500/20 p-[1px] rounded-lg">
          <div className="bg-gray-800 rounded-lg p-6">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <AlertCircle className="h-16 w-16 text-red-500" />
              </div>
              <CardTitle className="text-2xl font-bold text-white mb-2">
                Access Control
              </CardTitle>
              <p className="text-gray-400">
                Client and Team Member accounts can only be created by administrators with proper access rights.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="border-orange-800 bg-orange-900/20">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-orange-200">
                  <strong>Access Policy:</strong><br/>
                  • <strong>Administrators</strong> get a 14-day free Pro trial<br/>
                  • <strong>Clients & Team Members</strong> require admin invitation<br/>
                  • Only admins can create other user accounts
                </AlertDescription>
              </Alert>
              
              <div className="flex gap-2">
                <Button
                  onClick={() => setLocation("/login")}
                  variant="outline"
                  className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  Back to Login
                </Button>
                <Button
                  onClick={() => setIsAdminSignup(true)}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                >
                  Start Admin Trial
                </Button>
              </div>
            </CardContent>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
      <Card className="w-full max-w-md bg-gray-800 border border-transparent bg-gradient-to-r from-purple-500/20 to-pink-500/20 p-[1px] rounded-lg">
        <div className="bg-gray-800 rounded-lg p-6">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-white mb-2">
              {invitation ? "Accept Invitation" : "Start Your 14-Day Pro Trial"}
            </CardTitle>
            
            {invitation ? (
              <div className="space-y-3">
                <p className="text-gray-400">You've been invited to join as:</p>
                <div className="flex items-center justify-center gap-2">
                  {(() => {
                    const roleInfo = getRoleDisplayInfo(invitation.role);
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
                  {getRoleDisplayInfo(invitation.role).description}
                </p>
              </div>
            ) : isAdminSignup ? (
              <div className="space-y-3">
                <p className="text-gray-400">Create your administrator account & start free trial</p>
                <div className="flex items-center justify-center gap-2">
                  <Badge className="bg-red-500 text-white flex items-center gap-1 px-3 py-1">
                    <Shield size={14} />
                    Administrator
                  </Badge>
                  <Badge className="bg-green-500 text-white flex items-center gap-1 px-3 py-1">
                    FREE 14-DAY PRO TRIAL
                  </Badge>
                </div>
                <p className="text-sm text-gray-500">Full system access, management capabilities, and all premium features</p>
                <div className="text-xs text-green-400 bg-green-900/20 border border-green-800 rounded p-2">
                  ✓ Access to all features during trial period<br/>
                  ✓ Create unlimited projects and teams<br/>
                  ✓ Full admin portal access
                </div>
              </div>
            ) : null}
            
            {isValidatingInvite && (
              <div className="flex items-center justify-center gap-2 text-yellow-400 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Validating invitation...
              </div>
            )}
            
            {invitationError && (
              <Alert className="border-red-800 bg-red-900/20 mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-red-200">
                  {invitationError}
                </AlertDescription>
              </Alert>
            )}
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-gray-300">
                    First Name
                  </Label>
                  <Input
                    id="firstName"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Enter first name"
                    required
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-gray-300">
                    Last Name
                  </Label>
                  <Input
                    id="lastName"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Enter last name"
                    required
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                  />
                </div>
              </div>
              
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
                    placeholder="Create a strong password"
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

              {/* Organization setup will be handled after login */}
              {isAdminSignup && (
                <div className="pt-4 border-t border-gray-600">
                  <div className="flex items-center gap-2 mb-4">
                    <Building2 className="w-5 h-5 text-purple-400" />
                    <h3 className="text-lg font-semibold text-white">What's Next</h3>
                  </div>
                  
                  <div className="text-xs text-gray-500 bg-purple-900/20 border border-purple-800 rounded p-2">
                    ✓ Create your account with Pro Trial access<br/>
                    ✓ Set up your organization after login<br/>
                    ✓ Add team members and clients to your workspace
                  </div>
                </div>
              )}

              {error && (
                <Alert className="border-red-800 bg-red-900/20">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-red-200">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                disabled={isLoading || isValidatingInvite}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {progressMessage || "Creating account..."}
                  </>
                ) : invitation ? (
                  "Accept invitation & Create Account"
                ) : (
                  "Create Account & Start Trial"
                )}
              </Button>

              {/* Progress indicator during signup */}
              {isLoading && signupStep !== 'form' && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <div className="flex space-x-1">
                      <div className={`w-2 h-2 rounded-full ${signupStep === 'creating' ? 'bg-purple-500 animate-pulse' : 'bg-green-500'}`}></div>
                      <div className={`w-2 h-2 rounded-full ${signupStep === 'verifying' ? 'bg-purple-500 animate-pulse' : signupStep === 'complete' ? 'bg-green-500' : 'bg-gray-600'}`}></div>
                      <div className={`w-2 h-2 rounded-full ${signupStep === 'complete' ? 'bg-green-500' : 'bg-gray-600'}`}></div>
                    </div>
                    <span>{progressMessage}</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    This may take a few moments while we set up your account and Pro Trial access.
                  </p>
                </div>
              )}
            </form>

            <div className="mt-6 text-center">
              <p className="text-gray-400">
                Already have an account?{" "}
                <button
                  onClick={() => {
                    const urlParams = new URLSearchParams(window.location.search);
                    const inviteToken = urlParams.get('invite');
                    setLocation(`/login${inviteToken ? `?invite=${inviteToken}` : ''}`);
                  }}
                  className="text-blue-400 hover:text-blue-300 underline"
                >
                  Sign in here
                </button>
              </p>
            </div>
          </CardContent>
        </div>
      </Card>
    </div>
  );
}