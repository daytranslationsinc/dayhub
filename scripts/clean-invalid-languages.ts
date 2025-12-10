import mysql from 'mysql2/promise';

async function cleanInvalidLanguages() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  
  console.log('=== Clean Invalid Language Entries ===\n');
  
  // List of valid languages (common interpreter languages)
  const validLanguages = [
    'English', 'Spanish', 'Chinese', 'Chinese (Mandarin)', 'Chinese (Cantonese)',
    'Arabic', 'French', 'German', 'Italian', 'Portuguese', 'Russian', 'Japanese',
    'Korean', 'Vietnamese', 'Tagalog', 'Hindi', 'Bengali', 'Punjabi', 'Urdu',
    'Persian', 'Farsi', 'Turkish', 'Polish', 'Ukrainian', 'Romanian', 'Greek',
    'Hebrew', 'Thai', 'Indonesian', 'Malay', 'Swahili', 'Amharic', 'Somali',
    'Haitian Creole', 'Haitian', 'Armenian', 'Georgian', 'Albanian', 'Serbian',
    'Croatian', 'Bosnian', 'Bulgarian', 'Czech', 'Slovak', 'Hungarian', 'Finnish',
    'Swedish', 'Norwegian', 'Danish', 'Dutch', 'Flemish', 'Afrikaans', 'Zulu',
    'Xhosa', 'Yoruba', 'Igbo', 'Akan', 'Twi', 'Fante', 'Ewe', 'Ga', 'Hausa',
    'Fulani', 'Wolof', 'Mandinka', 'Bambara', 'Lingala', 'Kikongo', 'Kinyarwanda',
    'Kirundi', 'Tigrinya', 'Oromo', 'Nepali', 'Sinhala', 'Tamil', 'Telugu',
    'Malayalam', 'Kannada', 'Marathi', 'Gujarati', 'Pashto', 'Dari', 'Kurdish',
    'Azerbaijani', 'Uzbek', 'Kazakh', 'Kyrgyz', 'Tajik', 'Turkmen', 'Mongolian',
    'Tibetan', 'Burmese', 'Lao', 'Khmer', 'Cambodian', 'Hmong', 'Karen', 'Chin',
    'Rohingya', 'Malagasy', 'Cebuano', 'Ilocano', 'Waray', 'Hiligaynon', 'Bikol',
    'Kapampangan', 'Pangasinan', 'Maranao', 'Maguindanao', 'Tausug', 'Yakan',
    'American Sign Language', 'ASL', 'Sign Language', 'British Sign Language',
    'Navajo', 'Cherokee', 'Choctaw', 'Lakota', 'Dakota', 'Ojibwe', 'Cree',
    'Inuktitut', 'Yup\'ik', 'Aleut', 'Samoan', 'Tongan', 'Fijian', 'Hawaiian',
    'Maori', 'Marshallese', 'Chuukese', 'Pohnpeian', 'Kosraean', 'Yapese',
    'Palauan', 'Chamorro', 'Carolinian', 'Gilbertese', 'Tuvaluan', 'Nauruan'
  ];
  
  // Get all unique source languages
  const [sourceLangs] = await conn.query(`
    SELECT DISTINCT sourceLanguage as lang
    FROM interpreters
    WHERE sourceLanguage IS NOT NULL AND sourceLanguage != ''
  `);
  
  const invalidSourceLangs = (sourceLangs as any[])
    .map(row => row.lang)
    .filter(lang => !validLanguages.some(valid => 
      lang.toLowerCase() === valid.toLowerCase() ||
      lang.toLowerCase().includes(valid.toLowerCase())
    ));
  
  console.log(`Found ${invalidSourceLangs.length} invalid source language entries`);
  
  if (invalidSourceLangs.length > 0) {
    console.log('\nInvalid source languages to be removed:');
    invalidSourceLangs.slice(0, 20).forEach(lang => console.log(`  - ${lang}`));
    if (invalidSourceLangs.length > 20) {
      console.log(`  ... and ${invalidSourceLangs.length - 20} more`);
    }
    
    // Set invalid source languages to NULL
    for (const lang of invalidSourceLangs) {
      const [result] = await conn.query(
        'UPDATE interpreters SET sourceLanguage = NULL WHERE sourceLanguage = ?',
        [lang]
      );
      console.log(`  Cleared "${lang}" (${(result as any).affectedRows} records)`);
    }
  }
  
  // Get all unique target languages
  const [targetLangs] = await conn.query(`
    SELECT DISTINCT targetLanguage as lang
    FROM interpreters
    WHERE targetLanguage IS NOT NULL AND targetLanguage != ''
  `);
  
  const invalidTargetLangs = (targetLangs as any[])
    .map(row => row.lang)
    .filter(lang => !validLanguages.some(valid => 
      lang.toLowerCase() === valid.toLowerCase() ||
      lang.toLowerCase().includes(valid.toLowerCase())
    ));
  
  console.log(`\nFound ${invalidTargetLangs.length} invalid target language entries`);
  
  if (invalidTargetLangs.length > 0) {
    console.log('\nInvalid target languages to be removed:');
    invalidTargetLangs.slice(0, 20).forEach(lang => console.log(`  - ${lang}`));
    if (invalidTargetLangs.length > 20) {
      console.log(`  ... and ${invalidTargetLangs.length - 20} more`);
    }
    
    // Set invalid target languages to NULL
    for (const lang of invalidTargetLangs) {
      const [result] = await conn.query(
        'UPDATE interpreters SET targetLanguage = NULL WHERE targetLanguage = ?',
        [lang]
      );
      console.log(`  Cleared "${lang}" (${(result as any).affectedRows} records)`);
    }
  }
  
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
  console.log('\n📊 Final Statistics:');
  console.log(`  Total interpreters: ${stat.total}`);
  console.log(`  With source language: ${stat.withSource}`);
  console.log(`  With target language: ${stat.withTarget}`);
  console.log(`  With both languages: ${stat.withBoth}`);
  
  console.log('\n✅ Language cleanup complete!');
  
  await conn.end();
}

cleanInvalidLanguages().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
