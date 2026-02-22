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

// Estimate driving time between two studios
// Uses a rough average speed of 30mph (48km/h) for suburban driving
export function estimateTravelTime(studio1: Studio, studio2: Studio): number | null {
  if (!studio1.coordinates?.lat || !studio1.coordinates?.lng ||
      !studio2.coordinates?.lat || !studio2.coordinates?.lng) {
    return null;
  }

  const distanceMeters = calculateDistance(
    studio1.coordinates.lat,
    studio1.coordinates.lng,
    studio2.coordinates.lat,
    studio2.coordinates.lng
  );

  // Convert to km, estimate at ~30km/h average suburban speed
  // Add 5 min buffer for parking, walking, etc.
  const distanceKm = distanceMeters / 1000;
  const travelMinutes = Math.ceil((distanceKm / 30) * 60) + 5;

  return travelMinutes;
}

export function formatTravelTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}
