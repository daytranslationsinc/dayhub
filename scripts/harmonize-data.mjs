#!/usr/bin/env node
/**
 * Harmonize and deduplicate languages, metros, and cities
 */

import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable not set');
  process.exit(1);
}

// Language standardization mappings
const languageMappings = {
  // Variations → Standard
  'haitian creole': 'Haitian Creole',
  'haitian': 'Haitian Creole',
  'creole': 'Haitian Creole',
  'mandarin': 'Chinese (Mandarin)',
  'cantonese': 'Chinese (Cantonese)',
  'chinese': 'Chinese (Mandarin)',
  'asl': 'American Sign Language',
  'sign language': 'American Sign Language',
  'american sign language (asl)': 'American Sign Language',
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
  'somali': 'Somali',
  'swahili': 'Swahili',
  'hindi': 'Hindi',
  'urdu': 'Urdu',
  'bengali': 'Bengali',
  'punjabi': 'Punjabi',
  'tamil': 'Tamil',
  'telugu': 'Telugu',
  'gujarati': 'Gujarati',
  'farsi': 'Farsi (Persian)',
  'persian': 'Farsi (Persian)',
  'dari': 'Dari',
  'pashto': 'Pashto',
  'turkish': 'Turkish',
  'ukrainian': 'Ukrainian',
  'romanian': 'Romanian',
  'hungarian': 'Hungarian',
  'czech': 'Czech',
  'slovak': 'Slovak',
  'bulgarian': 'Bulgarian',
  'serbian': 'Serbian',
  'croatian': 'Croatian',
  'bosnian': 'Bosnian',
  'albanian': 'Albanian',
  'greek': 'Greek',
  'hebrew': 'Hebrew',
  'yiddish': 'Yiddish',
  'amharic': 'Amharic',
  'tigrinya': 'Tigrinya',
  'oromo': 'Oromo',
  'yoruba': 'Yoruba',
  'igbo': 'Igbo',
  'zulu': 'Zulu',
  'xhosa': 'Xhosa',
  'afrikaans': 'Afrikaans',
  'thai': 'Thai',
  'lao': 'Lao',
  'khmer': 'Khmer (Cambodian)',
  'cambodian': 'Khmer (Cambodian)',
  'burmese': 'Burmese',
  'nepali': 'Nepali',
  'sinhala': 'Sinhala',
  'malayalam': 'Malayalam',
  'kannada': 'Kannada',
  'marathi': 'Marathi',
  'indonesian': 'Indonesian',
  'malay': 'Malay',
  'dutch': 'Dutch',
  'swedish': 'Swedish',
  'norwegian': 'Norwegian',
  'danish': 'Danish',
  'finnish': 'Finnish',
  'icelandic': 'Icelandic',
};

function standardizeLanguage(lang) {
  if (!lang) return null;
  
  const normalized = lang.trim().toLowerCase();
  
  // Check mappings first
  if (languageMappings[normalized]) {
    return languageMappings[normalized];
  }
  
  // Title case for unmapped languages
  return lang.trim().split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
}

