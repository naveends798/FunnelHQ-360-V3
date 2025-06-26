import React from 'react';

interface FunnelHQ360LogoProps {
  className?: string;
  size?: number;
}

export const FunnelHQ360Logo: React.FC<FunnelHQ360LogoProps> = ({ className = "", size = 48 }) => {
  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="transition-all duration-300 hover:scale-105"
      >
        {/* Gradient Definitions */}
        <defs>
          <linearGradient id="modernGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#06B6D4" />
          </linearGradient>
          <linearGradient id="accentGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#EF4444" />
          </linearGradient>
        </defs>

        {/* Modern Geometric Background */}
        <rect 
          x="4" 
          y="4" 
          width="40" 
          height="40" 
          rx="12" 
          fill="url(#modernGradient)"
          className="drop-shadow-lg"
        />
        
        {/* Inner Frame */}
        <rect 
          x="8" 
          y="8" 
          width="32" 
          height="32" 
          rx="8" 
          fill="none" 
          stroke="rgba(255,255,255,0.2)" 
          strokeWidth="1"
        />

        {/* Modern "F" Letter */}
        <g transform="translate(14, 12)">
          <path
            d="M0 0 L0 24 L4 24 L4 14 L16 14 L16 10 L4 10 L4 6 L18 6 L18 2 L4 2 L4 0 Z"
            fill="white"
            className="drop-shadow-sm"
          />
        </g>

        {/* Modern "360" Badge */}
        <g transform="translate(26, 28)">
          <rect 
            x="0" 
            y="0" 
            width="18" 
            height="8" 
            rx="4" 
            fill="url(#accentGradient)"
          />
          <text 
            x="9" 
            y="6" 
            fontSize="4" 
            fontWeight="600" 
            textAnchor="middle" 
            fill="white" 
            fontFamily="system-ui, -apple-system, sans-serif"
          >
            360
          </text>
        </g>

        {/* Subtle Accent Dots */}
        <circle cx="12" cy="12" r="1" fill="rgba(255,255,255,0.4)" />
        <circle cx="36" cy="36" r="1" fill="rgba(255,255,255,0.3)" />
      </svg>
    </div>
  );
};

export default FunnelHQ360Logo;

// Legacy export for backward compatibility
export const PortlHQLogo = FunnelHQ360Logo;