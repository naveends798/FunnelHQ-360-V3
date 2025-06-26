import { useState, useEffect } from "react";
import Sidebar from "@/components/sidebar";

export default function BillingSimplePage() {
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Simulate loading
    setTimeout(() => setLoading(false), 1000);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen gradient-bg relative overflow-hidden">
        <Sidebar />
        <main className="lg:ml-64 p-4 lg:p-8 pt-20 lg:pt-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white"></div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg relative overflow-hidden">
      <Sidebar />
      <main className="lg:ml-64 p-4 lg:p-8 pt-20 lg:pt-8">
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Billing & Usage</h1>
            <p className="text-slate-400 mt-2">Simple billing page test</p>
          </div>
          
          <div className="glass border-white/10 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4">Current Plan: Solo</h2>
            <p className="text-slate-400">$17/month</p>
          </div>
        </div>
      </main>
    </div>
  );
}