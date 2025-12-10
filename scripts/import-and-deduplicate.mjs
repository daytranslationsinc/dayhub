#!/usr/bin/env node
/**
 * Import new interpreters from CSV with comprehensive deduplication and data harmonization
 */

import fs from 'fs';
import { parse } from 'csv-parse/sync';
import mysql from 'mysql2/promise';
import { geocodeAddress } from '../server/geocoding.ts';

const DATABASE_URL = process.env.DATABASE_URL;
const CSV_PATH = '/home/ubuntu/upload/FINAL_INTERPRETER_DATABASE.csv';

if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable not set');
  process.exit(1);
}

// Normalize string for comparison (lowercase, trim, remove special chars)
function normalize(str) {
  if (!str) return '';
  return str.toString().toLowerCase().trim().replace(/[^a-z0-9]/g, '');
}

// Standardize language names
function standardizeLanguage(lang) {
  if (!lang) return null;
  
  const cleaned = lang.trim();
  
  // Common mappings
  const mappings = {
    'haitian creole': 'Haitian Creole',
    'haitian': 'Haitian Creole',
    'creole': 'Haitian Creole',
    'mandarin': 'Chinese (Mandarin)',
    'cantonese': 'Chinese (Cantonese)',
    'asl': 'American Sign Language',
    'sign language': 'American Sign Language',
    'spanish': 'Spanish',
    'french': 'French',
    'arabic': 'Arabic',
    'russian': 'Russian',
    'portuguese': 'Portuguese',
    'vietnamese': 'Vietnamese',
    'korean': 'Korean',
    'japanese': 'Japanese',
    'german': 'German',
    'italian': 'Italian',
    'polish': 'Polish',
    'tagalog': 'Tagalog',
    'navajo': 'Navajo',
  };
  
  const normalized = cleaned.toLowerCase();
  if (mappings[normalized]) {
    return mappings[normalized];
  }
  
  // Title case for others
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

// Standardize city names
function standardizeCity(city) {
  if (!city) return null;
  return city.trim().split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
}

// Determine metro area from city/state
function determineMetro(city, state) {
  if (!city || !state) return null;
  
  const cityLower = city.toLowerCase();
  const stateUpper = state.toUpperCase();
  
  // Major metro mappings
  const metroMappings = {
    'miami': 'Miami-Fort Lauderdale-West Palm Beach FL',
    'fort lauderdale': 'Miami-Fort Lauderdale-West Palm Beach FL',
    'west palm beach': 'Miami-Fort Lauderdale-West Palm Beach FL',
    'miramar': 'Miami-Fort Lauderdale-West Palm Beach FL',
    'brooklyn': 'New York-Newark-Jersey City NY-NJ-PA',
    'new york': 'New York-Newark-Jersey City NY-NJ-PA',
    'manhattan': 'New York-Newark-Jersey City NY-NJ-PA',
    'queens': 'New York-Newark-Jersey City NY-NJ-PA',
    'bronx': 'New York-Newark-Jersey City NY-NJ-PA',
    'los angeles': 'Los Angeles-Long Beach-Anaheim CA',
    'long beach': 'Los Angeles-Long Beach-Anaheim CA',
    'anaheim': 'Los Angeles-Long Beach-Anaheim CA',
    'chicago': 'Chicago-Naperville-Elgin IL-IN-WI',
    'seattle': 'Seattle-Tacoma-Bellevue WA',
    'boston': 'Boston-Cambridge-Newton MA-NH',
    'philadelphia': 'Philadelphia-Camden-Wilmington PA-NJ-DE-MD',
    'phoenix': 'Phoenix-Mesa-Scottsdale AZ',
    'mesa': 'Phoenix-Mesa-Scottsdale AZ',
    'scottsdale': 'Phoenix-Mesa-Scottsdale AZ',
    'san francisco': 'San Francisco-Oakland-Hayward CA',
    'oakland': 'San Francisco-Oakland-Hayward CA',
    'detroit': 'Detroit-Warren-Dearborn MI',
    'atlanta': 'Atlanta-Sandy Springs-Roswell GA',
    'houston': 'Houston-The Woodlands-Sugar Land TX',
    'dallas': 'Dallas-Fort Worth-Arlington TX',
    'washington': 'Washington-Arlington-Alexandria DC-VA-MD-WV',
  };
  
  for (const [key, metro] of Object.entries(metroMappings)) {
    if (cityLower.includes(key)) {
      return metro;
    }
  }
  
  return null;
}

async function main() {
  console.log('🚀 Starting comprehensive import with deduplication...\n');
  
  // Read CSV
  const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true, // Allow inconsistent column counts
    skip_records_with_error: true, // Skip malformed records
  });
  
  console.log(`📄 Loaded ${records.length} records from CSV\n`);
  
  // Connect to database
  const connection = await mysql.createConnection(DATABASE_URL);
  
  try {
    // Get existing interpreters for deduplication
    const [existing] = await connection.query(`
      SELECT id, firstName, lastName, phone, email
      FROM interpreters
    `);
    
    console.log(`📊 Found ${existing.length} existing interpreters in database\n`);
    
    // Build deduplication index
    const existingIndex = new Set();
    existing.forEach(row => {
      const nameKey = normalize(`${row.firstName} ${row.lastName}`);
      const phoneKey = normalize(row.phone);
      const emailKey = normalize(row.email);
      
      if (nameKey) existingIndex.add(`name:${nameKey}`);
      if (phoneKey) existingIndex.add(`phone:${phoneKey}`);
      if (emailKey) existingIndex.add(`email:${emailKey}`);
    });
    
    // Process records
    let imported = 0;
    let duplicates = 0;
    let errors = 0;
    let geocoded = 0;
    
    for (const record of records) {
      try {
        // Parse name
        const nameParts = record.Name.split(',').map(s => s.trim());
        const lastName = nameParts[0] || '';
        const firstName = nameParts[1] || '';
        
        // Check for duplicates
        const nameKey = normalize(`${firstName} ${lastName}`);
        const phoneKey = normalize(record.Phone);
        const emailKey = normalize(record.Email);
        
        if (existingIndex.has(`name:${nameKey}`) || 
            existingIndex.has(`phone:${phoneKey}`) || 
            existingIndex.has(`email:${emailKey}`)) {
          console.log(`⏭️  Skipping duplicate: ${firstName} ${lastName}`);
          duplicates++;
          continue;
        }
        
        // Standardize data
        const sourceLanguage = standardizeLanguage(record['Source Language']) || 'English';
        const targetLanguage = standardizeLanguage(record['Target Language']);
        const city = standardizeCity(record.City);
        const state = record.State?.toUpperCase() || null;
        const metro = determineMetro(city, state);
        const zipCode = record['ZIP Code'] || null;
        
        // Skip geocoding for now due to rate limits - will geocode separately
        let lat = null;
        let lng = null;
        
        // Insert interpreter
        await connection.query(`
          INSERT INTO interpreters (
            firstName, lastName, phone, email,
            sourceLanguage, targetLanguage,
            city, state, zipCode, metro,
            lat, lng,
            notes, isActive
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          firstName, lastName,
          record.Phone || null,
          record.Email || null,
          sourceLanguage, targetLanguage,
          city, state, zipCode, metro,
          lat, lng,
          record.Notes || null,
          true
        ]);
        
        // Add to index
        if (nameKey) existingIndex.add(`name:${nameKey}`);
        if (phoneKey) existingIndex.add(`phone:${phoneKey}`);
        if (emailKey) existingIndex.add(`email:${emailKey}`);
        
        console.log(`✅ Imported: ${firstName} ${lastName} (${targetLanguage})${lat ? ' [geocoded]' : ''}`);
        imported++;
        
      } catch (error) {
        console.error(`❌ Error importing ${record.Name}: ${error.message}`);
        errors++;
      }
    }
    
    console.log(`\n📊 Import Summary:`);
    console.log(`   ✅ Imported: ${imported}`);
    console.log(`   📍 Geocoded: ${geocoded}`);
    console.log(`   ⏭️  Duplicates skipped: ${duplicates}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`   📈 Total in database: ${existing.length + imported}`);
    
  } finally {
    await connection.end();
  }
}

main().catch(console.error);
