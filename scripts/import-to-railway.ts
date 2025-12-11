import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";

// Railway public MySQL URL
const RAILWAY_URL = process.env.DATABASE_URL || "mysql://root:LTNgphcMOaDoNLqgFqMXiDoWYQlBkmpf@yamanote.proxy.rlwy.net:12567/railway";

async function importData() {
  console.log("Connecting to Railway MySQL...");
  const conn = await mysql.createConnection(RAILWAY_URL);
  console.log("Connected!");

  try {
    // Read all batch files
    const sqlExportDir = path.join(process.cwd(), "sql-export");
    const files = fs.readdirSync(sqlExportDir)
      .filter(f => f.startsWith("02-interpreters-batch"))
      .sort();

    console.log(`Found ${files.length} batch files to import`);

    let totalImported = 0;

    for (const file of files) {
      console.log(`\nProcessing ${file}...`);
      const content = fs.readFileSync(path.join(sqlExportDir, file), "utf-8");

      // Parse INSERT statements
      const insertRegex = /INSERT INTO interpreters \([^)]+\) VALUES \(([^;]+)\);/g;
      let match;
      let batchCount = 0;

      while ((match = insertRegex.exec(content)) !== null) {
        try {
          const values = match[1];

          // Parse values - this is a simple parser, may need adjustment
          const parsed = parseInsertValues(values);

          if (parsed) {
            // Map old schema to new schema
            const newInsert = `
              INSERT INTO interpreters
              (firstName, lastName, email, phone, sourceLanguage, targetLanguage, city, state, zipCode, country, metro, lat, lng, timezone, certifications, certification_type, years_of_experience, hourly_rate, proficiency_level, rating, isActive, is_available, approval_status, notes, source, createdAt, updatedAt, last_active)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), ?)
              ON DUPLICATE KEY UPDATE updatedAt = NOW()
            `;

            await conn.execute(newInsert, [
              parsed.first_name || "Unknown",
              parsed.last_name || "Unknown",
              parsed.email,
              parsed.phone,
              parsed.source_language || "English",
              parsed.target_language || "Spanish",
              parsed.city,
              parsed.state,
              parsed.zip_code,
              parsed.country || "USA",
              parsed.metro,
              parsed.lat,
              parsed.lng,
              parsed.timezone,
              parsed.certifications,
              parsed.certification_type,
              parsed.years_experience,
              parsed.hourly_rate,
              parsed.proficiency_level,
              parsed.rating || 0,
              parsed.active ? 1 : 0,
              parsed.available ? 1 : 0,
              parsed.approval_status || "approved",
              parsed.notes,
              parsed.source,
              parsed.last_active,
            ]);

            batchCount++;
            totalImported++;
          }
        } catch (err: any) {
          console.error(`Error inserting record: ${err.message}`);
        }
      }

      console.log(`Imported ${batchCount} records from ${file}`);
    }

    console.log(`\n✅ Total records imported: ${totalImported}`);

  } finally {
    await conn.end();
  }
}

function parseInsertValues(valuesStr: string): Record<string, any> | null {
  // Column order from the export:
  // id, first_name, last_name, email, phone, source_language, target_language, city, state, zip_code,
  // country, metro, lat, lng, timezone, certifications, certification_type, years_experience,
  // hourly_rate, proficiency_level, rating, active, available, approval_status, notes, source,
  // created_at, updated_at, last_active

  try {
    const values: any[] = [];
    let current = "";
    let inString = false;
    let escaped = false;

    for (let i = 0; i < valuesStr.length; i++) {
      const char = valuesStr[i];

      if (escaped) {
        current += char;
        escaped = false;
        continue;
      }

      if (char === "\\") {
        escaped = true;
        current += char;
        continue;
      }

      if (char === "'") {
        inString = !inString;
        current += char;
        continue;
      }

      if (char === "," && !inString) {
        values.push(parseValue(current.trim()));
        current = "";
        continue;
      }

      current += char;
    }

    // Don't forget the last value
    if (current.trim()) {
      values.push(parseValue(current.trim()));
    }

    return {
      id: values[0],
      first_name: values[1],
      last_name: values[2],
      email: values[3],
      phone: values[4],
      source_language: values[5],
      target_language: values[6],
      city: values[7],
      state: values[8],
      zip_code: values[9],
      country: values[10],
      metro: values[11],
      lat: values[12],
      lng: values[13],
      timezone: values[14],
      certifications: values[15],
      certification_type: values[16],
      years_experience: values[17],
      hourly_rate: values[18],
      proficiency_level: values[19],
      rating: values[20],
      active: values[21],
      available: values[22],
      approval_status: values[23],
      notes: values[24],
      source: values[25],
      created_at: values[26],
      updated_at: values[27],
      last_active: values[28],
    };
  } catch (err) {
    console.error("Parse error:", err);
    return null;
  }
}

function parseValue(val: string): any {
  if (val === "NULL") return null;
  if (val.startsWith("'") && val.endsWith("'")) {
    return val.slice(1, -1).replace(/\\'/g, "'");
  }
  if (!isNaN(Number(val))) return Number(val);
  return val;
}

importData().catch(console.error);
