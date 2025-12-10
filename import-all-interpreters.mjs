import XLSX from "xlsx";
import mysql from "mysql2/promise";
import { config } from "dotenv";
import fs from "fs";
import path from "path";

config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);

console.log("🚀 Starting comprehensive interpreter import...\n");

// Path to the master Excel file
const masterFilePath = "/home/ubuntu/FINAL_Comprehensive_All_56_Metros/MASTER_All_56_Metros_Complete.xlsx";

// Check if file exists
if (!fs.existsSync(masterFilePath)) {
  console.error("❌ Master file not found:", masterFilePath);
  process.exit(1);
}

console.log("📂 Reading master Excel file...");
const workbook = XLSX.readFile(masterFilePath);

console.log("📊 Found sheets:", workbook.SheetNames.length);
console.log("   Sheets:", workbook.SheetNames.slice(0, 10).join(", "), "...\n");

let totalImported = 0;
let totalSkipped = 0;
let totalErrors = 0;

// Process each sheet (each sheet represents a metro area)
for (const sheetName of workbook.SheetNames) {
  console.log(`\n📍 Processing: ${sheetName}`);
  
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);
  
  console.log(`   Found ${data.length} rows`);
  
  let sheetImported = 0;
  let sheetSkipped = 0;
  
  for (const row of data) {
    try {
      // Extract data from row (adjust column names based on your Excel structure)
      const firstName = row["First Name"] || row["Name"]?.split(" ")[0] || "Unknown";
      const lastName = row["Last Name"] || row["Name"]?.split(" ").slice(1).join(" ") || "Unknown";
      const phone = row["Phone"] || row["Phone Number"] || row["Contact"] || null;
      const email = row["Email"] || row["Email Address"] || null;
      const city = row["City"] || null;
      const state = row["State"] || null;
      const metro = row["Metro"] || row["Metro Area"] || sheetName;
      const source = row["Source"] || row["Registry"] || "Unknown";
      
      // Parse languages - could be comma-separated or in separate columns
      let languages = [];
      if (row["Languages"]) {
        languages = row["Languages"].toString().split(/[,;]/).map(l => l.trim()).filter(Boolean);
      } else if (row["Language"]) {
        languages = [row["Language"].toString().trim()];
      } else if (row["Language Pair"]) {
        languages = row["Language Pair"].toString().split(/[-,;>]/).map(l => l.trim()).filter(Boolean);
      }
      
      // Parse specialties
      let specialties = [];
      if (row["Specialties"]) {
        specialties = row["Specialties"].toString().split(/[,;]/).map(s => s.trim()).filter(Boolean);
      } else if (row["Specialty"]) {
        specialties = [row["Specialty"].toString().trim()];
      }
      
      const certifications = row["Certifications"] || row["Certification"] || null;
      
      // Skip if missing essential data
      if (!firstName || firstName === "Unknown" || !languages.length) {
        sheetSkipped++;
        continue;
      }
      
      // Check if interpreter already exists (by email or name+city combination)
      let exists = false;
      if (email) {
        const [existing] = await connection.execute(
          "SELECT id FROM interpreters WHERE email = ? LIMIT 1",
          [email]
        );
        exists = existing.length > 0;
      }
      
      if (!exists && city) {
        const [existing] = await connection.execute(
          "SELECT id FROM interpreters WHERE firstName = ? AND lastName = ? AND city = ? LIMIT 1",
          [firstName, lastName, city]
        );
        exists = existing.length > 0;
      }
      
      if (exists) {
        sheetSkipped++;
        continue;
      }
      
      // Insert interpreter
      await connection.execute(
        `INSERT INTO interpreters 
        (firstName, lastName, phone, email, city, state, metro, languages, specialties, certifications, source, isActive, country) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'USA')`,
        [
          firstName,
          lastName,
          phone,
          email,
          city,
          state,
          metro,
          JSON.stringify(languages),
          specialties.length > 0 ? JSON.stringify(specialties) : null,
          certifications,
          source,
        ]
      );
      
      sheetImported++;
      totalImported++;
      
      // Progress indicator
      if (sheetImported % 50 === 0) {
        process.stdout.write(".");
      }
      
    } catch (error) {
      totalErrors++;
      if (totalErrors <= 5) {
        console.error(`   ⚠️  Error importing row:`, error.message);
      }
    }
  }
  
  totalSkipped += sheetSkipped;
  console.log(`\n   ✅ Imported: ${sheetImported} | Skipped: ${sheetSkipped}`);
}

console.log("\n" + "=".repeat(60));
console.log("📊 IMPORT SUMMARY");
console.log("=".repeat(60));
console.log(`✅ Total Imported: ${totalImported}`);
console.log(`⏭️  Total Skipped:  ${totalSkipped}`);
console.log(`❌ Total Errors:   ${totalErrors}`);
console.log("=".repeat(60));

// Get final statistics
const [countResult] = await connection.execute(
  "SELECT COUNT(*) as total FROM interpreters WHERE isActive = 1"
);
const totalInterpreters = countResult[0].total;

const [langResult] = await connection.execute(`
  SELECT languages FROM interpreters WHERE isActive = 1 AND languages IS NOT NULL
`);

const allLanguages = new Set();
langResult.forEach(row => {
  try {
    const langs = JSON.parse(row.languages);
    langs.forEach(lang => allLanguages.add(lang));
  } catch (e) {
    // skip invalid JSON
  }
});

const [metroResult] = await connection.execute(`
  SELECT DISTINCT metro FROM interpreters WHERE isActive = 1 AND metro IS NOT NULL
`);

const [stateResult] = await connection.execute(`
  SELECT DISTINCT state FROM interpreters WHERE isActive = 1 AND state IS NOT NULL
`);

console.log("\n📈 DATABASE STATISTICS");
console.log("=".repeat(60));
console.log(`Total Active Interpreters: ${totalInterpreters}`);
console.log(`Unique Languages: ${allLanguages.size}`);
console.log(`Metro Areas: ${metroResult.length}`);
console.log(`States: ${stateResult.length}`);
console.log("=".repeat(60));

console.log("\n🎉 Import completed successfully!");

await connection.end();
