import React, { useEffect, useState, useRef } from 'react';
import { APIProvider, Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import { Loader } from '@googlemaps/js-api-loader'; // Optional: use loader directly if needed

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// Helper to decode Google's encoded polyline format
function decodePolyline(encoded) {
    if (!encoded) return [];
    let points = [];
    let index = 0, len = encoded.length;
    let lat = 0, lng = 0;

    while (index < len) {
        let b, shift = 0, result = 0;
        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        let dlat = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
        lat += dlat;

        shift = 0;
        result = 0;
        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        let dlng = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
        lng += dlng;

        points.push({ lat: lat / 1e5, lng: lng / 1e5 });
    }
    return points;
}

// Internal component to handle map adjustments and polyline drawing
function MapViewUpdater({ mapData }) {
    const map = useMap();
    const polylineRef = useRef(null); // Use ref to store the polyline instance

    useEffect(() => {
        if (!map || !mapData) return;

        if (mapData.type === 'route' && mapData.bounds) {
            const { northeast, southwest } = mapData.bounds;
            if (northeast && southwest) {
                try {
                     if (window.google && window.google.maps && window.google.maps.LatLngBounds) {
                         const bounds = new window.google.maps.LatLngBounds(
                            { lat: southwest.lat, lng: southwest.lng },
                            { lat: northeast.lat, lng: northeast.lng }
                         );
                         console.log("[MapDisplay] Fitting bounds:", bounds.toJSON());
                         map.fitBounds(bounds, 50); // Add padding
                     } else {
                        console.warn("[MapDisplay] google.maps.LatLngBounds not available yet.");
                        if(mapData.originCoords) map.setCenter(mapData.originCoords);
                     }
                } catch (e) {
                     console.error("[MapDisplay] Error fitting bounds:", e);
                     if(mapData.originCoords) map.setCenter(mapData.originCoords);
                }
            } else if (mapData.originCoords) {
                map.setCenter(mapData.originCoords);
                map.setZoom(12);
            }
        } else if (mapData.type === 'places' && mapData.markers?.length > 0) {
            // Logic to fit bounds for multiple markers if implemented later
            map.setCenter(mapData.markers[0]); // Center on first marker
            map.setZoom(13);
        } else if (mapData.type === 'single_location' && mapData.center) {
            map.setCenter(mapData.center);
            map.setZoom(15);
        }

    }, [map, mapData]); // Re-run when map instance or data changes

    // Effect for drawing/updating the polyline
    useEffect(() => {
        if (!map) return; // Need map instance

        // Check if we have polyline data and the Maps API is loaded
        if (mapData?.type === 'route' && mapData.polyline && window.google?.maps?.Polyline) {
            const decodedPath = decodePolyline(mapData.polyline);

            if (!polylineRef.current) {
                // Create new polyline instance if it doesn't exist
                polylineRef.current = new window.google.maps.Polyline({
                    path: decodedPath,
                    geodesic: true,
                    strokeColor: '#FF0000', // Red color
                    strokeOpacity: 0.8,
                    strokeWeight: 3,
                    map: map, // Add it to the map immediately
                });
                console.log("[MapDisplay] Polyline created.");
            } else {
                // Update path if instance already exists
                polylineRef.current.setPath(decodedPath);
                 // Ensure it's on the map (might have been removed)
                if (!polylineRef.current.getMap()) {
                    polylineRef.current.setMap(map);
                }
                console.log("[MapDisplay] Polyline path updated.");
            }
        } else {
            // If no polyline data or type is not 'route', remove existing polyline
            if (polylineRef.current) {
                polylineRef.current.setMap(null); // Remove from map
                polylineRef.current = null; // Clear the ref
                console.log("[MapDisplay] Polyline removed.");
            }
        }

        // Cleanup function for when component unmounts or dependencies change
        return () => {
            // This cleanup runs BEFORE the next effect execution or on unmount
            // If the effect is re-running because mapData changed to NOT be a route,
            // the 'else' block above handles removal. This is extra safety on unmount.
            // if (polylineRef.current) {
            //     polylineRef.current.setMap(null);
            // }
            // Let the main effect logic handle removal based on mapData type.
        };
    }, [map, mapData]); // Depend on map instance and mapData

    if (!mapData) return null;

    // Render only markers here, polyline is handled via the effect
    return (
        <>
            {mapData.type === 'route' && (
                <>
                    {mapData.originCoords && <AdvancedMarker position={mapData.originCoords} title="Origin" />}
                    {mapData.destinationCoords && <AdvancedMarker position={mapData.destinationCoords} title="Destination" />}
                    {/* Polyline is now drawn directly using the JS API, not as a React component */}
                </>
            )}
            {/* Add rendering logic for other types ('places', 'single_location') if needed */}
        </>
    );
}


export default function MapDisplay({ mapData }) {
    // Simple conditional rendering based on mapData presence
    if (!mapData) {
        return null; // Don't render anything if there's no map data
    }

    if (!API_KEY) {
        console.error("Google Maps API Key (VITE_GOOGLE_MAPS_API_KEY) is missing!");
        return <div className="p-4 text-red-500 bg-red-100 dark:bg-red-900/30 rounded">Map display requires API Key configuration.</div>;
    }

    // Determine initial center (fallback needed if data is incomplete)
    const initialCenter = mapData?.originCoords || mapData?.center || { lat: 51.5074, lng: -0.1278 }; // Default to London
    const initialZoom = mapData?.type === 'route' ? 10 : 14; // Adjust default zoom

    return (
        <div className="h-full w-full border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden shadow-md">
             <APIProvider apiKey={API_KEY} > {/* Removed libraries prop, not strictly needed for this approach */}
                <Map
                    mapId={'apsara-map'}
                    style={{ width: '100%', height: '100%' }}
                    defaultCenter={initialCenter}
                    defaultZoom={initialZoom}
                    gestureHandling={'greedy'}
                    disableDefaultUI={true}
                >
                   <MapViewUpdater mapData={mapData} />
                </Map>
            </APIProvider>
        </div>
    );
} 