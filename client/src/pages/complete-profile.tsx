import { useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, User, Briefcase, Users, Crown, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function CompleteProfilePage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    companyName: "",
    companyRole: "",
    industry: "",
    companySize: "",
    specialization: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Validate required fields
    if (!formData.companyName || !formData.industry || !formData.companySize || !formData.companyRole || !formData.specialization) {
      console.error('Missing required fields:', formData);
      alert('Please fill in all required fields');
      setLoading(false);
      return;
    }

    try {
      console.log('Submitting profile data:', formData);
      
      // Update user metadata in Clerk
      await user?.update({
        publicMetadata: {
          ...user.publicMetadata,
          ...formData,
          profileCompleted: true
        }
      });

      // Create/update user record in our database
      const response = await fetch('/api/users/complete-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clerkId: user?.id,
          email: user?.emailAddresses[0]?.emailAddress,
          name: user?.fullName,
          ...formData
        })
      });

      console.log('Profile completion response:', response.status);

      if (response.ok) {
        // For admin users, set up trial and go directly to dashboard
        const userRole = user?.publicMetadata?.role || 'admin';
        
        if (userRole === 'admin') {
          // Set trial start date in user metadata
          await user?.update({
            publicMetadata: {
              ...user.publicMetadata,
              trialStartDate: new Date().toISOString(),
              trialEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
              planType: 'pro_trial'
            }
          });
        }
        
        console.log('Navigating to dashboard...');
        // Skip onboarding and go directly to dashboard
        setLocation('/dashboard');
      } else {
        const errorData = await response.text();
        console.error('Server error:', errorData);
        throw new Error(`Failed to complete profile: ${response.status}`);
      }
    } catch (error) {
      console.error('Error completing profile:', error);
      alert(`Error completing profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
      <Card className="w-full max-w-2xl bg-gray-800/50 border-gray-700">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-white">Complete Your Profile</CardTitle>
          <CardDescription className="text-gray-400">
            Set up your workspace and activate your 14-day Pro trial
          </CardDescription>
          
          {/* Trial Banner */}
          <Alert className="border-green-800 bg-green-900/20 mt-4">
            <Crown className="h-4 w-4" />
            <AlertDescription className="text-green-200">
              <div className="flex items-center gap-2">
                <Badge className="bg-green-500 text-white">
                  FREE 14-DAY PRO TRIAL
                </Badge>
                <span>All premium features included</span>
              </div>
            </AlertDescription>
          </Alert>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Company Information */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-white">
                <Building2 className="h-5 w-5" />
                <h3 className="text-lg font-semibold">Company Information</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName" className="text-gray-300">Company Name <span className="text-red-500">*</span></Label>
                  <Input
                    id="companyName"
                    placeholder="Acme Agency"
                    value={formData.companyName}
                    onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                    className="bg-gray-700 border-gray-600 text-white"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="industry" className="text-gray-300">Industry <span className="text-red-500">*</span></Label>
                  <Select value={formData.industry} onValueChange={(value) => setFormData(prev => ({ ...prev, industry: value }))}>
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="marketing">Marketing & Advertising</SelectItem>
                      <SelectItem value="design">Design & Creative</SelectItem>
                      <SelectItem value="development">Web Development</SelectItem>
                      <SelectItem value="consulting">Consulting</SelectItem>
                      <SelectItem value="ecommerce">E-commerce</SelectItem>
                      <SelectItem value="saas">SaaS</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="companySize" className="text-gray-300">Company Size <span className="text-red-500">*</span></Label>
                <Select value={formData.companySize} onValueChange={(value) => setFormData(prev => ({ ...prev, companySize: value }))}>
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue placeholder="Select company size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Solo (Just me)</SelectItem>
                    <SelectItem value="2-10">Small team (2-10 people)</SelectItem>
                    <SelectItem value="11-50">Medium team (11-50 people)</SelectItem>
                    <SelectItem value="51-200">Large team (51-200 people)</SelectItem>
                    <SelectItem value="200+">Enterprise (200+ people)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Personal Information */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-white">
                <User className="h-5 w-5" />
                <h3 className="text-lg font-semibold">Your Role</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="companyRole" className="text-gray-300">Your Role <span className="text-red-500">*</span></Label>
                  <Select value={formData.companyRole} onValueChange={(value) => setFormData(prev => ({ ...prev, companyRole: value }))}>
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                      <SelectValue placeholder="Select your role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="founder">Founder/CEO</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="freelancer">Freelancer</SelectItem>
                      <SelectItem value="consultant">Consultant</SelectItem>
                      <SelectItem value="employee">Employee</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="specialization" className="text-gray-300">Specialization <span className="text-red-500">*</span></Label>
                  <Select value={formData.specialization} onValueChange={(value) => setFormData(prev => ({ ...prev, specialization: value }))}>
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                      <SelectValue placeholder="Select specialization" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="project_manager">Project Manager</SelectItem>
                      <SelectItem value="developer">Developer</SelectItem>
                      <SelectItem value="designer">Designer</SelectItem>
                      <SelectItem value="marketer">Marketer</SelectItem>
                      <SelectItem value="strategist">Strategist</SelectItem>
                      <SelectItem value="account_manager">Account Manager</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-primary hover:bg-primary/90" 
              disabled={loading}
            >
              {loading ? "Setting up your workspace..." : "Complete Profile & Activate Trial"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}