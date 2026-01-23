import { UserLocation, Studio } from '../types';

export function getCurrentLocation(): Promise<UserLocation> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000, // Cache for 1 minute
      }
    );
  });
}

export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  // Haversine formula for distance in meters
  const R = 6371000; // Earth's radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

export function isNearStudio(
  userLocation: UserLocation,
  studio: Studio,
  thresholdMeters: number = 200
): boolean {
  if (!studio.coordinates.lat || !studio.coordinates.lng) {
    return false;
  }

  const distance = calculateDistance(
    userLocation.lat,
    userLocation.lng,
    studio.coordinates.lat,
    studio.coordinates.lng
  );

  return distance <= thresholdMeters;
}

export function findNearestStudio(
  userLocation: UserLocation,
  studios: Studio[]
): { studio: Studio; distance: number } | null {
  let nearest: { studio: Studio; distance: number } | null = null;

  for (const studio of studios) {
    if (!studio.coordinates.lat || !studio.coordinates.lng) continue;

    const distance = calculateDistance(
      userLocation.lat,
      userLocation.lng,
      studio.coordinates.lat,
      studio.coordinates.lng
    );

    if (!nearest || distance < nearest.distance) {
      nearest = { studio, distance };
    }
  }

  return nearest;
}

export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}
