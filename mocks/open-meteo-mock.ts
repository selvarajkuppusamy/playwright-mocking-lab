// Strongly typed Open-Meteo API mock response
// Extracted from open-meteo.har for type-safe mocking

export interface OpenMeteoCurrentUnits {
  time: string;
  interval: string;
  temperature_2m: string;
  relative_humidity_2m: string;
  apparent_temperature: string;
  is_day: string;
  precipitation: string;
  rain: string;
  showers: string;
  snowfall: string;
  weather_code: string;
  cloud_cover: string;
  pressure_msl: string;
  surface_pressure: string;
  wind_speed_10m: string;
  wind_direction_10m: string;
  wind_gusts_10m: string;
}

export interface OpenMeteoCurrent {
  time: number;
  interval: number;
  temperature_2m: number;
  relative_humidity_2m: number;
  apparent_temperature: number;
  is_day: number;
  precipitation: number;
  rain: number;
  showers: number;
  snowfall: number;
  weather_code: number;
  cloud_cover: number;
  pressure_msl: number;
  surface_pressure: number;
  wind_speed_10m: number;
  wind_direction_10m: number;
  wind_gusts_10m: number;
}

export interface OpenMeteoForecastResponse {
  latitude: number;
  longitude: number;
  generationtime_ms: number;
  utc_offset_seconds: number;
  timezone: string;
  timezone_abbreviation: string;
  elevation: number;
  current_units: OpenMeteoCurrentUnits;
  current: OpenMeteoCurrent;
}

export const mockOpenMeteoResponse: OpenMeteoForecastResponse = {
  latitude: 51.5,
  longitude: -0.120000124,
  generationtime_ms: 0.16939640045166016,
  utc_offset_seconds: 0,
  timezone: "GMT",
  timezone_abbreviation: "GMT",
  elevation: 16.0,
  current_units: {
    time: "unixtime",
    interval: "seconds",
    temperature_2m: "°C",
    relative_humidity_2m: "%",
    apparent_temperature: "°C",
    is_day: "",
    precipitation: "mm",
    rain: "mm",
    showers: "mm",
    snowfall: "cm",
    weather_code: "wmo code",
    cloud_cover: "%",
    pressure_msl: "hPa",
    surface_pressure: "hPa",
    wind_speed_10m: "km/h",
    wind_direction_10m: "°",
    wind_gusts_10m: "km/h",
  },
  current: {
    time: 1765909800,
    interval: 900,
    temperature_2m: 9.1,
    relative_humidity_2m: 83,
    apparent_temperature: 7.1,
    is_day: 0,
    precipitation: 0.0,
    rain: 0.0,
    showers: 0.0,
    snowfall: 0.0,
    weather_code: 3,
    cloud_cover: 100,
    pressure_msl: 1013.3,
    surface_pressure: 1011.3,
    wind_speed_10m: 8.0,
    wind_direction_10m: 350,
    wind_gusts_10m: 19.8,
  },
};

// Helper to customize temperature for different test scenarios
export function createMockWithTemperature(temperature: number): OpenMeteoForecastResponse {
  return {
    ...mockOpenMeteoResponse,
    current: {
      ...mockOpenMeteoResponse.current,
      temperature_2m: temperature,
    },
  };
}