function standardizeCity(city) {
  if (!city) return null;
  
  return city.trim().split(' ').map(word => {
    // Handle special cases like "St." or "Ft."
    if (word.toLowerCase() === 'st.' || word.toLowerCase() === 'st') return 'St.';
    if (word.toLowerCase() === 'ft.' || word.toLowerCase() === 'ft') return 'Ft.';
    if (word.toLowerCase() === 'mt.' || word.toLowerCase() === 'mt') return 'Mt.';
    
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).join(' ');
}

function standardizeMetro(metro) {
  if (!metro) return null;
  
  // Remove extra spaces and normalize
  return metro.trim().replace(/\s+/g, ' ');
}

async function main() {
  console.log('🔧 Starting data harmonization...\n');
  
  const connection = await mysql.createConnection(DATABASE_URL);
  
  try {
    // 1. Harmonize Languages
    console.log('📚 Harmonizing languages...');
    const [languages] = await connection.query(`
      SELECT DISTINCT targetLanguage, COUNT(*) as count
      FROM interpreters
      WHERE targetLanguage IS NOT NULL
      GROUP BY targetLanguage
      ORDER BY count DESC
    `);
    
    console.log(`   Found ${languages.length} unique target languages\n`);
    
    const languageUpdates = new Map();
    languages.forEach(row => {
      const original = row.targetLanguage;
      const standardized = standardizeLanguage(original);
      
      if (standardized && original !== standardized) {
        languageUpdates.set(original, standardized);
        console.log(`   ${original} → ${standardized} (${row.count} interpreters)`);
      }
    });
    
    // Apply language updates
    for (const [original, standardized] of languageUpdates) {
      await connection.query(`
        UPDATE interpreters
        SET targetLanguage = ?
        WHERE targetLanguage = ?
      `, [standardized, original]);
    }
    
    console.log(`\n   ✅ Updated ${languageUpdates.size} language variations\n`);
    
    // 2. Harmonize Cities
    console.log('🏙️  Harmonizing cities...');
    const [cities] = await connection.query(`
      SELECT DISTINCT city, COUNT(*) as count
      FROM interpreters
      WHERE city IS NOT NULL
      GROUP BY city
      ORDER BY count DESC
    `);
    
    console.log(`   Found ${cities.length} unique cities\n`);
    
    const cityUpdates = new Map();
    cities.forEach(row => {
      const original = row.city;
      const standardized = standardizeCity(original);
      
      if (standardized && original !== standardized) {
        cityUpdates.set(original, standardized);
        console.log(`   ${original} → ${standardized} (${row.count} interpreters)`);
      }
    });
    
    // Apply city updates
    for (const [original, standardized] of cityUpdates) {
      await connection.query(`
        UPDATE interpreters
        SET city = ?
        WHERE city = ?
      `, [standardized, original]);
    }
    
    console.log(`\n   ✅ Updated ${cityUpdates.size} city variations\n`);
    
    // 3. Harmonize Metros
    console.log('🌆 Harmonizing metro areas...');
    const [metros] = await connection.query(`
      SELECT DISTINCT metro, COUNT(*) as count
      FROM interpreters
      WHERE metro IS NOT NULL
      GROUP BY metro
      ORDER BY count DESC
    `);
    
    console.log(`   Found ${metros.length} unique metro areas\n`);
    
    const metroUpdates = new Map();
    metros.forEach(row => {
      const original = row.metro;
      const standardized = standardizeMetro(original);
      
      if (standardized && original !== standardized) {
        metroUpdates.set(original, standardized);
        console.log(`   ${original} → ${standardized} (${row.count} interpreters)`);
      }
    });
    
    // Apply metro updates
    for (const [original, standardized] of metroUpdates) {
      await connection.query(`
        UPDATE interpreters
        SET metro = ?
        WHERE metro = ?
      `, [standardized, original]);
    }
    
    console.log(`\n   ✅ Updated ${metroUpdates.size} metro variations\n`);
    
    // 4. Final Statistics
    const [finalLanguages] = await connection.query(`
      SELECT COUNT(DISTINCT targetLanguage) as count
      FROM interpreters
      WHERE targetLanguage IS NOT NULL
    `);
    
    const [finalCities] = await connection.query(`
      SELECT COUNT(DISTINCT city) as count
      FROM interpreters
      WHERE city IS NOT NULL
    `);
    
    const [finalMetros] = await connection.query(`
      SELECT COUNT(DISTINCT metro) as count
      FROM interpreters
      WHERE metro IS NOT NULL
    `);
    
    console.log('📊 Final Statistics:');
    console.log(`   Languages: ${finalLanguages[0].count}`);
    console.log(`   Cities: ${finalCities[0].count}`);
    console.log(`   Metro Areas: ${finalMetros[0].count}`);
    
  } finally {
    await connection.end();
  }
}

main().catch(console.error);
