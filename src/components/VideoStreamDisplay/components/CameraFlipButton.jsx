import React from 'react';
import { Repeat } from 'lucide-react';
import { CAMERA_FLIP_BUTTON_CLASS, CAMERA_FLIP_BUTTON_ARIA_LABEL } from '../constants';

/**
 * Button component for switching between front and back cameras.
 * 
 * @param {Object} props - Component props
 * @param {Function} props.onClick - Handler for when the button is clicked
 * @param {boolean} props.disabled - Whether the button is disabled
 * @returns {JSX.Element} CameraFlipButton component
 */
export default function CameraFlipButton({ onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${CAMERA_FLIP_BUTTON_CLASS} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      title={CAMERA_FLIP_BUTTON_ARIA_LABEL}
      aria-label={CAMERA_FLIP_BUTTON_ARIA_LABEL}
    >
      <Repeat className="w-4 h-4" />
    </button>
  );
} 