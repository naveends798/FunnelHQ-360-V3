import { useEffect } from "react";

// Mobile optimizations and touch enhancements
export default function MobileOptimizations() {
  useEffect(() => {
    // Prevent zoom on double tap for iOS Safari
    let lastTouchEnd = 0;
    document.addEventListener('touchend', function (event) {
      const now = (new Date()).getTime();
      if (now - lastTouchEnd <= 300) {
        event.preventDefault();
      }
      lastTouchEnd = now;
    }, false);

    // Prevent default touch behaviors for better performance
    document.addEventListener('touchstart', function(e) {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    }, { passive: false });

    // Add viewport meta tag if not present
    let viewportMeta = document.querySelector('meta[name="viewport"]');
    if (!viewportMeta) {
      viewportMeta = document.createElement('meta');
      viewportMeta.setAttribute('name', 'viewport');
      document.getElementsByTagName('head')[0].appendChild(viewportMeta);
    }
    viewportMeta.setAttribute('content', 'width=device-width, initial-scale=1.0, user-scalable=no, viewport-fit=cover');

    // Add mobile-specific CSS classes
    document.body.classList.add('mobile-optimized');
    
    // Add CSS for mobile optimizations
    const style = document.createElement('style');
    style.textContent = `
      .mobile-optimized {
        -webkit-text-size-adjust: 100%;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        overscroll-behavior-y: none;
      }
      
      @media (max-width: 768px) {
        /* Better touch targets */
        button, [role="button"], a {
          min-height: 44px;
          min-width: 44px;
        }
        
        /* Improved scrolling */
        .overflow-auto, .overflow-y-auto {
          -webkit-overflow-scrolling: touch;
        }
        
        /* Better form inputs */
        input, textarea, select {
          font-size: 16px; /* Prevents zoom on iOS */
        }
        
        /* Card hover effects only on larger screens */
        .hover\\:shadow-md {
          transition: none;
        }
      }
      
      /* Loading spinner optimization */
      @media (prefers-reduced-motion: reduce) {
        *, *::before, *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.body.classList.remove('mobile-optimized');
    };
  }, []);

  return null; // This component doesn't render anything
}