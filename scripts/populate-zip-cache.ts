import mysql from 'mysql2/promise';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface ZipCodeEntry {
  zip_code: number;
  latitude: number;
  longitude: number;
  city: string;
  state: string;
  county: string;
}

async function populateZipCache() {
  console.log('=== Populating ZIP Code Cache ===\n');
  
  // Read the US ZIP codes JSON file
  const zipCodesPath = path.join(__dirname, 'USCities.json');
  console.log(`Reading ZIP codes from: ${zipCodesPath}`);
  
  const zipCodesData = JSON.parse(fs.readFileSync(zipCodesPath, 'utf-8')) as ZipCodeEntry[];
  console.log(`Loaded ${zipCodesData.length} ZIP codes\n`);
  
  // Connect to database
  const connection = await mysql.createConnection(process.env.DATABASE_URL!);
  console.log('Connected to database\n');
  
  // Prepare batch insert
  let inserted = 0;
  let skipped = 0;
  const batchSize = 1000;
  
  for (let i = 0; i < zipCodesData.length; i += batchSize) {
    const batch = zipCodesData.slice(i, i + batchSize);
    
    // Build values for batch insert
    const values = batch.map(entry => {
      // Pad ZIP code with leading zeros if needed
      const zipCode = String(entry.zip_code).padStart(5, '0');
      return [zipCode, entry.latitude, entry.longitude, entry.city, entry.state];
    });
    
    try {
      // Use INSERT IGNORE to skip duplicates
      const query = `
        INSERT IGNORE INTO zipcode_cache (zipcode, lat, lng, city, state)
        VALUES ?
      `;
      
      const [result] = await connection.query(query, [values]);
      const affectedRows = (result as any).affectedRows || 0;
      inserted += affectedRows;
      skipped += batch.length - affectedRows;
      
      if ((i + batchSize) % 5000 === 0 || i + batchSize >= zipCodesData.length) {
        console.log(`Progress: ${Math.min(i + batchSize, zipCodesData.length)}/${zipCodesData.length} processed (${inserted} inserted, ${skipped} skipped)`);
      }
    } catch (error) {
      console.error(`Error inserting batch at index ${i}:`, error);
    }
  }
  
  console.log(`\n✅ Complete!`);
  console.log(`   Total inserted: ${inserted}`);
  console.log(`   Total skipped: ${skipped}`);
  
  // Verify the cache
  const [countResult] = await connection.query('SELECT COUNT(*) as count FROM zipcode_cache');
  const totalCached = (countResult as any)[0].count;
  console.log(`   Total in cache: ${totalCached}`);
  
  // Test a few ZIP codes
  console.log('\n📍 Testing sample ZIP codes:');
  const testZips = ['90210', '10001', '33101', '60601', '94102'];
  
  for (const zip of testZips) {
    const [result] = await connection.query(
      'SELECT * FROM zipcode_cache WHERE zipcode = ?',
      [zip]
    );
    
    if ((result as any[]).length > 0) {
      const data = (result as any[])[0];
      console.log(`   ✓ ${zip}: ${data.city}, ${data.state} (${data.lat}, ${data.lng})`);
    } else {
      console.log(`   ✗ ${zip}: Not found`);
    }
  }
  
  await connection.end();
  console.log('\n✨ ZIP code cache populated successfully!');
}

populateZipCache().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
