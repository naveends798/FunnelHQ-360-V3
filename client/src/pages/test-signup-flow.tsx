import { useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle } from "lucide-react";

export default function TestSignupFlow() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Simulate successful signup completion and redirect to organization setup
    console.log('🧪 Testing signup flow - redirecting to organization setup...');
    
    setTimeout(() => {
      setLocation("/organization-setup");
    }, 2000);
  }, [setLocation]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
      <Card className="w-full max-w-md bg-gray-800 border border-transparent bg-gradient-to-r from-green-500/20 to-blue-500/20 p-[1px] rounded-lg">
        <div className="bg-gray-800 rounded-lg p-6">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle className="text-2xl font-bold text-white mb-2">
              Account Created Successfully!
            </CardTitle>
            <p className="text-gray-400">
              Setting up your workspace...
            </p>
          </CardHeader>
          <CardContent className="text-center">
            <div className="flex items-center justify-center gap-2 text-gray-400">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Redirecting to organization setup</span>
            </div>
          </CardContent>
        </div>
      </Card>
    </div>
  );
}