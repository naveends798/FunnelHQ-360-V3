import { useOrganization as useClerkOrganization, useOrganizationList } from "@clerk/clerk-react";
import { useEffect } from "react";
import { useLocation } from "wouter";

export function useOrganization() {
  const { organization, isLoaded: orgLoaded } = useClerkOrganization();
  const { 
    organizationList, 
    createOrganization, 
    setActive,
    isLoaded: listLoaded 
  } = useOrganizationList();
  const [, setLocation] = useLocation();

  // Auto-activate organization for users (webhook should have created it)
  useEffect(() => {
    if (!orgLoaded || !listLoaded) return;
    
    // If user has organizations but none active, set the first one
    if (!organization && organizationList && organizationList.length > 0) {
      console.log('🔄 Setting active organization:', organizationList[0].organization.name);
      setActive({ organization: organizationList[0].organization.id });
    }
    // Log if user has no organizations (let the app routing handle onboarding)
    else if (organizationList?.length === 0) {
      console.log('⚠️ User has no organizations. Onboarding will be shown.');
    }
  }, [orgLoaded, listLoaded, organization, organizationList]);

  const handleCreateFirstOrganization = async () => {
    try {
      const newOrg = await createOrganization({
        name: "My Organization",
      });
      
      // Set as active organization
      await setActive({ organization: newOrg.id });
      
      // Initialize with Pro Trial plan metadata
      await newOrg.update({
        publicMetadata: {
          plan: "pro_trial",
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days
          createdAt: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error("Error creating organization:", error);
    }
  };

  const switchOrganization = async (orgId: string) => {
    try {
      await setActive({ organization: orgId });
      setLocation("/"); // Redirect to dashboard
    } catch (error) {
      console.error("Error switching organization:", error);
    }
  };

  const updateOrganizationMetadata = async (metadata: Record<string, any>) => {
    if (!organization) return;
    
    try {
      await organization.update({
        publicMetadata: {
          ...organization.publicMetadata,
          ...metadata
        }
      });
    } catch (error) {
      console.error("Error updating organization metadata:", error);
    }
  };

  return {
    organization,
    organizationList,
    isLoaded: orgLoaded && listLoaded,
    switchOrganization,
    updateOrganizationMetadata,
    createOrganization,
  };
}