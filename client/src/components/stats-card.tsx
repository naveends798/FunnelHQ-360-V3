import { Card, CardContent } from "@/components/ui/card";
import { cn, formatCurrency } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import { 
  Rocket, 
  Users, 
  DollarSign, 
  Clock,
  TrendingUp,
  TrendingDown,
  Target,
  AlertTriangle
} from "lucide-react";

interface StatsCardProps {
  title: string;
  value: number;
  change: string;
  icon: string;
  gradient: string;
  isCurrency?: boolean;
  loading?: boolean;
  target?: number; // For progress visualization
  showProgress?: boolean;
  urgent?: boolean; // For urgent tasks highlighting
}

const iconMap = {
  rocket: Rocket,
  users: Users,
  "dollar-sign": DollarSign,
  clock: Clock,
  target: Target,
  "alert-triangle": AlertTriangle,
};

// Hook for count-up animation
function useCountUp(end: number, duration: number = 2000) {
  const [count, setCount] = useState(0);
  const countRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(countRef, { once: true });

  useEffect(() => {
    if (!isInView) return;

    let startTime: number;
    const startValue = 0;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(startValue + (end - startValue) * easeOutQuart));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [end, duration, isInView]);

  return { count, ref: countRef };
}

export default function StatsCard({ 
  title, 
  value, 
  change, 
  icon, 
  gradient, 
  isCurrency = false,
  loading = false,
  target,
  showProgress = false,
  urgent = false
}: StatsCardProps) {
  const Icon = iconMap[icon as keyof typeof iconMap] || Rocket;
  const isPositive = change.startsWith("+");
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;
  const { count, ref } = useCountUp(value);

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="glass border-white/10 p-6 h-[200px]">
          <CardContent className="p-0 h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <Skeleton className="w-12 h-12 rounded-xl" />
                <Skeleton className="w-12 h-4" />
              </div>
              <Skeleton className="w-16 h-8 mb-1" />
            </div>
            <Skeleton className="w-24 h-4" />
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  const displayValue = isCurrency ? formatCurrency(count) : count.toLocaleString();
  const progressPercentage = target ? Math.min((value / target) * 100, 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      whileHover={{ scale: 1.02, y: -4 }}
      className="group"
    >
      <Card className={cn(
        "glass border-white/10 p-6 transition-all duration-300",
        "hover:shadow-2xl hover:shadow-primary/20",
        "relative overflow-hidden h-[200px]",
        urgent && "ring-1 ring-red-900/60 border-red-900/40"
      )}>
        {/* Background glow effect */}
        <div className={cn(
          "absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-300 blur-xl",
          gradient
        )} />
        
        <CardContent className="p-0 relative z-10 h-full flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <motion.div 
                className={cn("w-12 h-12 rounded-xl flex items-center justify-center", gradient)}
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.6 }}
              >
                <Icon className="text-white h-5 w-5" />
              </motion.div>
              
              <motion.div 
                className={cn(
                  "flex items-center space-x-1 text-sm font-medium px-2 py-1 rounded-full",
                  isPositive 
                    ? "text-green-400 bg-green-400/10" 
                    : "text-red-400 bg-red-400/10"
                )}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <TrendIcon className="h-3 w-3" />
                <span>{change}</span>
              </motion.div>
            </div>
            
            <div ref={ref} className="mb-2">
              <motion.h3 
                className="text-3xl font-bold text-white mb-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                {displayValue}
              </motion.h3>
            </div>
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-slate-400 text-sm">{title}</p>
              {urgent && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.7, type: "spring" }}
                >
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                </motion.div>
              )}
            </div>

            {/* Progress bar for goals */}
            {showProgress && target && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
              >
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span>Progress to goal</span>
                  <span>{Math.round(progressPercentage)}%</span>
                </div>
                <div className="w-full bg-slate-700/50 rounded-full h-2">
                  <motion.div
                    className={cn("h-2 rounded-full", gradient)}
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercentage}%` }}
                    transition={{ delay: 1, duration: 1.5, ease: "easeOut" }}
                  />
                </div>
              </motion.div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
