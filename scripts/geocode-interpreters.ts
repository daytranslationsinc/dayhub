import { db } from "../server/db";
import { interpreters } from "../drizzle/schema";
import { isNull, or, eq } from "drizzle-orm";
import { makeRequest } from "../server/_core/map";

/**
 * Geocode all interpreters that have city/state but no lat/lng coordinates
 * Uses Google Maps Geocoding API via Manus proxy
 */

async function geocodeInterpreters() {
  console.log("🗺️  Starting geocoding process...\n");

  // Find all interpreters without coordinates
  const interpretersToGeocode = await db
    .select()
    .from(interpreters)
    .where(
      or(
        isNull(interpreters.lat),
        isNull(interpreters.lng)
      )
    );

  console.log(`Found ${interpretersToGeocode.length} interpreters to geocode\n`);

  let successCount = 0;
  let failCount = 0;
  let skipCount = 0;

  for (let i = 0; i < interpretersToGeocode.length; i++) {
    const interpreter = interpretersToGeocode[i];
    
    // Progress indicator
    if ((i + 1) % 100 === 0) {
      console.log(`Progress: ${i + 1}/${interpretersToGeocode.length} (${Math.round((i + 1) / interpretersToGeocode.length * 100)}%)`);
    }

    // Build address string
    const addressParts = [];
    if (interpreter.city) addressParts.push(interpreter.city);
    if (interpreter.state) addressParts.push(interpreter.state);
    if (interpreter.zipCode) addressParts.push(interpreter.zipCode);
    
    const address = addressParts.join(", ");

    if (!address) {
      skipCount++;
      continue;
    }

    try {
      // Call Google Maps Geocoding API via Manus proxy
      const response = await makeRequest<{
        results: Array<{
          geometry: {
            location: {
              lat: number;
              lng: number;
            };
          };
          formatted_address: string;
        }>;
        status: string;
      }>("/maps/api/geocode/json", {
        address: address,
      });

      if (response.status === "OK" && response.results.length > 0) {
        const location = response.results[0].geometry.location;
        
        // Update interpreter with coordinates
        await db
          .update(interpreters)
          .set({
            lat: location.lat.toString(),
            lng: location.lng.toString(),
          })
          .where(eq(interpreters.id, interpreter.id));

        successCount++;
      } else {
        console.log(`⚠️  Failed to geocode: ${interpreter.name} (${address}) - Status: ${response.status}`);
        failCount++;
      }

      // Rate limiting: wait 50ms between requests to avoid hitting API limits
      await new Promise(resolve => setTimeout(resolve, 50));

    } catch (error) {
      console.error(`❌ Error geocoding ${interpreter.name} (${address}):`, error);
      failCount++;
    }
  }

  console.log("\n✅ Geocoding complete!");
  console.log(`   Success: ${successCount}`);
  console.log(`   Failed: ${failCount}`);
  console.log(`   Skipped (no address): ${skipCount}`);
  console.log(`   Total: ${interpretersToGeocode.length}`);
}

// Run the script
geocodeInterpreters()
  .then(() => {
    console.log("\n🎉 Script completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Script failed:", error);
    process.exit(1);
  });
