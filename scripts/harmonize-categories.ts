import mysql from 'mysql2/promise';

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

// Language normalization map
const languageMap: Record<string, string> = {
  'ASL': 'American Sign Language',
  'AMERICAN SIGN LANGUAGE': 'American Sign Language',
  'CANTONESE': 'Chinese',
  'MANDARIN': 'Chinese',
  'FILIPINO (TAGALOG)': 'Filipino',
  'TAGALOG': 'Filipino',
  'PERSIAN (FARSI)': 'Persian',
  'FARSI': 'Persian',
  'HAITIAN CREOLE': 'Haitian Creole',
  'CREOLE': 'Haitian Creole',
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
  
  let normalized = lang.trim();
  const upper = normalized.toUpperCase();
  
  // Check special cases first
  if (languageMap[upper]) {
    return languageMap[upper];
  }
  
  // Convert to title case
  return normalized
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

async function harmonizeCategories() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  
  console.log('=== Harmonize Categories Script ===\n');
  
  // Get all interpreters
  const [interpreters] = await conn.query(`
    SELECT id, sourceLanguage, targetLanguage, state, city
    FROM interpreters
  `);
  
  const records = interpreters as any[];
  console.log(`📊 Processing ${records.length} interpreters\n`);
  
  let statesUpdated = 0;
  let sourceLangsUpdated = 0;
  let targetLangsUpdated = 0;
  
  for (const record of records) {
    const updates: string[] = [];
    const values: any[] = [];
    
    // Normalize state
    if (record.state) {
      const normalized = normalizeState(record.state);
      if (normalized && normalized !== record.state) {
        updates.push('state = ?');
        values.push(normalized);
        statesUpdated++;
      }
    }
    
    // Normalize source language
    if (record.sourceLanguage) {
      const normalized = normalizeLanguage(record.sourceLanguage);
      if (normalized && normalized !== record.sourceLanguage) {
        updates.push('sourceLanguage = ?');
        values.push(normalized);
        sourceLangsUpdated++;
      }
    }
    
    // Normalize target language
    if (record.targetLanguage) {
      const normalized = normalizeLanguage(record.targetLanguage);
      if (normalized && normalized !== record.targetLanguage) {
        updates.push('targetLanguage = ?');
        values.push(normalized);
        targetLangsUpdated++;
      }
    }
    
    // Update if there are changes
    if (updates.length > 0) {
      values.push(record.id);
      await conn.query(`
        UPDATE interpreters
        SET ${updates.join(', ')}
        WHERE id = ?
      `, values);
    }
  }
  
  console.log('✅ Harmonization Complete!\n');
  console.log(`📊 Results:`);
  console.log(`  - States normalized: ${statesUpdated}`);
  console.log(`  - Source languages normalized: ${sourceLangsUpdated}`);
  console.log(`  - Target languages normalized: ${targetLangsUpdated}`);
  
  // Show unique counts
  const [uniqueStates] = await conn.query(`
    SELECT COUNT(DISTINCT state) as count 
    FROM interpreters 
    WHERE state IS NOT NULL AND state != ''
  `);
  
  const [uniqueLangs] = await conn.query(`
    SELECT COUNT(DISTINCT lang) as count FROM (
      SELECT sourceLanguage as lang FROM interpreters WHERE sourceLanguage IS NOT NULL AND sourceLanguage != ''
      UNION
      SELECT targetLanguage as lang FROM interpreters WHERE targetLanguage IS NOT NULL AND targetLanguage != ''
    ) as all_languages
  `);
  
  const [uniqueMetros] = await conn.query(`
    SELECT COUNT(DISTINCT metro) as count 
    FROM interpreters 
    WHERE metro IS NOT NULL AND metro != ''
  `);
  
  console.log(`\n📈 Final Statistics:`);
  console.log(`  - Unique states: ${(uniqueStates as any)[0].count}`);
  console.log(`  - Unique languages: ${(uniqueLangs as any)[0].count}`);
  console.log(`  - Unique metros: ${(uniqueMetros as any)[0].count}`);
  
  await conn.end();
}

harmonizeCategories().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
