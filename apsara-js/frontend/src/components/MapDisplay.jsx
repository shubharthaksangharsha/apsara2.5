import React, { useEffect, useState, useRef } from 'react';
import { APIProvider, Map, AdvancedMarker, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
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
    // Load the 'routes' library explicitly, needed for Polyline and LatLngBounds
    const routesLibrary = useMapsLibrary('routes');
    const polylineRef = useRef(null); // Use ref to store the polyline instance

    useEffect(() => {
        // Ensure map instance and the necessary routes library are loaded
        if (!map || !routesLibrary || !mapData) {
            console.log("[MapDisplay] Waiting for map instance or routes library or mapData...");
            return;
        }

        console.log("[MapDisplay] Map instance and routes library loaded. Processing mapData:", mapData);

        // Clear existing polyline if data is not a route or is null/undefined
        if (mapData.type !== 'route' || !mapData.polyline) {
             if (polylineRef.current) {
                console.log("[MapDisplay] Removing existing polyline.");
                polylineRef.current.setMap(null); 
                polylineRef.current = null; 
             }
        }

        // Handle Route Data
        if (mapData.type === 'route') {
             // Fit Bounds
             if (mapData.bounds?.northeast && mapData.bounds?.southwest) {
                 try {
                     const bounds = new routesLibrary.LatLngBounds( // Use library object
                         mapData.bounds.southwest, // API uses {lat, lng} directly
                         mapData.bounds.northeast
                     );
                     console.log("[MapDisplay] Fitting bounds:", bounds.toJSON());
                     map.fitBounds(bounds, 60); // Increased padding slightly
                 } catch (e) {
                     console.error("[MapDisplay] Error fitting bounds:", e);
                     if(mapData.originCoords) map.setCenter(mapData.originCoords); // Fallback center
                 }
             } else if (mapData.originCoords) {
                 console.log("[MapDisplay] No bounds, centering on origin:", mapData.originCoords);
                 map.setCenter(mapData.originCoords);
                 map.setZoom(12); // Default zoom if no bounds
             }

             // Draw Polyline
             if (mapData.polyline) {
                 try {
                     const decodedPath = decodePolyline(mapData.polyline);
                     if (!polylineRef.current) {
                         polylineRef.current = new routesLibrary.Polyline({ // Use library object
                             path: decodedPath,
                             geodesic: true,
                             strokeColor: '#4285F4', // Google Maps blue
                             strokeOpacity: 0.8,
                             strokeWeight: 4, // Slightly thicker
                             map: map, 
                         });
                         console.log("[MapDisplay] Polyline created with path length:", decodedPath.length);
                     } else {
                         polylineRef.current.setPath(decodedPath);
                         if (!polylineRef.current.getMap()) { // Ensure it's on the map
                             polylineRef.current.setMap(map);
                         }
                         console.log("[MapDisplay] Polyline path updated with length:", decodedPath.length);
                     }
                 } catch(e) {
                     console.error("[MapDisplay] Error decoding or drawing polyline:", e);
                 }
            }
        } 
        // --- Add logic for other mapData types if needed ---
        else if (mapData.type === 'places' && mapData.markers?.length > 0) {
             // Example: center on first marker
             map.setCenter(mapData.markers[0]); 
             map.setZoom(13);
             console.log("[MapDisplay] Centering on first place marker.");
        } else if (mapData.type === 'single_location' && mapData.center) {
             map.setCenter(mapData.center);
             map.setZoom(15);
              console.log("[MapDisplay] Centering on single location.");
        }

    }, [map, routesLibrary, mapData]); // Re-run when map, library, or data changes

    if (!mapData) return null;

    // Render Markers
    return (
        <>
            {mapData.type === 'route' && (
                <>
                    {mapData.originCoords && <AdvancedMarker position={mapData.originCoords} title="Origin">📍</AdvancedMarker>}
                    {mapData.destinationCoords && <AdvancedMarker position={mapData.destinationCoords} title="Destination">🏁</AdvancedMarker>}
                </>
            )}
            {/* Add marker rendering logic for other types if needed */}
        </>
    );
}


export default function MapDisplay({ mapData }) {
    if (!API_KEY) {
        return <div className="p-4 text-red-500 bg-red-100 dark:bg-red-900/30 rounded h-full flex items-center justify-center">Map display requires API Key configuration.</div>;
    }
    
    // Provide a default center in case mapData is initially null or invalid for centering
    const defaultCenter = { lat: 51.5074, lng: -0.1278 }; // Default to London
    const center = mapData?.originCoords || mapData?.center || defaultCenter;
    const zoom = mapData ? 12 : 9; // Start more zoomed out if no specific data yet

    console.log("[MapDisplay] Rendering Map. Initial Center:", center, "Data:", mapData); // Log on render

    return (
        <div className="h-full w-full border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden shadow-md bg-gray-200 dark:bg-gray-800">
             <APIProvider apiKey={API_KEY}>
                <Map
                    mapId={'apsara-map-live'} // Unique ID
                    style={{ width: '100%', height: '100%' }}
                    center={center} // Use controlled center
                    zoom={zoom}     // Use controlled zoom
                    gestureHandling={'greedy'}
                    disableDefaultUI={true}
                >
                   {/* Pass mapData only if it exists */}
                   {mapData && <MapViewUpdater mapData={mapData} />}
                </Map>
            </APIProvider>
        </div>
    );
} 