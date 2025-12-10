import { makeRequest } from "./_core/map";
import { db } from './db';
import { sql } from 'drizzle-orm';

// Check ZIP code cache first
async function checkZipCache(zipcode: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const result = await db.execute(sql`
      SELECT lat, lng FROM zipcode_cache WHERE zipcode = ${zipcode}
    `);
    
    // Drizzle returns [rows, metadata], so we need result[0][0]
    if (result && Array.isArray(result) && result.length > 0) {
      const rows = result[0] as unknown as any[];
      if (rows && rows.length > 0) {
        const row = rows[0];
        return {
          lat: parseFloat(row.lat),
          lng: parseFloat(row.lng),
        };
      }
    }
  } catch (error) {
    // Silently fail if cache table doesn't exist yet
  }
  return null;
}

// Save to ZIP code cache
async function saveToZipCache(zipcode: string, lat: number, lng: number, city?: string, state?: string) {
  try {
    await db.execute(sql`
      INSERT INTO zipcode_cache (zipcode, lat, lng, city, state)
      VALUES (${zipcode}, ${lat}, ${lng}, ${city || null}, ${state || null})
      ON DUPLICATE KEY UPDATE lat = VALUES(lat), lng = VALUES(lng)
    `);
  } catch (error) {
    // Silently fail if cache table doesn't exist yet
  }
}

/**
 * Geocode an address or ZIP code to lat/lng coordinates
 */
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    // If it looks like a ZIP code (5 digits), add USA to ensure correct country
    const isZipCode = /^\d{5}$/.test(address.trim());
    
    // Check cache first for ZIP codes
    if (isZipCode) {
      const cached = await checkZipCache(address.trim());
      if (cached) {
        console.log(`[ZIP Cache] Hit for ${address}`);
        return cached;
      }
    }
    
    const searchAddress = isZipCode ? `${address}, USA` : address;
    
    const params: Record<string, string> = {
      address: searchAddress,
    };
    
    // For ZIP codes, restrict to US only
    if (isZipCode) {
      params.components = "country:US";
      params.region = "us"; // Bias results toward US
    }
    
    const response = await makeRequest<{
      results: Array<{
        geometry: {
          location: {
            lat: number;
            lng: number;
          };
        };
        formatted_address: string;
        address_components: Array<{
          types: string[];
          long_name: string;
        }>;
      }>;
      status: string;
    }>("/maps/api/geocode/json", params);

    if (response.status === "OK" && response.results.length > 0) {
      const coords = response.results[0].geometry.location;
      
      // Cache ZIP code results
      if (isZipCode) {
        const addressComponents = response.results[0].address_components;
        const city = addressComponents.find((c: any) => c.types.includes('locality'))?.long_name;
        const state = addressComponents.find((c: any) => c.types.includes('administrative_area_level_1'))?.long_name;
        await saveToZipCache(address.trim(), coords.lat, coords.lng, city, state);
        console.log(`[ZIP Cache] Saved ${address}`);
      }
      
      return coords;
    }

    return null;
  } catch (error: any) {
    // Don't log rate limit errors - they're expected
    if (!error.message?.includes('429') && !error.message?.includes('rate limit')) {
      console.error(`Geocoding error for "${address}":`, error);
    }
    return null;
  }
}

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
 * Add distance field to interpreter results based on user's ZIP code
 */
export async function addDistanceToInterpreters<T extends { lat: string | null; lng: string | null }>(
  interpreters: T[],
  userZipCode: string
): Promise<(T & { distance: number | null })[]> {
  console.log(`[ZIP Search] Geocoding user ZIP: ${userZipCode}`);
  console.log(`[ZIP Search] Processing ${interpreters.length} interpreters`);
  
  // Geocode user's ZIP code
  const userLocation = await geocodeAddress(userZipCode);
  console.log(`[ZIP Search] User location:`, userLocation);
  
  if (!userLocation) {
    // If geocoding fails, return interpreters without distance
    return interpreters.map(i => ({ ...i, distance: null }));
  }

  // Calculate distance for each interpreter
  const interpretersWithCoords = interpreters.filter(i => i.lat && i.lng).length;
  console.log(`[ZIP Search] Interpreters with coordinates: ${interpretersWithCoords}/${interpreters.length}`);
  
  return interpreters.map(interpreter => {
    if (!interpreter.lat || !interpreter.lng) {
      return { ...interpreter, distance: null };
    }

    const distance = calculateDistance(
      userLocation.lat,
      userLocation.lng,
      parseFloat(interpreter.lat),
      parseFloat(interpreter.lng)
    );

    return { ...interpreter, distance };
  });
}

/**
 * Filter interpreters by distance radius
 */
export function filterByRadius<T extends { distance: number | null }>(
  interpreters: T[],
  radiusMiles: number
): T[] {
  return interpreters.filter(i => i.distance !== null && i.distance <= radiusMiles);
}
