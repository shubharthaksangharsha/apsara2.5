// services/google/maps/schemas.js
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
    }
  };
  
  export const mapsToolSchemas = [
    getGoogleMapsRouteSchema,
    // Add more maps schemas here
  ];