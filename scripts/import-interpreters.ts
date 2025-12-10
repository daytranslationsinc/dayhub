import { drizzle } from "drizzle-orm/mysql2";
import { interpreters } from "../drizzle/schema";
import * as fs from "fs";
import * as path from "path";

const db = drizzle(process.env.DATABASE_URL!);

interface InterpreterRow {
  Language: string;
  Name: string;
  City: string;
  State: string;
  Phone: string;
  Email: string;
  Source: string;
}

async function importInterpreters() {
  console.log("Starting interpreter import...");
  
  // Read the combined CSV file
  const csvPath = path.join(process.cwd(), "../all_interpreters_combined_final.csv");
  
  if (!fs.existsSync(csvPath)) {
    console.error(`CSV file not found at: ${csvPath}`);
    process.exit(1);
  }

  const csvContent = fs.readFileSync(csvPath, "utf-8");
  const lines = csvContent.split("\n");
  const headers = lines[0]!.split(",").map(h => h.trim().replace(/"/g, ""));
  
  console.log(`Found ${lines.length - 1} rows to import`);
  console.log(`Headers: ${headers.join(", ")}`);

  const batchSize = 1000;
  let imported = 0;
  let batch: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]!.trim();
    if (!line) continue;

    // Simple CSV parsing (handles basic cases)
    const values = line.split(",").map(v => v.trim().replace(/^"|"$/g, ""));
    
    const row: any = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] || "";
    });

    // Map metro from state if not present
    let metro = "";
    const state = row.State?.toUpperCase() || "";
    const city = row.City || "";
    
    // Basic metro mapping based on major cities
    if (city.toLowerCase().includes("tampa") || city.toLowerCase().includes("st. petersburg") || city.toLowerCase().includes("clearwater")) {
      metro = "Tampa-St. Petersburg-Clearwater, FL";
    } else if (city.toLowerCase().includes("miami") || city.toLowerCase().includes("fort lauderdale") || city.toLowerCase().includes("west palm")) {
      metro = "Miami-Fort Lauderdale-West Palm Beach, FL";
    } else if (city.toLowerCase().includes("orlando") || city.toLowerCase().includes("kissimmee")) {
      metro = "Orlando-Kissimmee-Sanford, FL";
    } else if (city.toLowerCase().includes("jacksonville")) {
      metro = "Jacksonville, FL";
    } else if (city.toLowerCase().includes("new york") || city.toLowerCase().includes("newark") || city.toLowerCase().includes("jersey city")) {
      metro = "New York-Newark-Jersey City, NY-NJ-PA";
    } else if (city.toLowerCase().includes("los angeles") || city.toLowerCase().includes("long beach") || city.toLowerCase().includes("anaheim")) {
      metro = "Los Angeles-Long Beach-Anaheim, CA";
    } else if (city.toLowerCase().includes("chicago") || city.toLowerCase().includes("naperville")) {
      metro = "Chicago-Naperville-Elgin, IL-IN-WI";
    } else if (city.toLowerCase().includes("houston") || city.toLowerCase().includes("woodlands") || city.toLowerCase().includes("sugar land")) {
      metro = "Houston-The Woodlands-Sugar Land, TX";
    } else if (city.toLowerCase().includes("phoenix") || city.toLowerCase().includes("mesa") || city.toLowerCase().includes("scottsdale")) {
      metro = "Phoenix-Mesa-Scottsdale, AZ";
    } else if (city.toLowerCase().includes("philadelphia") || city.toLowerCase().includes("camden") || city.toLowerCase().includes("wilmington")) {
      metro = "Philadelphia-Camden-Wilmington, PA-NJ-DE-MD";
    } else if (city.toLowerCase().includes("san antonio")) {
      metro = "San Antonio-New Braunfels, TX";
    } else if (city.toLowerCase().includes("san diego")) {
      metro = "San Diego-Carlsbad, CA";
    } else if (city.toLowerCase().includes("dallas") || city.toLowerCase().includes("fort worth") || city.toLowerCase().includes("arlington")) {
      metro = "Dallas-Fort Worth-Arlington, TX";
    } else if (city.toLowerCase().includes("san jose") || city.toLowerCase().includes("sunnyvale") || city.toLowerCase().includes("santa clara")) {
      metro = "San Jose-Sunnyvale-Santa Clara, CA";
    } else if (city.toLowerCase().includes("austin") || city.toLowerCase().includes("round rock")) {
      metro = "Austin-Round Rock, TX";
    } else if (city.toLowerCase().includes("seattle") || city.toLowerCase().includes("tacoma") || city.toLowerCase().includes("bellevue")) {
      metro = "Seattle-Tacoma-Bellevue, WA";
    } else if (city.toLowerCase().includes("denver") || city.toLowerCase().includes("aurora") || city.toLowerCase().includes("lakewood")) {
      metro = "Denver-Aurora-Lakewood, CO";
    } else if (city.toLowerCase().includes("washington") || city.toLowerCase().includes("arlington") || city.toLowerCase().includes("alexandria")) {
      metro = "Washington-Arlington-Alexandria, DC-VA-MD-WV";
    } else if (city.toLowerCase().includes("boston") || city.toLowerCase().includes("cambridge") || city.toLowerCase().includes("newton")) {
      metro = "Boston-Cambridge-Newton, MA-NH";
    } else if (city.toLowerCase().includes("atlanta") || city.toLowerCase().includes("sandy springs") || city.toLowerCase().includes("roswell")) {
      metro = "Atlanta-Sandy Springs-Roswell, GA";
    } else if (city.toLowerCase().includes("portland") && (state === "OR" || state === "WA")) {
      metro = "Portland-Vancouver-Hillsboro, OR-WA";
    } else if (city.toLowerCase().includes("baltimore") || city.toLowerCase().includes("columbia") || city.toLowerCase().includes("towson")) {
      metro = "Baltimore-Columbia-Towson, MD";
    }

    batch.push({
      name: row.Name || "Unknown",
      language: row.Language || "Unknown",
      city: row.City || null,
      state: row.State || null,
      metro: metro || null,
      phone: row.Phone || null,
      email: row.Email || null,
      source: row.Source || "Unknown",
      certifications: null,
      specialties: null,
      latitude: null,
      longitude: null,
    });

    if (batch.length >= batchSize) {
      try {
        await db.insert(interpreters).values(batch);
        imported += batch.length;
        console.log(`Imported ${imported} interpreters...`);
        batch = [];
      } catch (error) {
        console.error("Error importing batch:", error);
      }
    }
  }

  // Import remaining batch
  if (batch.length > 0) {
    try {
      await db.insert(interpreters).values(batch);
      imported += batch.length;
      console.log(`Imported ${imported} interpreters...`);
    } catch (error) {
      console.error("Error importing final batch:", error);
    }
  }

  console.log(`\n✓ Import complete! Total interpreters imported: ${imported}`);
  process.exit(0);
}

importInterpreters().catch((error) => {
  console.error("Fatal error during import:", error);
  process.exit(1);
});
