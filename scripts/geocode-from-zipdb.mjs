#!/usr/bin/env node
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { interpreters } from '../drizzle/schema.ts';
import { eq, isNull, or } from 'drizzle-orm';
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

// Create ZIP code lookup map
const zipMap = new Map();
zipData.forEach(entry => {
  const zip = String(entry.zip_code).padStart(5, '0');
  zipMap.set(zip, {
    lat: entry.latitude,
    lng: entry.longitude,
    city: entry.city,
    state: entry.state
  });
});

console.log(`Loaded ${zipMap.size} ZIP codes`);

// Connect to database
const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

console.log('Fetching interpreters without coordinates...');

// Get interpreters without coordinates
const interpretersToGeocode = await db
  .select()
  .from(interpreters)
  .where(or(isNull(interpreters.lat), isNull(interpreters.lng)))
  .limit(10000);

console.log(`Found ${interpretersToGeocode.length} interpreters to geocode`);

let successCount = 0;
let failCount = 0;
const failedZips = new Set();

for (const interpreter of interpretersToGeocode) {
  if (!interpreter.zipCode) {
    failCount++;
    continue;
  }

  // Clean and normalize ZIP code
  const cleanZip = String(interpreter.zipCode).trim().split('-')[0].padStart(5, '0');
  const zipInfo = zipMap.get(cleanZip);

  if (zipInfo) {
    // Update interpreter with coordinates
    await db
      .update(interpreters)
      .set({
        lat: String(zipInfo.lat),
        lng: String(zipInfo.lng)
      })
      .where(eq(interpreters.id, interpreter.id));

    successCount++;
    
    if (successCount % 100 === 0) {
      console.log(`Geocoded ${successCount}/${interpretersToGeocode.length} interpreters...`);
    }
  } else {
    failCount++;
    if (failedZips.size < 20) {
      failedZips.add(cleanZip);
    }
  }
}

if (failedZips.size > 0) {
  console.log('\nSample failed ZIP codes:', Array.from(failedZips).slice(0, 10));
}

console.log('\n=== Geocoding Complete ===');
console.log(`Successfully geocoded: ${successCount}`);
console.log(`Failed (no ZIP match): ${failCount}`);
console.log(`Total processed: ${interpretersToGeocode.length}`);

await connection.end();
