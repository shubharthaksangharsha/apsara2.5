// services/tools/weather/schemas.js
export const getWeatherSchema = {
    name: 'getWeather',
    description: 'Gets the current weather information for a specified city.',
    parameters: {
      type: 'OBJECT',
      properties: {
        city: { type: 'STRING', description: 'The name of the city (e.g., "London"). This is essential.' },
        countryCode: { type: 'STRING', description: 'Optional. The two-letter ISO country code (e.g., "GB" for Great Britain) to make the city search more specific.' },
        units: { type: 'STRING', enum: ['metric', 'imperial'], description: 'Optional. Units for temperature. "metric" for Celsius, "imperial" for Fahrenheit. Defaults to metric.' }
      },
    }
  };
  
  export const weatherToolSchemas = [
    getWeatherSchema
  ];