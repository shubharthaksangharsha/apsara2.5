import React from 'react';
import { PARTICLES_CONTAINER_CLASS, NUM_PARTICLES } from '../constants';

/**
 * Component that renders animated light particles around the logo
 * 
 * @returns {JSX.Element} LightParticles component
 */
export default function LightParticles() {
  return (
    <div className={PARTICLES_CONTAINER_CLASS}>
      {[...Array(NUM_PARTICLES)].map((_, i) => (
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
  );
} 