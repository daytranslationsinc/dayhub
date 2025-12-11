import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Railway public MySQL URL
const RAILWAY_URL = process.env.DATABASE_URL || "mysql://root:LTNgphcMOaDoNLqgFqMXiDoWYQlBkmpf@yamanote.proxy.rlwy.net:12567/railway";

async function importData() {
  console.log("Connecting to Railway MySQL...");
  const conn = await mysql.createConnection(RAILWAY_URL);
  console.log("Connected!");

  try {
    // Step 1: Temporarily allow NULL values in required columns
    console.log("\nTemporarily modifying schema to allow NULLs...");
    await conn.execute(`ALTER TABLE interpreters MODIFY firstName VARCHAR(255) NULL`);
    await conn.execute(`ALTER TABLE interpreters MODIFY lastName VARCHAR(255) NULL`);
    await conn.execute(`ALTER TABLE interpreters MODIFY targetLanguage VARCHAR(100) NULL`);
    await conn.execute(`ALTER TABLE interpreters MODIFY createdAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP`);
    await conn.execute(`ALTER TABLE interpreters MODIFY updatedAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`);
    console.log("Schema modified.");

    // Read all batch files
    const sqlExportDir = path.join(__dirname, "..", "sql-export");
    const files = fs.readdirSync(sqlExportDir)
      .filter(f => f.startsWith("02-interpreters-batch"))
      .sort();

    console.log(`Found ${files.length} batch files to import`);

    let totalImported = 0;

    for (const file of files) {
      console.log(`\nProcessing ${file}...`);
      const content = fs.readFileSync(path.join(sqlExportDir, file), "utf-8");

      // Transform the INSERT statements
      let transformedContent = content
        .replace(/first_name/g, "firstName")
        .replace(/last_name/g, "lastName")
        .replace(/source_language/g, "sourceLanguage")
        .replace(/target_language/g, "targetLanguage")
        .replace(/zip_code/g, "zipCode")
        .replace(/years_experience/g, "years_of_experience")
        .replace(/, active,/g, ", isActive,")
        .replace(/, available,/g, ", is_available,")
        .replace(/created_at/g, "createdAt")
        .replace(/updated_at/g, "updatedAt");

      // Split into individual INSERT statements
      const statements = transformedContent
        .split(";")
        .filter(s => s.trim().startsWith("INSERT"));

      let batchCount = 0;
      for (const stmt of statements) {
        try {
          await conn.execute(stmt);
          batchCount++;
          totalImported++;
        } catch (err) {
          // Skip duplicates and show other errors
          if (!err.message.includes("Duplicate")) {
            console.error(`Error: ${err.message.substring(0, 80)}`);
          }
        }
      }

      console.log(`Imported ${batchCount} records from ${file}`);
    }

    console.log(`\n✅ Total records imported: ${totalImported}`);

    // Step 2: Update NULL values with defaults
    console.log("\nUpdating NULL values with defaults...");
    await conn.execute(`UPDATE interpreters SET firstName = 'Unknown' WHERE firstName IS NULL`);
    await conn.execute(`UPDATE interpreters SET lastName = 'Unknown' WHERE lastName IS NULL`);
    await conn.execute(`UPDATE interpreters SET targetLanguage = 'Spanish' WHERE targetLanguage IS NULL`);
    await conn.execute(`UPDATE interpreters SET createdAt = NOW() WHERE createdAt IS NULL`);
    await conn.execute(`UPDATE interpreters SET updatedAt = NOW() WHERE updatedAt IS NULL`);
    console.log("Defaults applied.");

    // Step 3: Restore NOT NULL constraints
    console.log("\nRestoring NOT NULL constraints...");
    await conn.execute(`ALTER TABLE interpreters MODIFY firstName VARCHAR(255) NOT NULL`);
    await conn.execute(`ALTER TABLE interpreters MODIFY lastName VARCHAR(255) NOT NULL`);
    await conn.execute(`ALTER TABLE interpreters MODIFY targetLanguage VARCHAR(100) NOT NULL`);
    await conn.execute(`ALTER TABLE interpreters MODIFY createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`);
    await conn.execute(`ALTER TABLE interpreters MODIFY updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`);
    console.log("Constraints restored.");

    // Now import zipcode cache
    console.log("\n\nImporting zipcode cache...");
    const zipcodeFile = path.join(sqlExportDir, "03-zipcode-cache.sql");
    if (fs.existsSync(zipcodeFile)) {
      const zipcodeContent = fs.readFileSync(zipcodeFile, "utf-8");

      // Transform column names
      const transformedZipcode = zipcodeContent
        .replace(/zip_code/g, "zipCode")
        .replace(/cached_at/g, "cachedAt");

      const zipcodeStatements = transformedZipcode
        .split(";")
        .filter(s => s.trim().startsWith("INSERT"));

      let zipCount = 0;
      for (const stmt of zipcodeStatements) {
        try {
          await conn.execute(stmt);
          zipCount++;
        } catch (err) {
          if (!err.message.includes("Duplicate")) {
            console.error(`Zipcode error: ${err.message.substring(0, 60)}`);
          }
        }
      }
      console.log(`Imported ${zipCount} zipcode records`);
    }

    // Show final counts
    const [interpreterCount] = await conn.execute(`SELECT COUNT(*) as count FROM interpreters`);
    console.log(`\n📊 Final interpreter count: ${interpreterCount[0].count}`);

  } finally {
    await conn.end();
    console.log("\nDone!");
  }
}

importData().catch(console.error);
