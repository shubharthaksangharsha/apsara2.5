import React, { useEffect, useRef, useState } from 'react';
import { Loader } from 'lucide-react';
import { 
  DEFAULT_ZOOM, 
  DEFAULT_CENTER, 
  DEFAULT_MAP_TYPE,
  CONTAINER_CLASS,
  MAP_CLASS,
  MAP_OPTIONS,
  API_STATUS
} from './constants';

/**
 * Component for displaying an interactive Google Map.
 * 
 * @param {Object} props - Component props
 * @param {Object} props.center - The map center coordinates {lat, lng}
 * @param {number} props.zoom - The map zoom level
 * @param {string} props.mapType - The map type (roadmap, satellite, hybrid, terrain)
 * @param {Array} props.children - Child components (Markers, InfoWindows, etc.)
 * @param {Function} props.onMapLoad - Handler called when map is loaded
 * @param {Function} props.onBoundsChanged - Handler called when map bounds change
 * @param {Function} props.onClick - Handler called when map is clicked
 * @param {string} props.apiKey - Google Maps API key
 * @returns {JSX.Element} MapDisplay component
 */
export default function MapDisplay({
  center = DEFAULT_CENTER,
  zoom = DEFAULT_ZOOM,
  mapType = DEFAULT_MAP_TYPE,
  children,
  onMapLoad,
  onBoundsChanged,
  onClick,
  apiKey
}) {
  const mapRef = useRef(null);
  const mapContainerRef = useRef(null);
  const [apiStatus, setApiStatus] = useState(API_STATUS.IDLE);
  const [mapInstance, setMapInstance] = useState(null);

  // Load the Google Maps API
  useEffect(() => {
    if (window.google?.maps || apiStatus === API_STATUS.LOADING) {
      return;
    }

    const loadGoogleMapsApi = () => {
      setApiStatus(API_STATUS.LOADING);
      console.log('[MapDisplay] Loading Google Maps API...');

      // Create script element
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;

      // Handle script load success
      script.onload = () => {
        console.log('[MapDisplay] Google Maps API loaded successfully');
        setApiStatus(API_STATUS.SUCCESS);
      };

      // Handle script load error
      script.onerror = () => {
        console.error('[MapDisplay] Failed to load Google Maps API');
        setApiStatus(API_STATUS.ERROR);
      };

      // Add script to document
      document.head.appendChild(script);
    };

    if (apiKey) {
      loadGoogleMapsApi();
    } else {
      console.error('[MapDisplay] No API key provided for Google Maps');
      setApiStatus(API_STATUS.ERROR);
    }
  }, [apiKey, apiStatus]);

  // Initialize the map once API is loaded
  useEffect(() => {
    if (apiStatus !== API_STATUS.SUCCESS || !mapContainerRef.current || mapInstance) {
      return;
    }

    console.log('[MapDisplay] Initializing map...');
    
    try {
      // Create map instance
      const map = new window.google.maps.Map(mapContainerRef.current, {
        center,
        zoom,
        mapTypeId: mapType,
        ...MAP_OPTIONS
      });

      // Store map instance
      mapRef.current = map;
      setMapInstance(map);

      // Add event listeners
      if (onBoundsChanged) {
        map.addListener('bounds_changed', () => {
          const bounds = map.getBounds();
          const center = map.getCenter();
          if (bounds && center) {
            onBoundsChanged({
              bounds: {
                north: bounds.getNorthEast().lat(),
                east: bounds.getNorthEast().lng(),
                south: bounds.getSouthWest().lat(),
                west: bounds.getSouthWest().lng()
              },
              center: {
                lat: center.lat(),
                lng: center.lng()
              },
              zoom: map.getZoom()
            });
          }
        });
      }

      if (onClick) {
        map.addListener('click', (event) => {
          onClick({
            lat: event.latLng.lat(),
            lng: event.latLng.lng()
          });
        });
      }

      // Call onMapLoad callback if provided
      if (onMapLoad) {
        onMapLoad(map);
      }

      console.log('[MapDisplay] Map initialized successfully');
    } catch (error) {
      console.error('[MapDisplay] Error initializing map:', error);
      setApiStatus(API_STATUS.ERROR);
    }

    // Clean up event listeners on unmount
    return () => {
      if (mapRef.current) {
        window.google.maps.event.clearInstanceListeners(mapRef.current);
      }
    };
  }, [apiStatus, center, mapType, zoom, onBoundsChanged, onClick, onMapLoad, mapInstance]);

  // Update map if center, zoom, or mapType change
  useEffect(() => {
    if (!mapRef.current) return;

    if (center) {
      mapRef.current.setCenter(center);
    }
    
    if (zoom) {
      mapRef.current.setZoom(zoom);
    }
    
    if (mapType) {
      mapRef.current.setMapTypeId(mapType);
    }
  }, [center, zoom, mapType]);

  // Render loading state
  if (apiStatus === API_STATUS.LOADING) {
    return (
      <div className={`${CONTAINER_CLASS} flex items-center justify-center bg-gray-100 dark:bg-gray-800`}>
        <div className="flex flex-col items-center">
          <Loader className="w-8 h-8 text-indigo-500 animate-spin mb-2" />
          <p className="text-sm text-gray-600 dark:text-gray-300">Loading map...</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (apiStatus === API_STATUS.ERROR) {
    return (
      <div className={`${CONTAINER_CLASS} flex items-center justify-center bg-gray-100 dark:bg-gray-800`}>
        <div className="text-center p-4">
          <p className="text-red-500 font-medium mb-2">Failed to load map</p>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Please check your internet connection and API key.
          </p>
        </div>
      </div>
    );
  }

  // Render map
  return (
    <div className={CONTAINER_CLASS}>
      <div ref={mapContainerRef} className={MAP_CLASS} />
      
      {/* Render children (markers, info windows, etc.) only when map is loaded */}
      {mapInstance && React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, { map: mapInstance });
        }
        return child;
      })}
    </div>
  );
} 