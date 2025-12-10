/**
 * ZIP code geolocation utilities
 */

// Simple ZIP code to lat/lng mapping for major US cities
// In production, use a proper ZIP code database or API
const ZIP_COORDS: Record<string, { lat: number; lng: number }> = {
  // New York
  "10001": { lat: 40.7506, lng: -73.9971 },
  "10002": { lat: 40.7156, lng: -73.9862 },
  // Los Angeles
  "90001": { lat: 33.9731, lng: -118.2479 },
  "90002": { lat: 33.9499, lng: -118.2468 },
  // Chicago
  "60601": { lat: 41.8858, lng: -87.6189 },
  "60602": { lat: 41.8828, lng: -87.6295 },
  // Houston
  "77001": { lat: 29.7520, lng: -95.3620 },
  "77002": { lat: 29.7586, lng: -95.3635 },
  // Phoenix
  "85001": { lat: 33.4483, lng: -112.0738 },
  "85002": { lat: 33.4483, lng: -112.0738 },
  // Add more as needed...
};

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in miles
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 10) / 10; // Round to 1 decimal place
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Get coordinates for a ZIP code
 * Returns null if ZIP not found
 */
export function getZipCoordinates(zipCode: string): { lat: number; lng: number } | null {
  // First try exact match
  if (ZIP_COORDS[zipCode]) {
    return ZIP_COORDS[zipCode];
  }
  
  // Try to use a free geocoding API
  // For now, return null if not in our database
  return null;
}

/**
 * Populate ZIP coordinates using a geocoding service
 * This would be called during data import to populate lat/lng for all interpreters
 */
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  // In production, use Google Maps Geocoding API or similar
  // For now, return null
  return null;
}
