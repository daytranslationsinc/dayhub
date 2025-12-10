import mysql from 'mysql2/promise';

// Language standardization map
const languageMap = {
  'ASL': 'American Sign Language',
  'American Sign Language (ASL)': 'American Sign Language',
  'Chinese Mandarin': 'Mandarin',
  'Mandarin Chinese': 'Mandarin',
  'Chinese Cantonese': 'Cantonese',
  'Chinese Toishanese': 'Toishanese',
  'Chinese': 'Mandarin', // Default Chinese to Mandarin
  'Haitian-Creole': 'Haitian Creole',
  'Brazilian': 'Portuguese',
  'Brazilian / Portuguese': 'Portuguese',
  'Bosnian / Croatian / Serbian': 'Bosnian',
  'Bengali / Hindi': 'Bengali',
};

// Parse language pairs (e.g., "English-Spanish" -> source: English, target: Spanish)
function parseLanguagePair(langString) {
  // Handle formats like "English-Spanish", "English/Spanish", etc.
  const separators = ['-', '/', ' / '];
  
  for (const sep of separators) {
    if (langString.includes(sep)) {
      const parts = langString.split(sep).map(s => s.trim());
      if (parts.length >= 2) {
        return {
          source: standardizeLanguage(parts[0]),
          target: standardizeLanguage(parts[1])
        };
      }
    }
  }
  
  // Single language - assume English as source
  return {
    source: 'English',
    target: standardizeLanguage(langString)
  };
}

function standardizeLanguage(lang) {
  const trimmed = lang.trim();
  
  // Check if it's in the map
  if (languageMap[trimmed]) {
    return languageMap[trimmed];
  }
  
  // Remove special characters at the start
  const cleaned = trimmed.replace(/^\*+/, '');
  
  // Capitalize first letter
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

async function migrateLanguages() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    console.log('Starting language data migration...');
    
    // Get all interpreters with language data
    const [interpreters] = await conn.execute(
      'SELECT id, languages FROM interpreters WHERE languages IS NOT NULL'
    );
    
    console.log(`Found ${interpreters.length} interpreters to migrate`);
    
    let updated = 0;
    let skipped = 0;
    
    for (const interp of interpreters) {
      try {
        let langData;
        
        // Try to parse as JSON first
        try {
          langData = JSON.parse(interp.languages);
        } catch (e) {
          // If not JSON, treat as single language string
          langData = [interp.languages];
        }
        
        // Get the first language (most interpreters have one primary language)
        const primaryLang = Array.isArray(langData) ? langData[0] : langData;
        
        if (!primaryLang || primaryLang === 'All Languages (Agency)') {
          skipped++;
          continue;
        }
        
        // Parse and standardize
        const { source, target } = parseLanguagePair(primaryLang);
        
        // Update the interpreter
        await conn.execute(
          'UPDATE interpreters SET sourceLanguage = ?, targetLanguage = ? WHERE id = ?',
          [source, target, interp.id]
        );
        
        updated++;
        
        if (updated % 100 === 0) {
          console.log(`Migrated ${updated} interpreters...`);
        }
      } catch (err) {
        console.error(`Error migrating interpreter ${interp.id}:`, err.message);
      }
    }
    
    console.log(`\nMigration complete!`);
    console.log(`Updated: ${updated}`);
    console.log(`Skipped: ${skipped}`);
    
    // Show unique target languages
    const [uniqueLangs] = await conn.execute(
      'SELECT DISTINCT targetLanguage, COUNT(*) as count FROM interpreters WHERE targetLanguage IS NOT NULL GROUP BY targetLanguage ORDER BY count DESC LIMIT 50'
    );
    
    console.log('\nTop 50 target languages:');
    uniqueLangs.forEach(l => {
      console.log(`${l.targetLanguage}: ${l.count}`);
    });
    
  } finally {
    await conn.end();
  }
}

migrateLanguages().catch(console.error);
