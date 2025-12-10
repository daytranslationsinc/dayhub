import mysql from 'mysql2/promise';

// Manual fixes for specific problematic entries
const MANUAL_FIXES = {
  'Englishkinyarwand': 'Kinyarwanda',
  'Israeli)  English': 'Hebrew',
  'Japan) Spanish': 'Japanese',
  'Creole (standard': 'Creole',
  'Haitian Creole French': 'Haitian Creole',
  'Portuguese Brazilian': 'Portuguese',
  'Laotian': 'Lao',
  'Passive German': 'German',
  'Passive Italian': 'Italian',
  'Passive Portuguese': 'Portuguese',
  'Passive Punjabi': 'Punjabi',
  'Passive Sanskrit': 'Sanskrit',
  'Persian Interpreter Holding Master Degree': 'Persian',
  'Professional Spanishenglish Conference Interpreter': 'Spanish',
  'Sign Language  English  English  English  Sign Language  Sign Language': 'American Sign Language',
  'Arabic Algerian': 'Arabic',
  'Arabic Egyptian': 'Arabic',
  'Arabic Tunisian': 'Arabic',
  'Chinese Shanghaiese': 'Chinese',
  'Chinese Taiwanese': 'Chinese',
  'Shanghaiese': 'Chinese',
  'Taiwanese': 'Chinese',
  'Wu': 'Chinese',
  'Cantonese': 'Chinese',
  'Mandarin': 'Chinese',
};

async function finalCleanup() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    console.log('Applying manual fixes...');
    
    let fixed = 0;
    for (const [old, correct] of Object.entries(MANUAL_FIXES)) {
      const [result] = await conn.query(
        'UPDATE interpreters SET targetLanguage = ? WHERE targetLanguage = ?',
        [correct, old]
      );
      if (result.affectedRows > 0) {
        console.log(`Fixed: "${old}" → "${correct}" (${result.affectedRows} records)`);
        fixed += result.affectedRows;
      }
    }
    
    console.log(`\nTotal records fixed: ${fixed}`);
    
    // Get final count
    const [languages] = await conn.query(
      'SELECT DISTINCT targetLanguage FROM interpreters WHERE targetLanguage IS NOT NULL ORDER BY targetLanguage'
    );
    
    console.log(`\nFinal unique languages (${languages.length}):`);
    languages.forEach(l => console.log(`  - ${l.targetLanguage}`));
    
  } finally {
    await conn.end();
  }
}

finalCleanup().catch(console.error);
