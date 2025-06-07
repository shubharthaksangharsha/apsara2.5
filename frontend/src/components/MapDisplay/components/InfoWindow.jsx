import React, { useEffect, useState } from 'react';

/**
 * Component for displaying an info window on the map.
 * This is a wrapper around the Google Maps InfoWindow API.
 * 
 * @param {Object} props - Component props
 * @param {Object} props.map - The Google Map instance
 * @param {Object} props.position - The info window position {lat, lng}
 * @param {Object} props.marker - Optional marker to attach to (instead of position)
 * @param {string} props.content - HTML content to display in the info window
 * @param {boolean} props.isOpen - Whether the info window is open
 * @param {Function} props.onClose - Handler for when the info window is closed
 * @returns {null} This component doesn't render anything visible in React
 */
export default function InfoWindow({ 
  map, 
  position, 
  marker, 
  content, 
  isOpen, 
  onClose 
}) {
  const [infoWindow, setInfoWindow] = useState(null);

  // Create the info window instance
  useEffect(() => {
    if (!map) return;

    const newInfoWindow = new window.google.maps.InfoWindow({
      content,
      position
    });

    // Add close listener if provided
    if (onClose) {
      newInfoWindow.addListener('closeclick', onClose);
    }

    // Store the info window instance
    setInfoWindow(newInfoWindow);

    // Clean up on unmount
    return () => {
      if (newInfoWindow) {
        window.google.maps.event.clearInstanceListeners(newInfoWindow);
        newInfoWindow.close();
      }
    };
  }, [map]); // Only recreate info window if map instance changes

  // Handle opening and closing the info window
  useEffect(() => {
    if (!infoWindow) return;

    if (isOpen) {
      if (marker) {
        infoWindow.open(map, marker);
      } else if (position) {
        infoWindow.setPosition(position);
        infoWindow.open(map);
      }
    } else {
      infoWindow.close();
    }
  }, [infoWindow, isOpen, map, marker, position]);

  // Update content if it changes
  useEffect(() => {
    if (!infoWindow || !content) return;
    infoWindow.setContent(content);
  }, [infoWindow, content]);

  // Update position if it changes
  useEffect(() => {
    if (!infoWindow || !position || marker) return;
    infoWindow.setPosition(position);
  }, [infoWindow, position, marker]);

  // This component doesn't render anything visible in React
  return null;
} 