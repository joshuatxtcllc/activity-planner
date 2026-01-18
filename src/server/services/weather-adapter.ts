import axios from 'axios';
import logger from '../utils/logger';

export interface WeatherData {
  temperature: number; // Fahrenheit
  condition: 'sunny' | 'cloudy' | 'rainy' | 'stormy' | 'hot' | 'cold';
  description: string;
  humidity: number;
  windSpeed: number;
  feelsLike: number;
}

interface OpenWeatherResponse {
  main: {
    temp: number;
    feels_like: number;
    humidity: number;
  };
  weather: Array<{
    main: string;
    description: string;
  }>;
  wind: {
    speed: number;
  };
}

const HOUSTON_LAT = 29.7604;
const HOUSTON_LON = -95.3698;
const WEATHER_API_URL = 'https://api.openweathermap.org/data/2.5/weather';

/**
 * Fetch current weather data for Houston
 */
export async function getHoustonWeather(): Promise<WeatherData | null> {
  const apiKey = process.env.OPENWEATHER_API_KEY;

  if (!apiKey) {
    logger.warn('OPENWEATHER_API_KEY not configured, weather features disabled');
    return getDefaultWeather();
  }

  try {
    const response = await axios.get<OpenWeatherResponse>(WEATHER_API_URL, {
      params: {
        lat: HOUSTON_LAT,
        lon: HOUSTON_LON,
        appid: apiKey,
        units: 'imperial', // Fahrenheit
      },
      timeout: 5000,
    });

    const { main, weather, wind } = response.data;
    const temperature = Math.round(main.temp);
    const feelsLike = Math.round(main.feels_like);
    const weatherMain = weather[0]?.main.toLowerCase() || 'clear';
    const description = weather[0]?.description || 'clear sky';

    return {
      temperature,
      feelsLike,
      condition: categorizeWeather(weatherMain, temperature),
      description,
      humidity: main.humidity,
      windSpeed: wind.speed,
    };
  } catch (error) {
    logger.error('Failed to fetch weather data:', error);
    return getDefaultWeather();
  }
}

/**
 * Categorize weather into simple conditions for activity recommendations
 */
function categorizeWeather(weatherMain: string, temperature: number): WeatherData['condition'] {
  // Houston is HOT in summer
  if (temperature >= 95) return 'hot';
  if (temperature <= 40) return 'cold';

  if (weatherMain.includes('rain') || weatherMain.includes('drizzle')) {
    return 'rainy';
  }
  if (weatherMain.includes('thunder') || weatherMain.includes('storm')) {
    return 'stormy';
  }
  if (weatherMain.includes('cloud')) {
    return 'cloudy';
  }

  return 'sunny';
}

/**
 * Get default weather when API is unavailable
 */
function getDefaultWeather(): WeatherData {
  return {
    temperature: 75,
    feelsLike: 75,
    condition: 'sunny',
    description: 'weather data unavailable',
    humidity: 60,
    windSpeed: 5,
  };
}

/**
 * Determine if current weather is suitable for outdoor activities
 */
export function isGoodOutdoorWeather(weather: WeatherData): boolean {
  const { condition, temperature } = weather;

  // Houston summer heat can be brutal
  if (temperature >= 98) return false;
  if (temperature <= 35) return false;
  if (condition === 'rainy' || condition === 'stormy') return false;

  return true;
}

/**
 * Get weather-appropriate activity recommendations
 */
export function getWeatherRecommendations(weather: WeatherData): string[] {
  const { condition, temperature } = weather;
  const recommendations: string[] = [];

  if (condition === 'rainy' || condition === 'stormy') {
    recommendations.push('Indoor activities recommended');
    recommendations.push('Consider museums, bars, restaurants, or indoor entertainment');
  } else if (condition === 'hot' || temperature >= 95) {
    recommendations.push('Stay hydrated! Houston heat is intense');
    recommendations.push('Consider air-conditioned venues, pools, or wait until evening');
    recommendations.push('Early morning or late evening outdoor activities work best');
  } else if (condition === 'cold' || temperature <= 45) {
    recommendations.push('Cooler weather - great for outdoor walks');
    recommendations.push('Layer up and enjoy Houston without the humidity');
  } else {
    recommendations.push('Perfect weather for outdoor activities');
    recommendations.push('Great day to explore neighborhoods on foot');
  }

  return recommendations;
}

/**
 * Get current time of day category
 */
export function getTimeOfDay(): string {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  if (hour >= 21 && hour < 24) return 'night';
  return 'late-night'; // midnight to 5am
}

/**
 * Get current season
 */
export function getSeason(): string {
  const month = new Date().getMonth() + 1; // 1-12

  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'fall';
  return 'winter';
}

/**
 * Get day of week
 */
export function getDayOfWeek(): string {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[new Date().getDay()];
}
