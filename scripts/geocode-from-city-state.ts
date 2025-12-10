import mysql from 'mysql2/promise';

async function geocodeFromCityState() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  
  console.log('=== Geocode from City + State (using existing data) ===\n');
  
  // Get interpreters without coordinates but with city and state
  const [needGeocode] = await conn.query(`
    SELECT id, city, state
    FROM interpreters
    WHERE (lat IS NULL OR lng IS NULL)
      AND city IS NOT NULL
      AND state IS NOT NULL
      AND city != ''
      AND state != ''
  `);
  
  const records = needGeocode as any[];
  console.log(`📊 Found ${records.length} interpreters needing geocoding\n`);
  
  let geocoded = 0;
  let notFound = 0;
  
  for (const record of records) {
    try {
      // Look up coordinates from another interpreter in the same city+state
      const [existing] = await conn.query(`
        SELECT lat, lng
        FROM interpreters
        WHERE city = ?
          AND state = ?
          AND lat IS NOT NULL
          AND lng IS NOT NULL
        LIMIT 1
      `, [record.city, record.state]);
      
      const rows = existing as any[];
      if (rows && rows.length > 0) {
        const row = rows[0];
        const lat = parseFloat(row.lat);
        const lng = parseFloat(row.lng);
        
        if (!isNaN(lat) && !isNaN(lng)) {
          await conn.query(`
            UPDATE interpreters
            SET lat = ?, lng = ?
            WHERE id = ?
          `, [lat, lng, record.id]);
          
          geocoded++;
          
          if (geocoded % 100 === 0) {
            console.log(`  Geocoded ${geocoded} interpreters...`);
          }
        } else {
          notFound++;
        }
      } else {
        notFound++;
      }
    } catch (error) {
      console.error(`Error geocoding interpreter ${record.id}:`, error);
    }
  }
  
  console.log(`\n✅ Geocoding from city+state complete!\n`);
  console.log(`📊 Results:`);
  console.log(`  - Geocoded: ${geocoded}`);
  console.log(`  - Not found (no existing coordinates for city+state): ${notFound}`);
  
  // Get final statistics
  const [total] = await conn.query('SELECT COUNT(*) as count FROM interpreters');
  const [withCoords] = await conn.query('SELECT COUNT(*) as count FROM interpreters WHERE lat IS NOT NULL AND lng IS NOT NULL');
  
  console.log(`\n📈 Final Statistics:`);
  console.log(`  - Total interpreters: ${(total as any)[0].count}`);
  console.log(`  - With coordinates: ${(withCoords as any)[0].count} (${Math.round((withCoords as any)[0].count / (total as any)[0].count * 100)}%)`);
  console.log(`  - Still need geocoding: ${(total as any)[0].count - (withCoords as any)[0].count}`);
  
  await conn.end();
}

geocodeFromCityState().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
