import { db } from "../server/db";
import { sql } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";

async function exportSQLMigration() {
  console.log("Starting SQL migration export...");
  
  const outputDir = path.join(process.cwd(), "sql-export");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Export schema
  console.log("Exporting schema...");
  const schemaSQL = `
-- DayHub Interpreter Database Schema
-- Generated: ${new Date().toISOString()}

-- Create interpreters table
CREATE TABLE IF NOT EXISTS interpreters (
  id INT AUTO_INCREMENT PRIMARY KEY,
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  source_language VARCHAR(100),
  target_language VARCHAR(100),
  city VARCHAR(100),
  state VARCHAR(50),
  zip_code VARCHAR(20),
  country VARCHAR(100) DEFAULT 'USA',
  metro VARCHAR(100),
  lat DECIMAL(10, 8),
  lng DECIMAL(11, 8),
  timezone VARCHAR(50),
  certifications TEXT,
  certification_type VARCHAR(100),
  years_experience INT,
  hourly_rate DECIMAL(10, 2),
  proficiency_level VARCHAR(50),
  rating DECIMAL(3, 2),
  active BOOLEAN DEFAULT TRUE,
  available BOOLEAN DEFAULT TRUE,
  approval_status ENUM('pending', 'approved', 'rejected') DEFAULT 'approved',
  notes TEXT,
  source VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_active TIMESTAMP,
  INDEX idx_source_language (source_language),
  INDEX idx_target_language (target_language),
  INDEX idx_city (city),
  INDEX idx_state (state),
  INDEX idx_metro (metro),
  INDEX idx_lat_lng (lat, lng),
  INDEX idx_approval_status (approval_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create zipcode_cache table
CREATE TABLE IF NOT EXISTS zipcode_cache (
  zip_code VARCHAR(10) PRIMARY KEY,
  lat DECIMAL(10, 8),
  lng DECIMAL(11, 8),
  city VARCHAR(100),
  state VARCHAR(50),
  cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_lat_lng (lat, lng)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  open_id VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  email VARCHAR(255),
  avatar_url TEXT,
  role ENUM('admin', 'user') DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_open_id (open_id),
  INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  interpreter_id INT NOT NULL,
  booking_date TIMESTAMP NOT NULL,
  duration_hours DECIMAL(4, 2),
  status ENUM('pending', 'confirmed', 'completed', 'cancelled') DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (interpreter_id) REFERENCES interpreters(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_interpreter_id (interpreter_id),
  INDEX idx_booking_date (booking_date),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create favorites table
CREATE TABLE IF NOT EXISTS favorites (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  interpreter_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (interpreter_id) REFERENCES interpreters(id) ON DELETE CASCADE,
  UNIQUE KEY unique_favorite (user_id, interpreter_id),
  INDEX idx_user_id (user_id),
  INDEX idx_interpreter_id (interpreter_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

  fs.writeFileSync(path.join(outputDir, "01-schema.sql"), schemaSQL);
  console.log("Schema exported to 01-schema.sql");

  // Export interpreters data in batches
  console.log("Exporting interpreters data...");
  const batchSize = 1000;
  let offset = 0;
  let batchNumber = 1;
  
  while (true) {
    const interpreters = await db.execute(
      sql`SELECT * FROM interpreters ORDER BY id LIMIT ${batchSize} OFFSET ${offset}`
    );
    
    const rows = interpreters[0] as any[];
    if (rows.length === 0) break;
    
    let dataSQL = `-- Interpreters data batch ${batchNumber}\n`;
    dataSQL += `-- Records ${offset + 1} to ${offset + rows.length}\n\n`;
    
    for (const row of rows) {
      const values = [
        row.id,
        escapeSQL(row.first_name),
        escapeSQL(row.last_name),
        escapeSQL(row.email),
        escapeSQL(row.phone),
        escapeSQL(row.source_language),
        escapeSQL(row.target_language),
        escapeSQL(row.city),
        escapeSQL(row.state),
        escapeSQL(row.zip_code),
        escapeSQL(row.country),
        escapeSQL(row.metro),
        row.lat || 'NULL',
        row.lng || 'NULL',
        escapeSQL(row.timezone),
        escapeSQL(row.certifications),
        escapeSQL(row.certification_type),
        row.years_experience || 'NULL',
        row.hourly_rate || 'NULL',
        escapeSQL(row.proficiency_level),
        row.rating || 'NULL',
        row.active ? 1 : 0,
        row.available ? 1 : 0,
        escapeSQL(row.approval_status),
        escapeSQL(row.notes),
        escapeSQL(row.source),
        escapeSQL(row.created_at),
        escapeSQL(row.updated_at),
        row.last_active ? escapeSQL(row.last_active) : 'NULL'
      ];
      
      dataSQL += `INSERT INTO interpreters (id, first_name, last_name, email, phone, source_language, target_language, city, state, zip_code, country, metro, lat, lng, timezone, certifications, certification_type, years_experience, hourly_rate, proficiency_level, rating, active, available, approval_status, notes, source, created_at, updated_at, last_active) VALUES (${values.join(', ')});\n`;
    }
    
    fs.writeFileSync(path.join(outputDir, `02-interpreters-batch-${batchNumber}.sql`), dataSQL);
    console.log(`Exported batch ${batchNumber} (${rows.length} records)`);
    
    offset += batchSize;
    batchNumber++;
  }

  // Export zipcode_cache
  console.log("Exporting zipcode cache...");
  const zipcodes = await db.execute(sql`SELECT * FROM zipcode_cache ORDER BY zipcode`);
  const zipRows = zipcodes[0] as any[];
  
  let zipSQL = `-- Zipcode cache data\n-- ${zipRows.length} records\n\n`;
  for (const row of zipRows) {
    const values = [
      escapeSQL(row.zipcode),
      row.lat,
      row.lng,
      escapeSQL(row.city),
      escapeSQL(row.state),
      escapeSQL(row.created_at)
    ];
    zipSQL += `INSERT INTO zipcode_cache (zip_code, lat, lng, city, state, cached_at) VALUES (${values.join(', ')});\n`;
  }
  
  fs.writeFileSync(path.join(outputDir, "03-zipcode-cache.sql"), zipSQL);
  console.log(`Exported ${zipRows.length} ZIP codes`);

  // Create README
  const readme = `# DayHub Database Migration

## Files

1. \`01-schema.sql\` - Database schema (tables, indexes, foreign keys)
2. \`02-interpreters-batch-*.sql\` - Interpreter data in batches of 1000
3. \`03-zipcode-cache.sql\` - ZIP code geocoding cache

## Import Instructions

### MySQL/MariaDB
\`\`\`bash
mysql -u username -p database_name < 01-schema.sql
mysql -u username -p database_name < 02-interpreters-batch-1.sql
mysql -u username -p database_name < 02-interpreters-batch-2.sql
# ... repeat for all batches
mysql -u username -p database_name < 03-zipcode-cache.sql
\`\`\`

### Import all files at once
\`\`\`bash
cat *.sql | mysql -u username -p database_name
\`\`\`

## Database Requirements

- MySQL 5.7+ or MariaDB 10.2+
- InnoDB storage engine
- UTF-8 (utf8mb4) character set

## Data Summary

- Total Interpreters: ${offset}
- ZIP Code Cache: ${zipRows.length} entries
- Languages: 84+
- States: 50
- Metro Areas: 72

Generated: ${new Date().toISOString()}
`;

  fs.writeFileSync(path.join(outputDir, "README.md"), readme);
  console.log("\nExport complete!");
  console.log(`Files saved to: ${outputDir}`);
  console.log(`Total interpreters exported: ${offset}`);
  console.log(`Total ZIP codes exported: ${zipRows.length}`);
}

function escapeSQL(value: any): string {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'boolean') return value ? '1' : '0';
  if (value instanceof Date) return `'${value.toISOString().slice(0, 19).replace('T', ' ')}'`;
  
  // Escape string
  const str = value.toString();
  return `'${str.replace(/'/g, "''").replace(/\\/g, '\\\\')}'`;
}

exportSQLMigration().catch(console.error).finally(() => process.exit(0));
