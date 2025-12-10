import XLSX from "xlsx";
import mysql from "mysql2/promise";
import { config } from "dotenv";
import { readdir } from "fs/promises";
import { join } from "path";

config();

console.log("🚀 Starting interpreter import from individual metro files...\n");

const connection = await mysql.createConnection(process.env.DATABASE_URL);

const dataDir = "/home/ubuntu/FINAL_Comprehensive_All_56_Metros";

// Get all Excel files except summary and master
const files = await readdir(dataDir);
const excelFiles = files.filter(f => 
  f.endsWith('.xlsx') && 
  !f.startsWith('00_SUMMARY') && 
  !f.startsWith('MASTER') &&
  !f.startsWith('COMPREHENSIVE')
);

console.log(`📂 Found ${excelFiles.length} metro files to process\n`);

let totalImported = 0;
let totalSkipped = 0;
let totalErrors = 0;

for (const filename of excelFiles.sort()) {
  const metroName = filename.replace('.xlsx', '').replace(/_/g, ' ');
  console.log(`\n📍 Processing: ${metroName}`);
  
  try {
    const filePath = join(dataDir, filename);
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    console.log(`   Found ${data.length} rows`);
    
    let sheetImported = 0;
    let sheetSkipped = 0;
    
    for (const row of data) {
      try {
        // Extract and clean data
        const fullName = String(row.Name || '').trim();
        if (!fullName || fullName === 'undefined') {
          sheetSkipped++;
          continue;
        }
        
        const nameParts = fullName.split(/\s+/);
        const firstName = nameParts[0] || 'Unknown';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        const language = String(row.Language || '').trim();
        if (!language || language === 'undefined') {
          sheetSkipped++;
          continue;
        }
        
        // Parse languages (could be comma-separated)
        const languages = language.split(/[,;]/).map(l => l.trim()).filter(Boolean);
        
        const city = row.City ? String(row.City).trim() : null;
        const state = row.State ? String(row.State).trim() : null;
        const phone = row.Phone ? String(row.Phone).trim() : null;
        const email = row.Email ? String(row.Email).trim() : null;
        const source = row.Source ? String(row.Source).trim() : 'Unknown';
        
        // Check for duplicates
        if (email && email !== 'undefined') {
          const [existing] = await connection.execute(
            "SELECT id FROM interpreters WHERE email = ? LIMIT 1",
            [email]
          );
          if (existing.length > 0) {
            sheetSkipped++;
            continue;
          }
        }
        
        if (city && firstName && lastName) {
          const [existing] = await connection.execute(
            "SELECT id FROM interpreters WHERE firstName = ? AND lastName = ? AND city = ? LIMIT 1",
            [firstName, lastName, city]
          );
          if (existing.length > 0) {
            sheetSkipped++;
            continue;
          }
        }
        
        // Insert interpreter
        await connection.execute(
          `INSERT INTO interpreters 
          (firstName, lastName, phone, email, city, state, metro, languages, source, isActive, country) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'USA')`,
          [
            firstName,
            lastName,
            phone,
            email,
            city,
            state,
            metroName,
            JSON.stringify(languages),
            source,
          ]
        );
        
        sheetImported++;
        totalImported++;
        
        // Progress indicator
        if (sheetImported % 100 === 0) {
          process.stdout.write(".");
        }
        
      } catch (error) {
        totalErrors++;
        if (totalErrors <= 5) {
          console.error(`\n   ⚠️  Row error: ${error.message}`);
        }
      }
    }
    
    totalSkipped += sheetSkipped;
    console.log(`\n   ✅ Imported: ${sheetImported} | Skipped: ${sheetSkipped}`);
    
  } catch (error) {
    console.error(`   ❌ File error: ${error.message}`);
    totalErrors++;
  }
}

console.log("\n" + "=".repeat(70));
console.log("📊 IMPORT SUMMARY");
console.log("=".repeat(70));
console.log(`✅ Total Imported: ${totalImported}`);
console.log(`⏭️  Total Skipped:  ${totalSkipped}`);
console.log(`❌ Total Errors:   ${totalErrors}`);
console.log("=".repeat(70));

// Get final statistics
const [countResult] = await connection.execute(
  "SELECT COUNT(*) as total FROM interpreters WHERE isActive = 1"
);
const totalInterpreters = countResult[0].total;

const [metroResult] = await connection.execute(
  "SELECT DISTINCT metro FROM interpreters WHERE isActive = 1 AND metro IS NOT NULL ORDER BY metro"
);

const [stateResult] = await connection.execute(
  "SELECT DISTINCT state FROM interpreters WHERE isActive = 1 AND state IS NOT NULL ORDER BY state"
);

const [langResult] = await connection.execute(
  "SELECT languages FROM interpreters WHERE isActive = 1 AND languages IS NOT NULL"
);

const allLanguages = new Set();
langResult.forEach(row => {
  try {
    const langs = JSON.parse(row.languages);
    langs.forEach(lang => allLanguages.add(lang));
  } catch (e) {
    // skip invalid JSON
  }
});

console.log("\n📈 FINAL DATABASE STATISTICS");
console.log("=".repeat(70));
console.log(`Total Active Interpreters: ${totalInterpreters}`);
console.log(`Unique Languages: ${allLanguages.size}`);
console.log(`Metro Areas: ${metroResult.length}`);
console.log(`States: ${stateResult.length}`);
console.log("=".repeat(70));

console.log("\n🌎 Metro Areas:");
metroResult.slice(0, 20).forEach(m => console.log(`   - ${m.metro}`));
if (metroResult.length > 20) {
  console.log(`   ... and ${metroResult.length - 20} more`);
}

console.log("\n🗣️  Sample Languages:");
Array.from(allLanguages).slice(0, 30).forEach(lang => console.log(`   - ${lang}`));
if (allLanguages.size > 30) {
  console.log(`   ... and ${allLanguages.size - 30} more`);
}

console.log("\n🎉 Import completed successfully!");

await connection.end();
