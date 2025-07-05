import React, { useEffect } from 'react';
import MapDisplay from '../../MapDisplay'; // Assuming this is the path to the MapDisplay component

/**
 * MapTab component that displays map data
 * 
 * @param {Object} props - Component props
 * @param {Object} props.mapDisplayData - Map data for display
 * @returns {JSX.Element} MapTab component
 */
const MapTab = ({ mapDisplayData }) => {
  // Log data when the map tab renders
  useEffect(() => {
    console.log("[LivePopup] Rendering Map tab. Current mapDisplayData:", mapDisplayData);
  }, [mapDisplayData]);

  return (
    <div className="w-full h-full rounded-md overflow-hidden border-2 border-dashed border-red-500 dark:border-red-400 bg-red-100 dark:bg-red-900/20 flex flex-col">
      <p className="flex-shrink-0 p-1 text-xs text-red-700 dark:text-red-200">Map Container Area</p>
      <div className="flex-grow min-h-[200px] sm:min-h-0 border-t border-red-400"> {/* Min height for mobile visibility */}
        {mapDisplayData ? (
          <>
            <p className="flex-shrink-0 p-1 text-xs text-green-700 dark:text-green-200 bg-green-100 dark:bg-green-900/30">
              MapDisplay component should render below:
            </p>
            <div className="w-full h-full">
              <MapDisplay 
                key={JSON.stringify(mapDisplayData.bounds || mapDisplayData.center || Date.now())} 
                mapData={mapDisplayData} 
              />
            </div>
          </>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-sm p-4 text-center flex items-center justify-center h-full">
            Map data will appear here when available.
          </p>
        )}
      </div>
    </div>
  );
};

export default MapTab; 