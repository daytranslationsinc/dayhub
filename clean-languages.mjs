import mysql from 'mysql2/promise';

async function cleanLanguages() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    console.log('Cleaning up language data...');
    
    // Remove (c) prefix
    await conn.execute(
      "UPDATE interpreters SET targetLanguage = REPLACE(targetLanguage, '(c) ', '') WHERE targetLanguage LIKE '(c)%'"
    );
    console.log('✓ Removed (c) prefixes');
    
    // Remove price/invalid entries
    await conn.execute(
      "UPDATE interpreters SET targetLanguage = NULL WHERE targetLanguage LIKE '%$%' OR targetLanguage LIKE '%USD%' OR targetLanguage LIKE '%**%'"
    );
    console.log('✓ Removed invalid price entries');
    
    // Standardize "Sign Language" to "American Sign Language"
    await conn.execute(
      "UPDATE interpreters SET targetLanguage = 'American Sign Language' WHERE targetLanguage = 'Sign Language'"
    );
    console.log('✓ Standardized Sign Language');
    
    // Capitalize first letter of all languages
    await conn.execute(
      "UPDATE interpreters SET targetLanguage = CONCAT(UPPER(SUBSTRING(targetLanguage, 1, 1)), SUBSTRING(targetLanguage, 2)) WHERE targetLanguage IS NOT NULL"
    );
    console.log('✓ Capitalized all languages');
    
    // Handle "Unknown" - try to get from original languages field if possible
    const [unknowns] = await conn.execute(
      "SELECT id, languages FROM interpreters WHERE targetLanguage = 'Unknown' AND languages IS NOT NULL LIMIT 100"
    );
    
    let fixed = 0;
    for (const row of unknowns) {
      // Try to extract a better language from the original data
      if (row.languages && row.languages !== 'Unknown') {
        try {
          const parsed = JSON.parse(row.languages);
          if (Array.isArray(parsed) && parsed.length > 0 && parsed[0] !== 'Unknown') {
            await conn.execute(
              "UPDATE interpreters SET targetLanguage = ? WHERE id = ?",
              [parsed[0], row.id]
            );
            fixed++;
          }
        } catch (e) {
          // Skip
        }
      }
    }
    console.log(`✓ Fixed ${fixed} Unknown entries`);
    
    // Get final stats
    const [stats] = await conn.execute(
      'SELECT DISTINCT targetLanguage, COUNT(*) as count FROM interpreters WHERE targetLanguage IS NOT NULL GROUP BY targetLanguage ORDER BY count DESC LIMIT 50'
    );
    
    console.log('\n✅ Top 50 cleaned languages:');
    stats.forEach(l => {
      console.log(`${l.targetLanguage}: ${l.count}`);
    });
    
    const [total] = await conn.execute(
      'SELECT COUNT(*) as total FROM interpreters WHERE targetLanguage IS NOT NULL'
    );
    console.log(`\nTotal interpreters with target language: ${total[0].total}`);
    
  } finally {
    await conn.end();
  }
}

cleanLanguages().catch(console.error);
