import React from "react";
import apsaraLogoAsset from '../../assets/image.png';

export default function StreamingApsaraLogo({ isVisible }) {
  if (!isVisible) return null;

  return (
    <div className="flex items-center justify-start py-3 my-2 opacity-90 w-full">
      <div className="relative flex items-center flex-shrink-0">
        {/* Glow effect around the logo */}
        <div 
          className="absolute inset-0 rounded-full blur-md opacity-30 animate-subtlePulse"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(192, 132, 252, 0.6) 0%, rgba(236, 72, 153, 0.3) 50%, rgba(252, 211, 77, 0.2) 80%, transparent 100%)',
            transform: 'scale(1.4)'
          }}
        ></div>
        
        {/* Actual Logo with Float Animation */}
        <img
          src={apsaraLogoAsset}
          alt="Apsara Thinking"
          className="w-10 h-10 mr-3 relative z-10 animate-subtleFloat"
        />
      </div>
      <div className="text-sm text-gray-600 dark:text-gray-300 font-medium">
        Apsara is thinking<span className="streaming-dots-animation">...</span>
      </div>
    </div>
  );
} 