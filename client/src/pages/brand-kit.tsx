import { motion } from "framer-motion";
import Sidebar from "@/components/sidebar";
import BrandKitManager from "@/components/brand-kit-manager";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { 
  Palette, 
  Upload, 
  Download, 
  Share2,
  Settings
} from "lucide-react";

export default function BrandKitPage() {
  const { isAdmin, isTeamMember } = useAuth();

  return (
    <div className="min-h-screen gradient-bg">
      <Sidebar />
      
      <main className="ml-64 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between mb-8"
          >
            <div>
              <h1 className="text-3xl font-bold text-white mb-2 flex items-center">
                <Palette className="h-8 w-8 mr-3" />
                Brand Kit
              </h1>
              <p className="text-slate-400">
                Your complete brand identity system in one place
              </p>
              <div className="flex items-center space-x-4 mt-3">
                <div className="text-xs text-slate-500">
                  <span className="text-white font-medium">8</span> brand assets
                </div>
                <div className="text-xs text-slate-500">
                  <span className="text-white font-medium">7</span> brand colors
                </div>
                <div className="text-xs text-slate-500">
                  <span className="text-white font-medium">4</span> typography styles
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button variant="outline" className="glass border-white/20 text-white hover:bg-white/10">
                <Share2 className="h-4 w-4 mr-2" />
                Share Kit
              </Button>
              <Button variant="outline" className="glass border-white/20 text-white hover:bg-white/10">
                <Download className="h-4 w-4 mr-2" />
                Download All
              </Button>
              {(isAdmin || isTeamMember) && (
                <>
                  <Button variant="outline" className="glass border-white/20 text-white hover:bg-white/10">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Assets
                  </Button>
                  <Button className="gradient-primary">
                    <Settings className="h-4 w-4 mr-2" />
                    Manage Kit
                  </Button>
                </>
              )}
            </div>
          </motion.div>

          {/* Brand Kit Content */}
          <BrandKitManager />
        </div>
      </main>
    </div>
  );
}