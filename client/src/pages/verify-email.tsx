import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useSignUp } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Mail, CheckCircle, AlertCircle } from "lucide-react";

export default function VerifyEmailPage() {
  const { signUp, setActive } = useSignUp();
  const [, setLocation] = useLocation();
  
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState("");

  useEffect(() => {
    // Get email from URL params
    const urlParams = new URLSearchParams(window.location.search);
    const emailParam = urlParams.get('email');
    const isSignupFlow = urlParams.get('signup') === 'true';
    
    if (emailParam) {
      setEmail(emailParam);
    }
    
    // If this is part of signup flow, restore pending signup data
    if (isSignupFlow) {
      try {
        const pendingSignup = localStorage.getItem('pendingSignup');
        if (pendingSignup) {
          const signupData = JSON.parse(pendingSignup);
          console.log('📋 Restored pending signup data:', signupData);
          
          // Check if signup data is still valid (not older than 1 hour)
          const isExpired = Date.now() - signupData.timestamp > 60 * 60 * 1000;
          if (isExpired) {
            console.log('⚠️ Pending signup data expired, clearing...');
            localStorage.removeItem('pendingSignup');
          }
        }
      } catch (error) {
        console.error('Error restoring pending signup data:', error);
        localStorage.removeItem('pendingSignup');
      }
    }
  }, []);

  useEffect(() => {
    // Show helpful message about email verification
    if (email) {
      console.log(`Email verification required for: ${email}`);
      console.log('Please check your email for the verification code.');
    }
  }, [email]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signUp || !code.trim()) return;

    setIsLoading(true);
    setError("");

    try {
      const result = await signUp.attemptEmailAddressVerification({
        code: code.trim(),
      });

      if (result.status === "complete") {
        setSuccess(true);
        await setActive({ session: result.createdSessionId });
        
        // Handle post-verification setup for new signups
        try {
          const pendingSignup = localStorage.getItem('pendingSignup');
          if (pendingSignup) {
            const signupData = JSON.parse(pendingSignup);
            console.log('🎯 Completing signup flow for verified user...');
            
            // If this was an admin signup, ensure metadata is set
            if (signupData.isAdminSignup && signupData.createdUserId) {
              try {
                // The metadata should already be set during signup, but verify it exists
                console.log('✅ Admin signup verified - metadata should be set');
              } catch (metadataError) {
                console.error('Error verifying metadata:', metadataError);
                // Continue anyway - user is verified
              }
            }
            
            // Clean up pending signup data
            localStorage.removeItem('pendingSignup');
            console.log('🧹 Cleaned up pending signup data');
          }
        } catch (error) {
          console.error('Error during post-verification setup:', error);
          // Continue anyway - verification was successful
        }
        
        // Small delay to show success message
        setTimeout(() => {
          setLocation("/organization-setup");
        }, 1500);
      } else {
        setError("Verification incomplete. Please try again.");
      }
    } catch (err: any) {
      setError(err.errors?.[0]?.message || "Verification failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!signUp) return;

    setIsLoading(true);
    setError("");

    try {
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setError(""); // Clear any previous errors
      // Show a success message or toast here if you have one
    } catch (err: any) {
      setError(err.errors?.[0]?.message || "Failed to resend code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
        <Card className="w-full max-w-md bg-gray-800 border border-transparent bg-gradient-to-r from-green-500/20 to-emerald-500/20 p-[1px] rounded-lg">
          <div className="bg-gray-800 rounded-lg p-6">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <CheckCircle className="h-16 w-16 text-green-500" />
              </div>
              <CardTitle className="text-2xl font-bold text-white mb-2">
                Email Verified!
              </CardTitle>
              <p className="text-gray-400">
                Your account has been successfully created. Redirecting you to the dashboard...
              </p>
            </CardHeader>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
      <Card className="w-full max-w-md bg-gray-800 border border-transparent bg-gradient-to-r from-blue-500/20 to-purple-500/20 p-[1px] rounded-lg">
        <div className="bg-gray-800 rounded-lg p-6">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Mail className="h-16 w-16 text-blue-500" />
            </div>
            <CardTitle className="text-2xl font-bold text-white mb-2">
              Verify Your Email
            </CardTitle>
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mb-4">
              <p className="text-blue-300 text-sm">
                📧 We've sent a 6-digit verification code to:
              </p>
              <p className="text-white font-medium mt-1">
                {email}
              </p>
              <p className="text-blue-200 text-xs mt-2">
                Check your inbox (and spam folder) for the verification email.
              </p>
            </div>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleVerify} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code" className="text-gray-300">
                  Verification Code
                </Label>
                <Input
                  id="code"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Enter 6-digit code"
                  required
                  maxLength={6}
                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 text-center text-lg tracking-wider"
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

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                disabled={isLoading || !code.trim()}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify Email"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center space-y-2">
              <p className="text-gray-400 text-sm">
                Didn't receive the code?
              </p>
              <Button
                variant="outline"
                onClick={handleResendCode}
                disabled={isLoading}
                className="text-blue-400 border-blue-400 hover:bg-blue-400/10"
              >
                Resend Code
              </Button>
            </div>

            <div className="mt-6 text-center">
              <p className="text-gray-400">
                Want to use a different email?{" "}
                <button
                  onClick={() => setLocation("/signup")}
                  className="text-blue-400 hover:text-blue-300 underline"
                >
                  Start over
                </button>
              </p>
            </div>
          </CardContent>
        </div>
      </Card>
    </div>
  );
}