import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { interpreters } from '../drizzle/schema';
import { or, like, and } from 'drizzle-orm';
import * as fs from 'fs';
import * as csv from 'csv-parse/sync';

const connection = await mysql.createConnection(process.env.DATABASE_URL!);
const db = drizzle(connection);

console.log('🔍 Restoring ASL interpreters by matching names...\n');

const csvPath = '/home/ubuntu/upload/FINAL_INTERPRETER_DATABASE.csv';
const csvContent = fs.readFileSync(csvPath, 'utf-8');
const records = csv.parse(csvContent, {
  columns: true,
  skip_empty_lines: true,
  trim: true,
  relax_column_count: true,
});

let aslFound = 0;
let matched = 0;
let notFound = 0;
let newlyAdded = 0;

const aslInterpreters: any[] = [];

// First, collect all ASL interpreters from CSV
for (const row of records) {
  const sourceLanguage = row['Source Language'] || '';
  const targetLanguage = row['Target Language'] || '';
  
  if (sourceLanguage.toLowerCase().includes('american sign language') || 
      targetLanguage.toLowerCase().includes('american sign language')) {
    
    const name = row['Name'] || '';
    const [lastName, firstName] = name.split(',').map((s: string) => s.trim());
    
    if (firstName && lastName) {
      aslInterpreters.push({
        firstName,
        lastName,
        email: row['Email'] || '',
        phone: row['Phone'] || '',
        city: row['City'] || '',
        state: row['State'] || '',
        certification: row['Certification'] || '',
      });
      aslFound++;
    }
  }
}

console.log(`Found ${aslFound} ASL interpreters in CSV\n`);

// Now try to match and update them in database
for (const asl of aslInterpreters) {
  try {
    // Try to find by first and last name
    const existing = await db
      .select()
      .from(interpreters)
      .where(
        and(
          like(interpreters.firstName, `%${asl.firstName}%`),
          like(interpreters.lastName, `%${asl.lastName}%`)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // Update to set ASL
      await db
        .update(interpreters)
        .set({
          sourceLanguage: 'American Sign Language (ASL)',
          targetLanguage: 'English',
          certification: asl.certification || existing[0].certification,
          isVetted: true,
        })
        .where(and(
          like(interpreters.firstName, `%${asl.firstName}%`),
          like(interpreters.lastName, `%${asl.lastName}%`)
        ));
      
      matched++;
      if (matched % 50 === 0) {
        console.log(`✅ Updated ${matched} ASL interpreters...`);
      }
    } else {
      // Add new ASL interpreter
      await db.insert(interpreters).values({
        firstName: asl.firstName,
        lastName: asl.lastName,
        email: asl.email || `${asl.firstName.toLowerCase()}.${asl.lastName.toLowerCase()}@asl.example.com`,
        phone: asl.phone || null,
        sourceLanguage: 'American Sign Language (ASL)',
        targetLanguage: 'English',
        city: asl.city || null,
        state: asl.state || null,
        country: 'USA',
        certification: asl.certification || null,
        isActive: true,
        isVetted: true,
      });
      
      newlyAdded++;
      if (newlyAdded % 50 === 0) {
        console.log(`✅ Added ${newlyAdded} new ASL interpreters...`);
      }
    }
  } catch (error: any) {
    console.error(`❌ Error processing ${asl.firstName} ${asl.lastName}:`, error.message);
    notFound++;
  }
}

console.log(`\n✅ ASL Restoration Complete!`);
console.log(`   Total ASL in CSV: ${aslFound}`);
console.log(`   Existing interpreters updated to ASL: ${matched}`);
console.log(`   New ASL interpreters added: ${newlyAdded}`);
console.log(`   Errors: ${notFound}`);

await connection.end();
