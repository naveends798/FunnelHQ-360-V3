import { useEffect, useState } from "react";
import { useOrganizationList, useUser } from "@clerk/clerk-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, Loader2, Building2 } from "lucide-react";

export default function AcceptInvitationPage() {
  const { isLoaded, setActive, organizationList } = useOrganizationList();
  const { user } = useUser();
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!isLoaded) return;

    // Check for pending invitations
    const pendingInvitation = organizationList?.find(
      (org) => org.membership?.role === "pending"
    );

    if (pendingInvitation) {
      handleAcceptInvitation(pendingInvitation.organization.id);
    } else {
      // No pending invitation found
      setStatus("error");
      setErrorMessage("No pending invitation found");
    }
  }, [isLoaded, organizationList]);

  const handleAcceptInvitation = async (organizationId: string) => {
    try {
      // Accept the invitation by setting the organization as active
      await setActive({ organization: organizationId });
      
      setStatus("success");
      
      // Redirect after 2 seconds
      setTimeout(() => {
        setLocation("/");
      }, 2000);
    } catch (error: any) {
      setStatus("error");
      setErrorMessage(error.errors?.[0]?.message || "Failed to accept invitation");
    }
  };

  if (!isLoaded || status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <Card className="w-full max-w-md bg-gray-800 border-gray-700">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
            </div>
            <CardTitle className="text-white">Processing Invitation</CardTitle>
            <CardDescription>Please wait while we process your invitation...</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <Card className="w-full max-w-md bg-gray-800 border-gray-700">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <CheckCircle className="h-12 w-12 text-green-500" />
            </div>
            <CardTitle className="text-white">Invitation Accepted!</CardTitle>
            <CardDescription>
              Welcome to the organization! You'll be redirected to the dashboard shortly.
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Button onClick={() => setLocation("/")} className="gap-2">
              <Building2 className="h-4 w-4" />
              Go to Dashboard
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <Card className="w-full max-w-md bg-gray-800 border-gray-700">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <XCircle className="h-12 w-12 text-red-500" />
          </div>
          <CardTitle className="text-white">Invitation Error</CardTitle>
          <CardDescription>{errorMessage}</CardDescription>
        </CardHeader>
        <CardFooter className="flex-col gap-4">
          <p className="text-sm text-gray-400 text-center">
            The invitation may have expired or already been used.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setLocation("/login")}>
              Back to Login
            </Button>
            <Button onClick={() => setLocation("/")}>
              Go to Dashboard
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}