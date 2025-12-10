import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import { parse } from 'csv-parse/sync';

// State name to abbreviation map
const stateMap: Record<string, string> = {
  'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR',
  'California': 'CA', 'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE',
  'Florida': 'FL', 'Georgia': 'GA', 'Hawaii': 'HI', 'Idaho': 'ID',
  'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA', 'Kansas': 'KS',
  'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
  'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS',
  'Missouri': 'MO', 'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV',
  'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY',
  'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH', 'Oklahoma': 'OK',
  'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
  'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT',
  'Vermont': 'VT', 'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV',
  'Wisconsin': 'WI', 'Wyoming': 'WY', 'District of Columbia': 'DC',
  'Puerto Rico': 'PR', 'Guam': 'GU', 'Virgin Islands': 'VI',
};

// Normalize state to abbreviation
function normalizeState(state: string | null): string | null {
  if (!state || state.trim() === '') return null;
  const trimmed = state.trim();
  
  // If already an abbreviation (2 letters)
  if (trimmed.length === 2) return trimmed.toUpperCase();
  
  // Check if it's a full state name
  return stateMap[trimmed] || trimmed;
}

// Normalize language name
function normalizeLanguage(lang: string | null): string | null {
  if (!lang || lang.trim() === '') return null;
  
  // Trim and convert to title case
  let normalized = lang.trim();
  
  // Handle special cases
  const specialCases: Record<string, string> = {
    'ASL': 'American Sign Language',
    'AMERICAN SIGN LANGUAGE': 'American Sign Language',
    'CANTONESE': 'Chinese',
    'MANDARIN': 'Chinese',
    'FILIPINO (TAGALOG)': 'Filipino',
    'TAGALOG': 'Filipino',
    'PERSIAN (FARSI)': 'Persian',
    'FARSI': 'Persian',
  };
  
  const upper = normalized.toUpperCase();
  if (specialCases[upper]) {
    return specialCases[upper];
  }
  
  // Convert to title case
  return normalized
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Parse name into first and last
function parseName(fullName: string): { firstName: string; lastName: string } {
  if (!fullName || fullName.trim() === '') {
    return { firstName: '', lastName: '' };
  }
  
  // Handle "Last, First" format
  if (fullName.includes(',')) {
    const [last, first] = fullName.split(',').map(s => s.trim());
    return { firstName: first || '', lastName: last || '' };
  }
  
  // Handle "First Last" format
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) {
    return { firstName: '', lastName: parts[0] };
  }
  
  const firstName = parts.slice(0, -1).join(' ');
  const lastName = parts[parts.length - 1];
  return { firstName, lastName };
}

// Normalize phone number
function normalizePhone(phone: string | null): string | null {
  if (!phone) return null;
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 0) return null;
  return digits;
}

async function importAndDeduplicate() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  
  console.log('=== Import and Deduplication Script ===\n');
  
  // Read CSV file
  const csvPath = '/home/ubuntu/upload/EXPANDED_INTERPRETER_DATABASE.csv';
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true, // Allow varying column counts
    relax_quotes: true, // Be flexible with quotes
  });
  
  console.log(`📄 Loaded ${records.length} records from CSV\n`);
  
  // Get existing interpreters for duplicate detection
  const [existing] = await conn.query(`
    SELECT id, firstName, lastName, email, phone 
    FROM interpreters
  `);
  
  const existingInterpreters = existing as any[];
  console.log(`📊 Current database has ${existingInterpreters.length} interpreters\n`);
  
  // Build lookup maps for duplicate detection
  const emailMap = new Map<string, number>();
  const phoneMap = new Map<string, number>();
  const nameMap = new Map<string, number>();
  
  existingInterpreters.forEach(interp => {
    if (interp.email) {
      emailMap.set(interp.email.toLowerCase().trim(), interp.id);
    }
    if (interp.phone) {
      const normalized = normalizePhone(interp.phone);
      if (normalized) phoneMap.set(normalized, interp.id);
    }
    const nameKey = `${interp.firstName?.toLowerCase().trim()}|${interp.lastName?.toLowerCase().trim()}`;
    nameMap.set(nameKey, interp.id);
  });
  
  let imported = 0;
  let duplicates = 0;
  let errors = 0;
  
  console.log('🔄 Processing records...\n');
  
  for (const record of records) {
    try {
      const { firstName, lastName } = parseName(record.Name);
      const email = record.Email?.trim() || null;
      const phone = record.Phone?.trim() || null;
      const sourceLanguage = normalizeLanguage(record['Source Language']);
      const targetLanguage = normalizeLanguage(record['Target Language']);
      const city = record.City?.trim() || null;
      const state = normalizeState(record.State);
      const zipCode = record['ZIP Code']?.trim() || null;
      const notes = record.Notes?.trim() || null;
      
      // Check for duplicates
      let isDuplicate = false;
      
      if (email && emailMap.has(email.toLowerCase())) {
        isDuplicate = true;
      } else if (phone) {
        const normalizedPhone = normalizePhone(phone);
        if (normalizedPhone && phoneMap.has(normalizedPhone)) {
          isDuplicate = true;
        }
      } else {
        const nameKey = `${firstName?.toLowerCase().trim()}|${lastName?.toLowerCase().trim()}`;
        if (nameMap.has(nameKey)) {
          isDuplicate = true;
        }
      }
      
      if (isDuplicate) {
        duplicates++;
        continue;
      }
      
      // Insert new interpreter
      await conn.query(`
        INSERT INTO interpreters (
          firstName, lastName, email, phone,
          sourceLanguage, targetLanguage,
          city, state, zipCode, notes,
          isActive, is_available, country
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 'USA')
      `, [
        firstName, lastName, email, phone,
        sourceLanguage, targetLanguage,
        city, state, zipCode, notes
      ]);
      
      imported++;
      
      // Add to maps to prevent duplicates within the CSV
      if (email) emailMap.set(email.toLowerCase(), -1);
      if (phone) {
        const normalized = normalizePhone(phone);
        if (normalized) phoneMap.set(normalized, -1);
      }
      const nameKey = `${firstName?.toLowerCase().trim()}|${lastName?.toLowerCase().trim()}`;
      nameMap.set(nameKey, -1);
      
    } catch (error) {
      errors++;
      console.error(`Error processing record: ${record.Name}`, error);
    }
  }
  
  console.log('\n✅ Import Complete!\n');
  console.log(`📊 Results:`);
  console.log(`  - Records in CSV: ${records.length}`);
  console.log(`  - Imported: ${imported}`);
  console.log(`  - Duplicates skipped: ${duplicates}`);
  console.log(`  - Errors: ${errors}`);
  
  // Get final count
  const [finalCount] = await conn.query('SELECT COUNT(*) as count FROM interpreters');
  console.log(`\n📈 Total interpreters in database: ${(finalCount as any)[0].count}`);
  
  await conn.end();
}

importAndDeduplicate().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
