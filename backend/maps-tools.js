// backend/maps-tools.js
import fetch from 'node-fetch'; // Or use axios or native fetch

// --- Tool Schemas for Maps ---

export const getGoogleMapsRouteSchema = {
  name: 'getGoogleMapsRoute',
  description: 'Gets travel duration, distance, and route details between two locations using Google Maps.',
  parameters: {
    type: 'OBJECT',
    properties: {
      origin: { type: 'STRING', description: 'The starting address, place name, or coordinates (lat,lng).' },
      destination: { type: 'STRING', description: 'The destination address, place name, or coordinates (lat,lng).' },
      travelMode: { type: 'STRING', enum: ['DRIVING', 'WALKING', 'BICYCLING', 'TRANSIT'], description: 'Optional. The mode of travel. Defaults to DRIVING.' }
    },
    // required: ['origin', 'destination']
  }
};

// --- Tool Handlers for Maps ---

export async function handleGetGoogleMapsRoute({ origin, destination, travelMode = 'DRIVING' }) {
  if (!origin || !destination) {
    return { status: 'error', message: 'Origin and destination are required to get a Google Maps route.' };
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  // --- ADD LOG ---
  const apiKeySnippet = apiKey ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}` : 'Not Found!';
  console.log(`[MapsTool: getRoute] Using API Key Snippet: ${apiKeySnippet}`);
  // --- END LOG ---

  if (!apiKey) {
    console.error("[MapsTool: getRoute] Google Maps API key not found in process.env.GOOGLE_MAPS_API_KEY.");
    return { status: 'error', message: 'Google Maps API key not configured in server .env file.' };
  }

  console.log(`[MapsTool: getRoute] Request: From: "${origin}", To: "${destination}", Mode: ${travelMode}`);

  const params = new URLSearchParams({
    origin,
    destination,
    mode: travelMode.toLowerCase(),
    key: apiKey
  });
  const url = `https://maps.googleapis.com/maps/api/directions/json?${params.toString()}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      let errorBody = `HTTP error ${response.status}`;
      try { errorBody = await response.text(); } catch(_) {}
      throw new Error(`Failed to fetch directions: ${response.status} ${response.statusText}. Body: ${errorBody}`);
    }
    const data = await response.json();

    if (data.status === 'OK' && data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      const leg = route.legs[0];

      // Prepare structured data for map display AND AI response
      const resultForAI = { // Data primarily for the AI to summarize
        status: 'success',
        origin_address: leg.start_address,
        destination_address: leg.end_address,
        travel_mode: travelMode,
        distance: leg.distance.text,
        duration: leg.duration.text,
        duration_in_traffic: leg.duration_in_traffic ? leg.duration_in_traffic.text : undefined,
        summary: route.summary,
      };

      // ADD specific data for the frontend map component
      resultForAI._mapDisplayData = {
        type: 'route',
        originCoords: leg.start_location, // {lat: ..., lng: ...}
        destinationCoords: leg.end_location, // {lat: ..., lng: ...}
        bounds: route.bounds, // {northeast: {lat:..., lng:...}, southwest: {...}}
        polyline: route.overview_polyline.points, // Encoded polyline string
        maps_link: `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=${travelMode.toLowerCase()}`
      };

      // --- ADD LOG HERE ---
      console.log("[MapsTool: getRoute] Populated _mapDisplayData:", JSON.stringify(resultForAI._mapDisplayData));
      // --- END ADD ---

      return resultForAI; // Return the combined object

    } else if (data.status === 'ZERO_RESULTS') {
      return { status: 'success', message: `No route could be found between "${origin}" and "${destination}" by ${travelMode}.` };
    } else {
      console.error('[MapsTool: getRoute] Google Maps API Error:', data.status, data.error_message);
      return { status: 'error', message: data.error_message || `Google Maps API Error: ${data.status}` };
    }
  } catch (error) {
    console.error('[MapsTool: getRoute] Error fetching or processing Google Maps route:', error);
    return { status: 'error', message: `Failed to get route: ${error.message}` };
  }
}

// --- Export all schemas and handlers ---
export const mapsToolSchemas = [
  getGoogleMapsRouteSchema,
  // Add more maps schemas here
];

export const mapsToolHandlers = {
  getGoogleMapsRoute: handleGetGoogleMapsRoute,
  // Add more maps handlers here
};