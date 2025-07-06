// services/tools/weather/handlers.js
import fetch from 'node-fetch';

/**
 * Gets weather information for a city
 */
export async function handleGetWeather({ city, countryCode, units = 'metric' }) {
  if (!city) {
    return { status: 'error', message: 'City is required to get weather information.' };
  }

  const apiKey = process.env.OPENWEATHERMAP_API_KEY;
  if (!apiKey) {
    console.error("[Tool: getWeather] OpenWeatherMap API key not found in process.env.OPENWEATHERMAP_API_KEY.");
    return { status: 'error', message: 'Weather service API key is not configured on the server.' };
  }

  let query = city;
  if (countryCode) {
    query += `,${countryCode}`;
  }

  const OWM_UNITS = (units === 'imperial') ? 'imperial' : 'metric'; // OpenWeatherMap uses 'metric' or 'imperial'
  const apiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(query)}&appid=${apiKey}&units=${OWM_UNITS}`;

  console.log(`[Tool: getWeather] Requesting weather for: "${query}", Units: ${OWM_UNITS}. API URL: ${apiUrl}`);

  try {
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (response.status !== 200 || data.cod !== 200) { // data.cod is OpenWeatherMap's status code
      console.error('[Tool: getWeather] OpenWeatherMap API Error:', data);
      const errorMessage = data.message || `Weather API Error (HTTP ${response.status}, OWM Code ${data.cod || 'N/A'})`;
      return { status: 'error', message: errorMessage };
    }

    const tempUnit = OWM_UNITS === 'metric' ? '°C' : '°F';
    const windSpeedUnit = OWM_UNITS === 'metric' ? 'm/s' : 'mph';

    // Prepare data for AI and potential GUI
    const weatherResult = {
      status: 'success',
      location: data.name + (data.sys?.country ? `, ${data.sys.country}` : ''),
      temperature: `${Math.round(data.main.temp)}${tempUnit}`,
      feels_like: `${Math.round(data.main.feels_like)}${tempUnit}`,
      min_temperature: `${Math.round(data.main.temp_min)}${tempUnit}`,
      max_temperature: `${Math.round(data.main.temp_max)}${tempUnit}`,
      condition: data.weather[0]?.main || 'N/A',
      description: data.weather[0]?.description || 'N/A',
      humidity: `${data.main.humidity}%`,
      pressure: `${data.main.pressure} hPa`,
      wind_speed: `${data.wind.speed} ${windSpeedUnit}`,
      wind_direction: data.wind.deg, // degrees
      clouds: `${data.clouds?.all || 0}%`,
      visibility: data.visibility, // meters
      sunrise: data.sys?.sunrise ? new Date(data.sys.sunrise * 1000).toLocaleTimeString() : 'N/A',
      sunset: data.sys?.sunset ? new Date(data.sys.sunset * 1000).toLocaleTimeString() : 'N/A',
      icon_code: data.weather[0]?.icon, // e.g., "01d" for clear sky day
      icon_url: data.weather[0]?.icon ? `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png` : null,
      // Data specifically for a richer GUI display on the frontend
      _weatherGUIData: {
        city: data.name,
        country: data.sys?.country,
        temp_numeric: data.main.temp,
        temp_unit_char: tempUnit.charAt(1), // 'C' or 'F'
        condition_main: data.weather[0]?.main,
        condition_description: data.weather[0]?.description,
        icon: data.weather[0]?.icon, // e.g. "01d"
        humidity_percent: data.main.humidity,
        wind_speed_numeric: data.wind.speed,
        wind_speed_unit_text: windSpeedUnit,
        // You can add more structured data here as needed for UI components
      }
    };
    console.log(`[Tool: getWeather] Successfully fetched weather for "${weatherResult.location}": ${weatherResult.condition}, ${weatherResult.temperature}`);
    return weatherResult;

  } catch (error) {
    console.error('[Tool: getWeather] Error fetching or processing weather data:', error);
    return { status: 'error', message: `Failed to get weather data: ${error.message}` };
  }
}

export const weatherToolHandlers = {
  getWeather: handleGetWeather
};