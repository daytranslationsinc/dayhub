#!/usr/bin/env node
/**
 * Geocode all interpreters that don't have lat/lng coordinates
 * This script populates the lat and lng fields for ZIP code proximity search
 */

import mysql from 'mysql2/promise';
import { geocodeAddress } from '../server/geocoding.ts';

// Get database connection from environment
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable not set');
  process.exit(1);
}

async function main() {
  console.log('🌍 Starting interpreter geocoding...\n');
  
  // Connect to database
  const connection = await mysql.createConnection(DATABASE_URL);
  
  try {
    // Get interpreters without coordinates
    const [interpreters] = await connection.query(`
      SELECT id, firstName, lastName, city, state, zipCode, country
      FROM interpreters
      WHERE (lat IS NULL OR lng IS NULL)
      AND (city IS NOT NULL OR zipCode IS NOT NULL)
      LIMIT 100
    `);
    
    console.log(`Found ${interpreters.length} interpreters to geocode\n`);
    
    let successCount = 0;
    let failCount = 0;
    let skipCount = 0;
    
    for (const interpreter of interpreters) {
      const { id, firstName, lastName, city, state, zipCode, country } = interpreter;
      const name = `${firstName} ${lastName}`.trim();
      
      // Build address string
      let address = '';
      if (zipCode) {
        address = `${zipCode}, ${country || 'USA'}`;
      } else if (city && state) {
        address = `${city}, ${state}, ${country || 'USA'}`;
      } else {
        console.log(`⏭️  Skipping ${name} (ID: ${id}) - insufficient address data`);
        skipCount++;
        continue;
      }
      
      try {
        // Geocode the address
        const coords = await geocodeAddress(address);
        
        if (coords) {
          // Update database with coordinates
          await connection.query(
            'UPDATE interpreters SET lat = ?, lng = ? WHERE id = ?',
            [coords.lat, coords.lng, id]
          );
          
          console.log(`✅ ${name} (ID: ${id}) → ${coords.lat}, ${coords.lng}`);
          successCount++;
        } else {
          console.log(`❌ ${name} (ID: ${id}) - geocoding failed for "${address}"`);
          failCount++;
        }
        
        // Rate limiting - wait 100ms between requests
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`❌ ${name} (ID: ${id}) - Error: ${error.message}`);
        failCount++;
      }
    }
    
    console.log(`\n📊 Geocoding Summary:`);
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Failed: ${failCount}`);
    console.log(`   ⏭️  Skipped: ${skipCount}`);
    console.log(`   📍 Total: ${interpreters.length}`);
    
  } finally {
    await connection.end();
  }
}

main().catch(console.error);
