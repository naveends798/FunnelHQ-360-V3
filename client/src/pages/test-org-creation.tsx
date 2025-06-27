import { useState } from "react";
import { useOrganizationList, useAuth, useUser } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TestOrgCreation() {
  const { createOrganization, setActive, organizationList } = useOrganizationList();
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const [orgName, setOrgName] = useState("Test Organization");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>("");

  const handleCreateOrganization = async () => {
    setLoading(true);
    setResult("🔄 Creating organization...");

    try {
      console.log("🔄 Testing both frontend and backend organization creation:", orgName);
      
      // Test 1: Frontend hook method
      setResult("🔄 Testing frontend hook method...");
      
      if (createOrganization) {
        try {
          const newOrgFrontend = await createOrganization({
            name: orgName.trim() + " (Frontend)"
          });
          console.log("✅ Frontend organization created:", newOrgFrontend);
          setResult(prev => prev + `\n✅ Frontend method succeeded: ${newOrgFrontend?.id}`);
        } catch (frontendError) {
          console.error("❌ Frontend method failed:", frontendError);
          setResult(prev => prev + `\n❌ Frontend method failed: ${frontendError?.message}`);
        }
      } else {
        setResult(prev => prev + "\n❌ Frontend createOrganization hook not available");
      }

      // Test 2: Backend API method
      setResult(prev => prev + "\n🔄 Testing backend API method...");
      
      try {
        const response = await fetch('/api/create-organization', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: orgName.trim() + " (Backend)",
            description: "Test organization created via backend API",
            userId: user?.id || "user_123"
          })
        });

        if (response.ok) {
          const backendResult = await response.json();
          console.log("✅ Backend organization created:", backendResult);
          setResult(prev => prev + `\n✅ Backend method succeeded: ${backendResult.organization?.id}`);
        } else {
          const errorData = await response.json();
          setResult(prev => prev + `\n❌ Backend method failed: ${errorData.error}`);
        }
      } catch (backendError) {
        console.error("❌ Backend method error:", backendError);
        setResult(prev => prev + `\n❌ Backend method error: ${backendError?.message}`);
      }

    } catch (error) {
      console.error("❌ General error:", error);
      setResult(prev => prev + `\n❌ General error: ${error?.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <Card className="w-full max-w-md bg-gray-800 border-gray-600">
          <CardContent className="p-6 text-center text-white">
            Please sign in to test organization creation
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
      <Card className="w-full max-w-md bg-gray-800 border-gray-600">
        <CardHeader>
          <CardTitle className="text-white">Test Organization Creation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-gray-300 text-sm">Organization Name</label>
            <Input
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="bg-gray-700 border-gray-600 text-white"
              disabled={loading}
            />
          </div>

          <Button
            onClick={handleCreateOrganization}
            disabled={loading || !orgName.trim()}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            {loading ? "Creating..." : "Create Organization"}
          </Button>

          {result && (
            <div className="mt-4 p-3 bg-gray-700 rounded text-sm text-gray-300 whitespace-pre-line">
              {result}
            </div>
          )}

          <div className="mt-4 text-xs text-gray-500">
            <div>Current Organizations: {organizationList?.length || 0}</div>
            <div>Hook loaded: {createOrganization ? "✅" : "❌"}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}