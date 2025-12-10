import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { interpreters } from '../drizzle/schema';
import { eq, or, like } from 'drizzle-orm';
import XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

const connection = await mysql.createConnection(process.env.DATABASE_URL!);
const db = drizzle(connection);

console.log('🔍 Restoring ASL interpreters from original files...\n');

// Read the original Excel files
const file1Path = '/home/ubuntu/upload/pasted_file_jy9Wzs_TerpApplicantsViewOnly.xlsx';
const file2Path = '/home/ubuntu/upload/pasted_file_DvZZjn_InterpretersDBViewOnly(2).xlsx';

let aslCount = 0;
let updated = 0;

// Process File 1
if (fs.existsSync(file1Path)) {
  console.log('📄 Processing TerpApplicantsViewOnly.xlsx...');
  const workbook1 = XLSX.readFile(file1Path);
  const sheet1 = workbook1.Sheets[workbook1.SheetNames[0]];
  const data1 = XLSX.utils.sheet_to_json(sheet1);

  for (const row of data1 as any[]) {
    const targetLang = row['Target Language'] || row['Language'] || '';
    const sourceLang = row['Source Language'] || '';
    
    // Check if this is an ASL interpreter
    if (targetLang.toLowerCase().includes('sign') || 
        targetLang.toLowerCase() === 'asl' ||
        sourceLang.toLowerCase().includes('sign') ||
        sourceLang.toLowerCase() === 'asl') {
      
      aslCount++;
      
      const email = row['Email'] || row['Email Address'] || '';
      const phone = row['Phone'] || row['Phone Number'] || '';
      const firstName = row['First Name'] || row['FirstName'] || '';
      const lastName = row['Last Name'] || row['LastName'] || '';
      
      if (email || (firstName && lastName)) {
        // Find matching interpreter in database
        const existing = await db
          .select()
          .from(interpreters)
          .where(
            email ? eq(interpreters.email, email) : 
            eq(interpreters.firstName, firstName)
          )
          .limit(1);

        if (existing.length > 0) {
          // Update to restore ASL
          await db
            .update(interpreters)
            .set({
              targetLanguage: 'American Sign Language (ASL)',
              sourceLanguage: sourceLang || 'English',
            })
            .where(eq(interpreters.id, existing[0].id));
          
          updated++;
          console.log(`✅ Restored: ${firstName} ${lastName} - ASL`);
        }
      }
    }
  }
}

// Process File 2
if (fs.existsSync(file2Path)) {
  console.log('\n📄 Processing InterpretersDBViewOnly.xlsx...');
  const workbook2 = XLSX.readFile(file2Path);
  const sheet2 = workbook2.Sheets[workbook2.SheetNames[0]];
  const data2 = XLSX.utils.sheet_to_json(sheet2);

  for (const row of data2 as any[]) {
    const targetLang = row['Target Language'] || row['Language'] || '';
    const sourceLang = row['Source Language'] || '';
    
    if (targetLang.toLowerCase().includes('sign') || 
        targetLang.toLowerCase() === 'asl' ||
        sourceLang.toLowerCase().includes('sign') ||
        sourceLang.toLowerCase() === 'asl') {
      
      aslCount++;
      
      const email = row['Email'] || row['Email Address'] || '';
      const phone = row['Phone'] || row['Phone Number'] || '';
      const firstName = row['First Name'] || row['FirstName'] || '';
      const lastName = row['Last Name'] || row['LastName'] || '';
      
      if (email || (firstName && lastName)) {
        const existing = await db
          .select()
          .from(interpreters)
          .where(
            email ? eq(interpreters.email, email) : 
            eq(interpreters.firstName, firstName)
          )
          .limit(1);

        if (existing.length > 0 && existing[0].targetLanguage !== 'American Sign Language (ASL)') {
          await db
            .update(interpreters)
            .set({
              targetLanguage: 'American Sign Language (ASL)',
              sourceLanguage: sourceLang || 'English',
            })
            .where(eq(interpreters.id, existing[0].id));
          
          updated++;
          console.log(`✅ Restored: ${firstName} ${lastName} - ASL`);
        }
      }
    }
  }
}

console.log(`\n✅ ASL Restoration Complete!`);
console.log(`   Found ${aslCount} ASL entries in original files`);
console.log(`   Updated ${updated} interpreters`);

await connection.end();
