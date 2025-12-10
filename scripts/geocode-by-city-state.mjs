#!/usr/bin/env node
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { interpreters } from '../drizzle/schema.ts';
import { eq, isNull, or, and } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load ZIP code database
console.log('Loading ZIP code database...');
const zipData = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'USCities.json'), 'utf8')
);

// Create city/state lookup map (use first match for each city/state combo)
const cityStateMap = new Map();
zipData.forEach(entry => {
  const key = `${entry.city.toLowerCase().trim()}|${entry.state.toUpperCase().trim()}`;
  if (!cityStateMap.has(key)) {
    cityStateMap.set(key, {
      lat: entry.latitude,
      lng: entry.longitude,
      city: entry.city,
      state: entry.state
    });
  }
});

console.log(`Loaded ${cityStateMap.size} unique city/state combinations`);

// Connect to database
const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

console.log('Fetching interpreters without coordinates...');

// Get interpreters without coordinates
const interpretersToGeocode = await db
  .select()
  .from(interpreters)
  .where(
    and(
      or(isNull(interpreters.lat), isNull(interpreters.lng)),
      // Only geocode if they have city and state
      // Skip if city or state is NULL or empty
    )
  )
  .limit(10000);

console.log(`Found ${interpretersToGeocode.length} interpreters to process`);

let successCount = 0;
let failCount = 0;
const failedCities = new Set();

for (const interpreter of interpretersToGeocode) {
  if (!interpreter.city || !interpreter.state) {
    failCount++;
    continue;
  }

  // Clean and normalize city/state
  const cleanCity = String(interpreter.city).toLowerCase().trim();
  const cleanState = String(interpreter.state).toUpperCase().trim();
  const key = `${cleanCity}|${cleanState}`;
  
  const location = cityStateMap.get(key);

  if (location) {
    // Update interpreter with coordinates
    await db
      .update(interpreters)
      .set({
        lat: String(location.lat),
        lng: String(location.lng)
      })
      .where(eq(interpreters.id, interpreter.id));

    successCount++;
    
    if (successCount % 100 === 0) {
      console.log(`Geocoded ${successCount}/${interpretersToGeocode.length} interpreters...`);
    }
  } else {
    failCount++;
    if (failedCities.size < 20) {
      failedCities.add(`${interpreter.city}, ${interpreter.state}`);
    }
  }
}

if (failedCities.size > 0) {
  console.log('\nSample failed city/state combinations:');
  Array.from(failedCities).slice(0, 10).forEach(c => console.log(`  - ${c}`));
}

console.log('\n=== Geocoding Complete ===');
console.log(`Successfully geocoded: ${successCount}`);
console.log(`Failed (no match): ${failCount}`);
console.log(`Total processed: ${interpretersToGeocode.length}`);

// Check total geocoded
const totalGeocoded = await db
  .select()
  .from(interpreters)
  .where(and(
    isNull(interpreters.lat).not(),
    isNull(interpreters.lng).not()
  ));

console.log(`\nTotal interpreters with coordinates: ${totalGeocoded.length}/9719`);

await connection.end();
