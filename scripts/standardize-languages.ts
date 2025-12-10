import mysql from 'mysql2/promise';

async function standardizeLanguages() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  
  console.log('=== Standardize Language Fields ===\n');
  
  // Update interpreters with only source language to have target=English
  console.log('1️⃣ Setting target language to English for interpreters with only source language...');
  const [result1] = await conn.query(`
    UPDATE interpreters
    SET targetLanguage = 'English'
    WHERE sourceLanguage IS NOT NULL
      AND (targetLanguage IS NULL OR targetLanguage = '')
  `);
  console.log(`   ✅ Updated ${(result1 as any).affectedRows} interpreters\n`);
  
  // Get final statistics
  const [total] = await conn.query('SELECT COUNT(*) as count FROM interpreters');
  const [bothLangs] = await conn.query(`
    SELECT COUNT(*) as count 
    FROM interpreters 
    WHERE sourceLanguage IS NOT NULL 
      AND sourceLanguage != ''
      AND targetLanguage IS NOT NULL 
      AND targetLanguage != ''
  `);
  const [onlySource] = await conn.query(`
    SELECT COUNT(*) as count 
    FROM interpreters 
    WHERE sourceLanguage IS NOT NULL 
      AND sourceLanguage != ''
      AND (targetLanguage IS NULL OR targetLanguage = '')
  `);
  const [noLangs] = await conn.query(`
    SELECT COUNT(*) as count 
    FROM interpreters 
    WHERE (sourceLanguage IS NULL OR sourceLanguage = '')
      AND (targetLanguage IS NULL OR targetLanguage = '')
  `);
  
  console.log('📊 Final Statistics:');
  console.log(`  Total interpreters: ${(total as any)[0].count}`);
  console.log(`  With both languages: ${(bothLangs as any)[0].count}`);
  console.log(`  Only source language: ${(onlySource as any)[0].count}`);
  console.log(`  No languages: ${(noLangs as any)[0].count}`);
  
  console.log('\n✅ Language standardization complete!');
  
  await conn.end();
}

standardizeLanguages().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
