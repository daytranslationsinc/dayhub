import mysql from 'mysql2/promise';

async function cleanRemainingCities() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  
  console.log('=== Clean Remaining Cities from Language Fields ===\n');
  
  // Additional cities found in the database
  const remainingCities = [
    'Edgewater', 'Federal Way', 'Foothill Ranch', 'Franklin Park', 'Fremont',
    'Gaithersburg', 'Garden Grove', 'Gardena', 'Garland', 'Glenside',
    'Greensboro', 'Hayward', 'Henderson', 'Irving', 'Jersey City', 'Kent',
    'Lincoln', 'Los Altos', 'Los Gatos', 'Madison', 'Manhattan Beach',
    'Melrose', 'Milpitas', 'New York City', 'North Brunswick', 'Oakland Gardens',
    'Ozone Park', 'Peachtree Corners', 'Pembroke Pines', 'Riverside',
    'San Rafael', 'Santa Clara', 'Scottsdale', 'Sharon', 'Snohomish',
    'Stockton', 'Stone Mountain', 'Tamuning', 'Ventnor City', 'Wayne',
    'West Point', 'Winchester', 'Winnetka', 'Winter Garden',
    // Invalid mixed entries
    'Englishfrenchenglishkirundi'
  ];
  
  let totalCleaned = 0;
  
  // Clean source languages
  console.log('Cleaning source languages...');
  for (const entry of remainingCities) {
    const [result] = await conn.query(
      'UPDATE interpreters SET sourceLanguage = NULL WHERE sourceLanguage = ?',
      [entry]
    );
    const affected = (result as any).affectedRows;
    if (affected > 0) {
      console.log(`  Cleared "${entry}" from source (${affected} records)`);
      totalCleaned += affected;
    }
  }
  
  // Clean target languages
  console.log('\nCleaning target languages...');
  for (const entry of remainingCities) {
    const [result] = await conn.query(
      'UPDATE interpreters SET targetLanguage = NULL WHERE targetLanguage = ?',
      [entry]
    );
    const affected = (result as any).affectedRows;
    if (affected > 0) {
      console.log(`  Cleared "${entry}" from target (${affected} records)`);
      totalCleaned += affected;
    }
  }
  
  console.log(`\n✅ Total entries cleaned: ${totalCleaned}\n`);
  
  // Get final statistics
  const [stats] = await conn.query(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN sourceLanguage IS NOT NULL AND sourceLanguage != '' THEN 1 ELSE 0 END) as withSource,
      SUM(CASE WHEN targetLanguage IS NOT NULL AND targetLanguage != '' THEN 1 ELSE 0 END) as withTarget,
      SUM(CASE WHEN sourceLanguage IS NOT NULL AND sourceLanguage != '' AND targetLanguage IS NOT NULL AND targetLanguage != '' THEN 1 ELSE 0 END) as withBoth
    FROM interpreters
  `);
  
  const stat = (stats as any)[0];
  console.log('📊 Final Statistics:');
  console.log(`  Total interpreters: ${stat.total}`);
  console.log(`  With source language: ${stat.withSource}`);
  console.log(`  With target language: ${stat.withTarget}`);
  console.log(`  With both languages: ${stat.withBoth}`);
  
  // Show ALL remaining unique languages
  const [langs] = await conn.query(`
    SELECT DISTINCT sourceLanguage as lang
    FROM interpreters
    WHERE sourceLanguage IS NOT NULL AND sourceLanguage != ''
    ORDER BY sourceLanguage
  `);
  
  console.log(`\n📝 All remaining languages (${(langs as any[]).length} total):`);
  (langs as any[]).forEach(row => console.log(`  - ${row.lang}`));
  
  await conn.end();
}

cleanRemainingCities().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
