import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { interpreters } from '../drizzle/schema';
import { eq } from 'drizzle-orm';
import * as fs from 'fs';
import * as csv from 'csv-parse/sync';

const connection = await mysql.createConnection(process.env.DATABASE_URL!);
const db = drizzle(connection);

console.log('🔍 Importing ONLY ASL interpreters from CSV files...\n');

const csvPath = '/home/ubuntu/upload/FINAL_INTERPRETER_DATABASE.csv';
const csvContent = fs.readFileSync(csvPath, 'utf-8');
const records = csv.parse(csvContent, {
  columns: true,
  skip_empty_lines: true,
  trim: true,
  relax_column_count: true, // Allow inconsistent column counts
});

let aslCount = 0;
let imported = 0;
let updated = 0;
let skipped = 0;

for (const row of records) {
  const sourceLanguage = row['Source Language'] || row['source_language'] || '';
  const targetLanguage = row['Target Language'] || row['target_language'] || '';
  
  // Only process ASL interpreters
  if (sourceLanguage.toLowerCase().includes('american sign language') || 
      targetLanguage.toLowerCase().includes('american sign language')) {
    
    aslCount++;
    
    const name = row['Name'] || row['name'] || '';
    const [lastName, firstName] = name.split(',').map((s: string) => s.trim());
    
    const email = row['Email'] || row['email'] || '';
    const phone = row['Phone'] || row['phone'] || '';
    const city = row['City'] || row['city'] || '';
    const state = row['State'] || row['state'] || '';
    const certification = row['Certification'] || row['certification'] || '';
    
    if (!email && !firstName) {
      skipped++;
      continue;
    }
    
    try {
      // Check if interpreter exists
      const existing = email ? await db
        .select()
        .from(interpreters)
        .where(eq(interpreters.email, email))
        .limit(1) : [];

      if (existing.length > 0) {
        // Update existing interpreter to set ASL
        await db
          .update(interpreters)
          .set({
            sourceLanguage: sourceLanguage || 'American Sign Language (ASL)',
            targetLanguage: targetLanguage || 'English',
            certification: certification || null,
          })
          .where(eq(interpreters.id, existing[0].id));
        
        updated++;
        if (updated % 100 === 0) {
          console.log(`✅ Updated ${updated} ASL interpreters...`);
        }
      } else {
        // Insert new ASL interpreter
        await db.insert(interpreters).values({
          firstName: firstName || 'Unknown',
          lastName: lastName || 'Unknown',
          email: email || `asl${aslCount}@example.com`,
          phone: phone || null,
          sourceLanguage: sourceLanguage || 'American Sign Language (ASL)',
          targetLanguage: targetLanguage || 'English',
          city: city || null,
          state: state || null,
          country: 'USA',
          certification: certification || null,
          isActive: true,
          isVetted: true, // Mark as vetted since they're from your official list
        });
        
        imported++;
        if (imported % 100 === 0) {
          console.log(`✅ Imported ${imported} new ASL interpreters...`);
        }
      }
    } catch (error: any) {
      console.error(`❌ Error processing ${firstName} ${lastName}:`, error.message);
      skipped++;
    }
  }
}

console.log(`\n✅ ASL Import Complete!`);
console.log(`   Total ASL entries found: ${aslCount}`);
console.log(`   New ASL interpreters imported: ${imported}`);
console.log(`   Existing interpreters updated: ${updated}`);
console.log(`   Skipped (errors/missing data): ${skipped}`);

await connection.end();
