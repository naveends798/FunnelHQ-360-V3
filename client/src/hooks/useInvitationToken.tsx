import { useEffect, useState } from "react";
import { useAuth as useClerkAuth } from "@clerk/clerk-react";
import { useLocation } from "wouter";

export function useInvitationToken() {
  const { isSignedIn } = useClerkAuth();
  const [, setLocation] = useLocation();
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // Check for invitation token in URL
    const urlParams = new URLSearchParams(window.location.search);
    const invitationToken = urlParams.get("__clerk_invitation_token");
    const redirectUrl = urlParams.get("redirect_url");

    if (invitationToken) {
      setIsProcessing(true);
      
      // Store the token for Clerk to process
      sessionStorage.setItem("__clerk_invitation_token", invitationToken);
      
      // If user is not signed in, redirect to signup with the token
      if (!isSignedIn) {
        setLocation(`/signup?__clerk_invitation_token=${invitationToken}`);
      } else {
        // If already signed in, go to accept invitation page
        setLocation("/accept-invitation");
      }
    }
  }, [isSignedIn, setLocation]);

  return { isProcessing };
}