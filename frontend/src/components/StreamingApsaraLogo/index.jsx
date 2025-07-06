import React from "react";
import apsaraLogoAsset from '../../../assets/image.png';
import LightParticles from './components/LightParticles';
import { 
  CONTAINER_CLASS,
  LOGO_WRAPPER_CLASS,
  CELESTIAL_AURA_CLASS,
  INNER_GLOW_CLASS,
  LOGO_ANIMATION_CLASS,
  LOGO_IMAGE_CLASS,
  TEXT_CLASS,
  GRADIENT_TEXT_CLASS,
  THINKING_TEXT
} from './constants';

/**
 * Component that displays an animated Apsara logo with a "thinking" indicator
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.isVisible - Whether the logo should be visible
 * @returns {JSX.Element|null} StreamingApsaraLogo component or null if not visible
 */
export default function StreamingApsaraLogo({ isVisible }) {
  if (!isVisible) return null;

  return (
    <div className={CONTAINER_CLASS}>
      <div className={LOGO_WRAPPER_CLASS}>
        {/* Celestial aura/glow effect */}
        <div 
          className={CELESTIAL_AURA_CLASS}
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(236, 72, 153, 0.4) 0%, rgba(192, 132, 252, 0.5) 40%, rgba(252, 211, 77, 0.3) 70%, transparent 100%)',
            transform: 'scale(1.6)'
          }}
        ></div>
        
        {/* Secondary inner glow */}
        <div 
          className={INNER_GLOW_CLASS}
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255, 255, 255, 0.8) 0%, rgba(236, 72, 153, 0.3) 50%, transparent 100%)',
            transform: 'scale(1.2)'
          }}
        ></div>
        
        {/* Light particles around logo */}
        <LightParticles />
        
        {/* Actual Logo with Graceful Dance Animation */}
        <div className={LOGO_ANIMATION_CLASS}>
          <img
            src={apsaraLogoAsset}
            alt="Apsara Thinking"
            className={LOGO_IMAGE_CLASS}
          />
        </div>
      </div>
      <div className={TEXT_CLASS}>
        <span className={GRADIENT_TEXT_CLASS}>
          {THINKING_TEXT}<span className="streaming-dots-animation">...</span>
        </span>
      </div>
    </div>
  );
} 