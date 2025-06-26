import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";

function SimpleApp() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-slate-900 text-white p-8">
        <h1 className="text-4xl font-bold mb-4">Funnel Portal</h1>
        <p className="text-lg">Dashboard is loading...</p>
        <div className="mt-8 p-4 bg-slate-800 rounded-lg">
          <h2 className="text-xl font-semibold mb-2">App Status</h2>
          <p>✅ React is working</p>
          <p>✅ Port 3001 is accessible</p>
          <p>✅ Basic routing should work</p>
          <p>⚠️ Testing simplified version</p>
        </div>
      </div>
    </QueryClientProvider>
  );
}

export default SimpleApp;