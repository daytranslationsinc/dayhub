#!/usr/bin/env node
/**
 * Gradual Geocoding Script
 * 
 * Geocodes interpreters in small batches with delays to avoid API rate limits.
 * Run this script periodically (e.g., every hour via cron) to gradually geocode all interpreters.
 * 
 * Usage: npx tsx scripts/gradual-geocode.mjs [batch_size] [delay_ms]
 * Example: npx tsx scripts/gradual-geocode.mjs 50 2000
 */

import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { interpreters } from '../drizzle/schema.ts';
import { isNull, or, eq } from 'drizzle-orm';
import { geocodeAddress } from '../server/geocoding.ts';

const BATCH_SIZE = parseInt(process.argv[2]) || 50; // Default: 50 interpreters per run
const DELAY_MS = parseInt(process.argv[3]) || 2000; // Default: 2 second delay between requests

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log(`🚀 Starting gradual geocoding (batch size: ${BATCH_SIZE}, delay: ${DELAY_MS}ms)...`);
  
  // Connect to database
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  const db = drizzle(connection);
  
  // Find interpreters without coordinates
  const interpretersToGeocode = await db
    .select()
    .from(interpreters)
    .where(or(
      isNull(interpreters.lat),
      isNull(interpreters.lng),
      eq(interpreters.lat, '0'),
      eq(interpreters.lng, '0')
    ))
    .limit(BATCH_SIZE);
  
  console.log(`📍 Found ${interpretersToGeocode.length} interpreters without coordinates`);
  
  if (interpretersToGeocode.length === 0) {
    console.log('✅ All interpreters have been geocoded!');
    await connection.end();
    return;
  }
  
  let successCount = 0;
  let failCount = 0;
  let rateLimitCount = 0;
  
  for (const interpreter of interpretersToGeocode) {
    // Build address string
    const addressParts = [
      interpreter.address,
      interpreter.city,
      interpreter.state,
      interpreter.zipCode
    ].filter(Boolean);
    
    if (addressParts.length === 0) {
      console.log(`⚠️  Skipping interpreter ${interpreter.id} - no address information`);
      failCount++;
      continue;
    }
    
    const address = addressParts.join(', ');
    
    try {
      console.log(`🔍 Geocoding: ${interpreter.firstName} ${interpreter.lastName} - ${address}`);
      
      const result = await geocodeAddress(address);
      
      if (result) {
        // Update interpreter with coordinates
        await db
          .update(interpreters)
          .set({
            lat: result.lat.toString(),
            lng: result.lng.toString()
          })
          .where(eq(interpreters.id, interpreter.id));
        
        // Cache will be saved automatically by geocodeAddress function
        
        console.log(`✅ Success: ${result.lat}, ${result.lng}`);
        successCount++;
      } else {
        console.log(`❌ Failed: Could not geocode address`);
        failCount++;
      }
      
      // Delay between requests to avoid rate limiting
      await sleep(DELAY_MS);
      
    } catch (error) {
      if (error.message && error.message.includes('429')) {
        console.log(`⏸️  Rate limit hit - stopping for now`);
        rateLimitCount++;
        break; // Stop processing if we hit rate limit
      }
      
      console.log(`❌ Error geocoding interpreter ${interpreter.id}:`, error.message);
      failCount++;
    }
  }
  
  console.log(`\n📊 Geocoding Summary:`);
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log(`   ⏸️  Rate limited: ${rateLimitCount}`);
  console.log(`   📍 Remaining: ${interpretersToGeocode.length - successCount - failCount - rateLimitCount}`);
  
  await connection.end();
  console.log('✨ Done!');
}

main().catch(console.error);
