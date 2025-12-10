import mysql from 'mysql2/promise';

async function finalCleanup() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  
  console.log('=== Final Data Cleanup Script ===\n');
  
  // Valid US state abbreviations
  const validStates = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 
    'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 
    'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 
    'WY', 'DC', 'PR', 'GU', 'VI'];
  
  // Common city names that shouldn't be in language fields
  const cityNames = ['New York', 'Chicago', 'Los Angeles', 'Houston', 'Phoenix', 
    'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose', 'Austin',
    'Jacksonville', 'Fort Worth', 'Columbus', 'Charlotte', 'San Francisco',
    'Indianapolis', 'Seattle', 'Denver', 'Washington', 'Boston', 'El Paso',
    'Nashville', 'Detroit', 'Oklahoma City', 'Portland', 'Las Vegas', 'Memphis',
    'Louisville', 'Baltimore', 'Milwaukee', 'Albuquerque', 'Tucson', 'Fresno',
    'Sacramento', 'Mesa', 'Kansas City', 'Atlanta', 'Long Beach', 'Colorado Springs',
    'Raleigh', 'Miami', 'Virginia Beach', 'Omaha', 'Oakland', 'Minneapolis',
    'Tulsa', 'Arlington', 'Tampa', 'New Orleans'];
  
  console.log('1️⃣ Cleaning invalid language values (state abbreviations and city names)...');
  
  // Clean source languages
  let cleaned = 0;
  for (const state of validStates) {
    const [result] = await conn.query(`
      UPDATE interpreters 
      SET sourceLanguage = NULL 
      WHERE sourceLanguage = ?
    `, [state]);
    cleaned += (result as any).affectedRows;
  }
  
  for (const city of cityNames) {
    const [result] = await conn.query(`
      UPDATE interpreters 
      SET sourceLanguage = NULL 
      WHERE sourceLanguage = ?
    `, [city]);
    cleaned += (result as any).affectedRows;
  }
  
  // Clean target languages
  for (const state of validStates) {
    const [result] = await conn.query(`
      UPDATE interpreters 
      SET targetLanguage = NULL 
      WHERE targetLanguage = ?
    `, [state]);
    cleaned += (result as any).affectedRows;
  }
  
  for (const city of cityNames) {
    const [result] = await conn.query(`
      UPDATE interpreters 
      SET targetLanguage = NULL 
      WHERE targetLanguage = ?
    `, [city]);
    cleaned += (result as any).affectedRows;
  }
  
  console.log(`   ✅ Cleaned ${cleaned} invalid language values\n`);
  
  console.log('2️⃣ Normalizing language capitalization and variants...');
  
  // Language normalization map
  const languageNormalizations: Record<string, string> = {
    'Chinese (mandarin)': 'Chinese',
    'Chinese (Mandarin)': 'Chinese',
    'CHINESE (MANDARIN)': 'Chinese',
    'Mandarin': 'Chinese',
    'MANDARIN': 'Chinese',
    'Cantonese': 'Chinese',
    'CANTONESE': 'Chinese',
    'Farsi (persian)': 'Persian',
    'Farsi (Persian)': 'Persian',
    'FARSI (PERSIAN)': 'Persian',
    'Farsi': 'Persian',
    'FARSI': 'Persian',
    'Filipino (tagalog)': 'Filipino',
    'Filipino (Tagalog)': 'Filipino',
    'FILIPINO (TAGALOG)': 'Filipino',
    'Tagalog': 'Filipino',
    'TAGALOG': 'Filipino',
    'ASL': 'American Sign Language',
    'Asl': 'American Sign Language',
    'AMERICAN SIGN LANGUAGE': 'American Sign Language',
    'Haitian creole': 'Haitian Creole',
    'HAITIAN CREOLE': 'Haitian Creole',
    'Creole': 'Haitian Creole',
    'CREOLE': 'Haitian Creole',
  };
  
  let normalized = 0;
  for (const [from, to] of Object.entries(languageNormalizations)) {
    const [result1] = await conn.query(`
      UPDATE interpreters 
      SET sourceLanguage = ? 
      WHERE sourceLanguage = ?
    `, [to, from]);
    normalized += (result1 as any).affectedRows;
    
    const [result2] = await conn.query(`
      UPDATE interpreters 
      SET targetLanguage = ? 
      WHERE targetLanguage = ?
    `, [to, from]);
    normalized += (result2 as any).affectedRows;
  }
  
  console.log(`   ✅ Normalized ${normalized} language values\n`);
  
  console.log('3️⃣ Final statistics...');
  
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
  
  const [totalCount] = await conn.query('SELECT COUNT(*) as count FROM interpreters');
  
  console.log(`\n📈 Final Database Statistics:`);
  console.log(`  - Total interpreters: ${(totalCount as any)[0].count}`);
  console.log(`  - Unique states: ${(uniqueStates as any)[0].count}`);
  console.log(`  - Unique languages: ${(uniqueLangs as any)[0].count}`);
  console.log(`  - Unique metros: ${(uniqueMetros as any)[0].count}`);
  
  await conn.end();
  console.log('\n✅ Final cleanup complete!');
}

finalCleanup().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
