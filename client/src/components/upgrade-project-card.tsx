import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Plus, ArrowRight, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "wouter";

interface UpgradeProjectCardProps {
  className?: string;
}

export function UpgradeProjectCard({ className }: UpgradeProjectCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={className}
    >
      <Card className="h-full min-h-[320px] border-2 border-dashed border-purple-500/70 bg-gradient-to-br from-purple-900/60 via-purple-800/40 to-purple-900/60 backdrop-blur-sm hover:border-purple-400/90 transition-all duration-300 hover:scale-[1.02] group shadow-lg">
        <CardContent className="p-6 h-full flex flex-col items-center justify-center text-center space-y-4">
          {/* Icon */}
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 to-purple-700 flex items-center justify-center shadow-lg group-hover:shadow-purple-500/25 transition-all duration-300">
              <Plus className="h-8 w-8 text-white" />
            </div>
            <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <Crown className="h-3 w-3 text-white" />
            </div>
          </div>

          {/* Content */}
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2">
              <h3 className="text-lg font-semibold text-white">Create More Projects</h3>
              <Badge className="bg-purple-600/60 text-purple-100 border-purple-400/60 text-xs font-semibold">
                Pro Feature
              </Badge>
            </div>
            <p className="text-purple-100 text-sm leading-relaxed font-medium">
              You've reached your Solo plan limit of 3 projects. Upgrade to Pro for unlimited projects and advanced features.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-1 text-xs text-purple-200 font-medium">
            <div className="flex items-center justify-center gap-1">
              <Zap className="h-3 w-3" />
              <span>Unlimited projects</span>
            </div>
            <div className="flex items-center justify-center gap-1">
              <Crown className="h-3 w-3" />
              <span>Up to 25 team members</span>
            </div>
            <div className="flex items-center justify-center gap-1">
              <Plus className="h-3 w-3" />
              <span>100GB storage</span>
            </div>
          </div>

          {/* CTA Button */}
          <Link href="/billing" className="w-full">
            <Button 
              className="w-full bg-gradient-to-r from-purple-600 via-purple-700 to-purple-800 hover:from-purple-500 hover:via-purple-600 hover:to-purple-700 text-white border-0 shadow-lg hover:shadow-purple-500/25 transition-all duration-300 group-hover:scale-105"
              size="sm"
            >
              <Crown className="h-4 w-4 mr-2" />
              Upgrade to Pro
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>

          {/* Pricing hint */}
          <p className="text-xs text-purple-300">
            Starting at $37/month
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface ProjectSlotCardProps {
  slotNumber: number;
  className?: string;
}

export function ProjectSlotCard({ slotNumber, className }: ProjectSlotCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay: slotNumber * 0.05 }}
      className={className}
    >
      <Card className="h-full border-2 border-dashed border-slate-600 bg-slate-800/30 hover:border-slate-500 transition-all duration-300 min-h-[320px]">
        <CardContent className="p-6 h-full flex flex-col items-center justify-center text-center space-y-3">
          {/* Slot indicator */}
          <div className="w-12 h-12 rounded-full border-2 border-dashed border-slate-500 flex items-center justify-center">
            <span className="text-slate-400 font-medium">{slotNumber}</span>
          </div>
          
          <div className="space-y-1">
            <h3 className="text-sm font-medium text-slate-400">Project Slot {slotNumber}</h3>
            <p className="text-xs text-slate-500">
              Available for your next project
            </p>
          </div>

          <Badge variant="outline" className="border-slate-600 text-slate-400 text-xs">
            Solo Plan
          </Badge>
        </CardContent>
      </Card>
    </motion.div>
  );
}