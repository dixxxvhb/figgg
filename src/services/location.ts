import { Studio } from '../types';

function calculateDistance(
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
