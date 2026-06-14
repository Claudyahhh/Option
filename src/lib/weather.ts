export interface CurrentWeather {
  city: string;
  country: string;
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  weatherCode: number;
}

interface GeocodingResponse {
  results?: Array<{
    name: string;
    country?: string;
    latitude: number;
    longitude: number;
  }>;
}

interface ForecastResponse {
  current?: {
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    weather_code: number;
  };
}

export async function fetchCurrentWeather(
  city: string,
  language: 'en' | 'zh',
  signal?: AbortSignal,
): Promise<CurrentWeather> {
  const locationParams = new URLSearchParams({
    name: city,
    count: '1',
    language,
    format: 'json',
  });
  const locationResponse = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?${locationParams}`,
    { signal },
  );

  if (!locationResponse.ok) throw new Error('Location lookup failed');

  const locationData = await locationResponse.json() as GeocodingResponse;
  const location = locationData.results?.[0];
  if (!location) throw new Error('Location not found');

  const weatherParams = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    current: 'temperature_2m,apparent_temperature,relative_humidity_2m,weather_code',
    timezone: 'auto',
  });
  const weatherResponse = await fetch(
    `https://api.open-meteo.com/v1/forecast?${weatherParams}`,
    { signal },
  );

  if (!weatherResponse.ok) throw new Error('Weather lookup failed');

  const weatherData = await weatherResponse.json() as ForecastResponse;
  if (!weatherData.current) throw new Error('Current weather unavailable');

  return {
    city: location.name,
    country: location.country ?? '',
    temperature: weatherData.current.temperature_2m,
    apparentTemperature: weatherData.current.apparent_temperature,
    humidity: weatherData.current.relative_humidity_2m,
    weatherCode: weatherData.current.weather_code,
  };
}

export function getWeatherLabel(code: number, language: 'en' | 'zh'): string {
  const labels = language === 'zh'
    ? {
        clear: '晴',
        cloudy: '多云',
        fog: '有雾',
        drizzle: '毛毛雨',
        rain: '有雨',
        snow: '有雪',
        storm: '雷暴',
      }
    : {
        clear: 'Clear',
        cloudy: 'Cloudy',
        fog: 'Fog',
        drizzle: 'Drizzle',
        rain: 'Rain',
        snow: 'Snow',
        storm: 'Thunderstorm',
      };

  if (code === 0) return labels.clear;
  if (code <= 3) return labels.cloudy;
  if (code === 45 || code === 48) return labels.fog;
  if (code >= 51 && code <= 57) return labels.drizzle;
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return labels.rain;
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return labels.snow;
  if (code >= 95) return labels.storm;
  return labels.cloudy;
}
