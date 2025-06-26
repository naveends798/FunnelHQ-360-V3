import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

// Simple dashboard component without complex dependencies
function SimpleDashboard() {
  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <h1 className="text-4xl font-bold mb-4">Funnel Portal Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-2">Projects</h2>
          <p className="text-3xl font-bold text-blue-400">12</p>
        </div>
        <div className="bg-slate-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-2">Active Tasks</h2>
          <p className="text-3xl font-bold text-green-400">24</p>
        </div>
        <div className="bg-slate-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-2">Clients</h2>
          <p className="text-3xl font-bold text-purple-400">8</p>
        </div>
      </div>
      <div className="mt-8 p-4 bg-slate-800 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Status</h2>
        <p>✅ Basic App structure working</p>
        <p>✅ Tailwind CSS working</p>
        <p>✅ QueryClient working</p>
        <p>🔧 Testing without complex auth/routing</p>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <SimpleDashboard />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;