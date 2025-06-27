import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useUser } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Building2, CheckCircle, AlertCircle } from "lucide-react";

export default function OrganizationSetupPage() {
  const { user } = useUser();
  const [, setLocation] = useLocation();
  
  // Check if user is admin - only admins can create organizations
  const userRole = user?.publicMetadata?.role as string;
  
  const [organizationName, setOrganizationName] = useState("");
  const [organizationDescription, setOrganizationDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Check if user should be here and auto-generate organization name
  useEffect(() => {
    // Redirect non-admin users to waiting page
    if (user && userRole && userRole !== 'admin') {
      console.log(`🚫 Non-admin user (${userRole}) accessing organization setup - redirecting to waiting page`);
      setLocation("/waiting-for-invitation");
      return;
    }
    
    // Auto-generate organization name for admin users
    if (user && !organizationName && userRole === 'admin') {
      const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
      if (fullName) {
        setOrganizationName(`${fullName}'s Organization`);
      } else if (user.primaryEmailAddress?.emailAddress) {
        const emailPrefix = user.primaryEmailAddress.emailAddress.split('@')[0];
        setOrganizationName(`${emailPrefix}'s Organization`);
      }
    }
  }, [user, organizationName, userRole, setLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);
    setError("");
    
    try {
      console.log('🏢 Creating organization for user:', user.id);
      
      const response = await fetch('/api/create-organization', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: organizationName.trim(),
          description: organizationDescription,
          userId: user.id
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Organization created successfully:', result.organization);
        
        setSuccess(true);
        
        // Redirect to dashboard after a brief delay
        setTimeout(() => {
          setLocation("/dashboard");
        }, 2000);
        
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create organization');
      }
      
    } catch (err: any) {
      console.error('❌ Organization creation error:', err);
      setError(err.message || 'Failed to create organization. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    // User can skip organization setup and go to dashboard
    setLocation("/dashboard");
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
        <Card className="w-full max-w-md bg-gray-800 border border-transparent bg-gradient-to-r from-green-500/20 to-blue-500/20 p-[1px] rounded-lg">
          <div className="bg-gray-800 rounded-lg p-6">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <CheckCircle className="h-16 w-16 text-green-500" />
              </div>
              <CardTitle className="text-2xl font-bold text-white mb-2">
                Organization Created!
              </CardTitle>
              <p className="text-gray-400">
                Your organization "{organizationName}" has been set up successfully.
              </p>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-gray-500 mb-4">
                Redirecting to your dashboard...
              </p>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
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
            <div className="flex justify-center mb-4">
              <Building2 className="h-16 w-16 text-purple-500" />
            </div>
            <CardTitle className="text-2xl font-bold text-white mb-2">
              Set Up Your Organization
            </CardTitle>
            <p className="text-gray-400">
              Create your workspace to start managing projects and collaborating with your team.
            </p>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="organizationName" className="text-gray-300">
                  Organization Name *
                </Label>
                <Input
                  id="organizationName"
                  type="text"
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  placeholder="Your Company Name"
                  required
                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="organizationDescription" className="text-gray-300">
                  Description (Optional)
                </Label>
                <Textarea
                  id="organizationDescription"
                  value={organizationDescription}
                  onChange={(e) => setOrganizationDescription(e.target.value)}
                  placeholder="What does your organization do?"
                  rows={3}
                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 resize-none"
                />
              </div>

              {error && (
                <Alert className="border-red-800 bg-red-900/20">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-red-200">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-3">
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                  disabled={isLoading || !organizationName.trim()}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Organization...
                    </>
                  ) : (
                    <>
                      <Building2 className="mr-2 h-4 w-4" />
                      Create Organization
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSkip}
                  className="w-full border-gray-600 text-gray-300 hover:bg-gray-700"
                  disabled={isLoading}
                >
                  Skip for now
                </Button>
              </div>

              <div className="text-xs text-gray-500 bg-purple-900/20 border border-purple-800 rounded p-2 mt-4">
                ✓ You'll be set as the administrator with full access<br/>
                ✓ Add team members and clients after setup<br/>
                ✓ You can always create an organization later
              </div>
            </form>
          </CardContent>
        </div>
      </Card>
    </div>
  );
}