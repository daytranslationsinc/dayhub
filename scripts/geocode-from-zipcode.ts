import mysql from 'mysql2/promise';

async function geocodeFromZipCode() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  
  console.log('=== Geocode from ZIP Code Cache ===\n');
  
  // Get interpreters without coordinates but with ZIP codes
  const [interpreters] = await conn.query(`
    SELECT id, zipCode, city, state
    FROM interpreters
    WHERE (lat IS NULL OR lng IS NULL)
      AND zipCode IS NOT NULL
      AND zipCode != ''
  `);
  
  const records = interpreters as any[];
  console.log(`📊 Found ${records.length} interpreters with ZIP codes but no coordinates\n`);
  
  let geocoded = 0;
  let notFound = 0;
  
  for (const record of records) {
    try {
      // Look up ZIP code in cache
      const [rows] = await conn.query(`
        SELECT lat, lng
        FROM zipcode_cache
        WHERE zipcode = ?
        LIMIT 1
      `, [record.zipCode]);
      
      const cached = rows as any[];
      if (cached && cached.length > 0) {
        const row = cached[0];
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
  
  console.log(`\n✅ Geocoding from ZIP codes complete!\n`);
  console.log(`📊 Results:`);
  console.log(`  - Geocoded: ${geocoded}`);
  console.log(`  - Not found in cache: ${notFound}`);
  
  // Get final statistics
  const [total] = await conn.query('SELECT COUNT(*) as count FROM interpreters');
  const [withCoords] = await conn.query('SELECT COUNT(*) as count FROM interpreters WHERE lat IS NOT NULL AND lng IS NOT NULL');
  
  console.log(`\n📈 Final Statistics:`);
  console.log(`  - Total interpreters: ${(total as any)[0].count}`);
  console.log(`  - With coordinates: ${(withCoords as any)[0].count} (${Math.round((withCoords as any)[0].count / (total as any)[0].count * 100)}%)`);
  console.log(`  - Still need geocoding: ${(total as any)[0].count - (withCoords as any)[0].count}`);
  
  await conn.end();
}

geocodeFromZipCode().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
