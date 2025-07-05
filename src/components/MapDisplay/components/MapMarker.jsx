import React, { useEffect, useState } from 'react';

/**
 * Component for displaying a marker on the map.
 * This is a wrapper around the Google Maps Marker API.
 * 
 * @param {Object} props - Component props
 * @param {Object} props.map - The Google Map instance
 * @param {Object} props.position - The marker position {lat, lng}
 * @param {string} props.title - The marker title (shown on hover)
 * @param {string} props.label - Optional label to show on the marker
 * @param {Object} props.icon - Optional custom icon configuration
 * @param {Function} props.onClick - Optional click handler
 * @returns {null} This component doesn't render anything visible in React
 */
export default function MapMarker({ map, position, title, label, icon, onClick }) {
  const [marker, setMarker] = useState(null);

  useEffect(() => {
    if (!map) return;

    // Create the marker instance
    const newMarker = new window.google.maps.Marker({
      position,
      map,
      title,
      label,
      icon
    });

    // Add click listener if provided
    if (onClick) {
      newMarker.addListener('click', () => onClick(newMarker));
    }

    // Store the marker instance
    setMarker(newMarker);

    // Clean up on unmount
    return () => {
      if (newMarker) {
        window.google.maps.event.clearInstanceListeners(newMarker);
        newMarker.setMap(null);
      }
    };
  }, [map]); // Only recreate marker if map instance changes

  // Update marker if position or other props change
  useEffect(() => {
    if (!marker) return;

    // Update position if it changed
    if (position) {
      marker.setPosition(position);
    }

    // Update title if it changed
    if (title) {
      marker.setTitle(title);
    }

    // Update label if it changed
    if (label) {
      marker.setLabel(label);
    }

    // Update icon if it changed
    if (icon) {
      marker.setIcon(icon);
    }
  }, [marker, position, title, label, icon]);

  // This component doesn't render anything visible in React
  return null;
} 