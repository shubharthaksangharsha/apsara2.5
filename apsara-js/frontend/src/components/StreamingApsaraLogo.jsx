import React from "react";
import apsaraLogoAsset from '../../assets/image.png';

export default function StreamingApsaraLogo({ isVisible }) {
  if (!isVisible) return null;

  return (
    <div className="flex items-center justify-start py-3 my-2 w-full">
      <div className="relative flex items-center flex-shrink-0">
        {/* Celestial aura/glow effect */}
        <div 
          className="absolute inset-0 rounded-full blur-lg opacity-40 animate-celestialGlow"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(236, 72, 153, 0.4) 0%, rgba(192, 132, 252, 0.5) 40%, rgba(252, 211, 77, 0.3) 70%, transparent 100%)',
            transform: 'scale(1.6)'
          }}
        ></div>
        
        {/* Secondary inner glow */}
        <div 
          className="absolute inset-0 rounded-full blur-md opacity-30 animate-innerLight"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255, 255, 255, 0.8) 0%, rgba(236, 72, 153, 0.3) 50%, transparent 100%)',
            transform: 'scale(1.2)'
          }}
        ></div>
        
        {/* Light particles around logo */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <div 
              key={i}
              className={`absolute w-1 h-1 bg-white rounded-full animate-particle opacity-70 particle-${i+1}`}
              style={{
                top: `${10 + Math.random() * 80}%`,
                left: `${10 + Math.random() * 80}%`,
                animationDelay: `${i * 0.4}s`
              }}
            />
          ))}
        </div>
        
        {/* Actual Logo with Graceful Dance Animation */}
        <div className="animate-gracefulDance">
          <img
            src={apsaraLogoAsset}
            alt="Apsara Thinking"
            className="w-12 h-12 mr-3 relative z-10"
          />
        </div>
      </div>
      <div className="text-sm font-medium animate-textFade">
        <span className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 bg-clip-text text-transparent">
          Apsara is creating<span className="streaming-dots-animation">...</span>
        </span>
      </div>
    </div>
  );
} 