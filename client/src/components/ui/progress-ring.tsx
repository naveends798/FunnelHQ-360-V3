import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface ProgressRingProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  className?: string;
  showValue?: boolean;
  showLabel?: boolean;
  label?: string;
  color?: string;
  animate?: boolean;
  duration?: number;
  children?: React.ReactNode;
}

export function ProgressRing({
  progress,
  size = 120,
  strokeWidth = 8,
  className,
  showValue = true,
  showLabel = false,
  label,
  color = "url(#progressGradient)",
  animate = true,
  duration = 1.5,
  children,
}: ProgressRingProps) {
  const [animatedProgress, setAnimatedProgress] = useState(0);
  
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (animatedProgress / 100) * circumference;

  useEffect(() => {
    if (animate) {
      const timer = setTimeout(() => {
        setAnimatedProgress(progress);
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setAnimatedProgress(progress);
    }
  }, [progress, animate]);

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="50%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#d946ef" />
          </linearGradient>
          <linearGradient id="successGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
          <linearGradient id="warningGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
          <linearGradient id="dangerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#dc2626" />
          </linearGradient>
        </defs>
        
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-slate-700/30"
        />
        
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          initial={animate ? { strokeDashoffset: circumference } : {}}
          animate={animate ? { 
            strokeDashoffset: circumference - (progress / 100) * circumference 
          } : {}}
          transition={animate ? { duration, ease: "easeOut" } : {}}
          className="drop-shadow-lg"
        />
        
        {/* Glow effect */}
        {progress > 0 && (
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth / 2}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            initial={animate ? { strokeDashoffset: circumference, opacity: 0 } : {}}
            animate={animate ? { 
              strokeDashoffset: circumference - (progress / 100) * circumference,
              opacity: 0.3
            } : {}}
            transition={animate ? { duration, ease: "easeOut" } : {}}
            className="blur-sm"
          />
        )}
      </svg>
      
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {children ? (
          children
        ) : (
          <>
            {showValue && (
              <motion.span
                className="text-2xl font-bold text-white"
                initial={animate ? { opacity: 0, scale: 0.5 } : {}}
                animate={{ opacity: 1, scale: 1 }}
                transition={animate ? { delay: duration * 0.5, duration: 0.5 } : {}}
              >
                {Math.round(animatedProgress)}%
              </motion.span>
            )}
            {showLabel && label && (
              <motion.span
                className="text-xs text-slate-400 mt-1 text-center"
                initial={animate ? { opacity: 0 } : {}}
                animate={{ opacity: 1 }}
                transition={animate ? { delay: duration * 0.7, duration: 0.3 } : {}}
              >
                {label}
              </motion.span>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Preset variants for common use cases
export function ProjectProgressRing({ progress, className }: { progress: number; className?: string }) {
  return (
    <ProgressRing
      progress={progress}
      size={100}
      strokeWidth={6}
      color="url(#progressGradient)"
      showLabel={true}
      label="Complete"
      className={className}
    />
  );
}

export function RevenueGoalRing({ current, target, className }: { current: number; target: number; className?: string }) {
  const progress = Math.min((current / target) * 100, 100);
  const isComplete = progress >= 100;
  
  return (
    <ProgressRing
      progress={progress}
      size={140}
      strokeWidth={8}
      color={isComplete ? "url(#successGradient)" : "url(#progressGradient)"}
      showValue={false}
      className={className}
    >
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold text-white">
          ${Math.round(current / 1000)}K
        </span>
        <span className="text-xs text-slate-400">of ${Math.round(target / 1000)}K</span>
        {isComplete && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 1, type: "spring" }}
            className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center"
          >
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </motion.div>
        )}
      </div>
    </ProgressRing>
  );
}