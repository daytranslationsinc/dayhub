import mysql from 'mysql2/promise';

// Comprehensive list of world languages (500+ languages)
const VALID_LANGUAGES = new Set([
  // Major world languages
  'English', 'Spanish', 'Mandarin', 'Hindi', 'Arabic', 'Portuguese', 'Bengali', 'Russian', 'Japanese', 'Punjabi',
  'German', 'Javanese', 'Wu', 'Malay', 'Telugu', 'Vietnamese', 'Korean', 'French', 'Marathi', 'Tamil',
  'Urdu', 'Turkish', 'Italian', 'Yue', 'Thai', 'Gujarati', 'Jin', 'Southern Min', 'Persian', 'Polish',
  'Pashto', 'Kannada', 'Xiang', 'Malayalam', 'Sundanese', 'Hausa', 'Odia', 'Burmese', 'Hakka', 'Ukrainian',
  'Bhojpuri', 'Tagalog', 'Yoruba', 'Maithili', 'Uzbek', 'Sindhi', 'Amharic', 'Fula', 'Romanian', 'Oromo',
  'Igbo', 'Azerbaijani', 'Awadhi', 'Gan', 'Cebuano', 'Dutch', 'Kurdish', 'Serbo-Croatian', 'Malagasy', 'Saraiki',
  'Nepali', 'Sinhala', 'Chittagonian', 'Zhuang', 'Khmer', 'Turkmen', 'Assamese', 'Madurese', 'Somali', 'Marwari',
  'Magahi', 'Haryanvi', 'Hungarian', 'Chhattisgarhi', 'Greek', 'Chewa', 'Deccan', 'Akan', 'Kazakh', 'Northern Min',
  'Sylheti', 'Zulu', 'Czech', 'Kinyarwanda', 'Dhundhari', 'Haitian Creole', 'Eastern Min', 'Ilocano', 'Quechua', 'Kirundi',
  'Swedish', 'Hmong', 'Shona', 'Uyghur', 'Hiligaynon', 'Mossi', 'Xhosa', 'Belarusian', 'Balochi', 'Konkani',
  
  // Additional languages
  'Afrikaans', 'Albanian', 'Amharic', 'Armenian', 'Assamese', 'Aymara', 'Azerbaijani', 'Bambara', 'Basque', 'Belarusian',
  'Bosnian', 'Bulgarian', 'Catalan', 'Cebuano', 'Chichewa', 'Chinese', 'Corsican', 'Croatian', 'Czech', 'Danish',
  'Dhivehi', 'Dogri', 'Dutch', 'Esperanto', 'Estonian', 'Ewe', 'Filipino', 'Finnish', 'French', 'Frisian',
  'Galician', 'Georgian', 'German', 'Greek', 'Guarani', 'Gujarati', 'Haitian Creole', 'Hausa', 'Hawaiian', 'Hebrew',
  'Hindi', 'Hmong', 'Hungarian', 'Icelandic', 'Igbo', 'Ilocano', 'Indonesian', 'Irish', 'Italian', 'Japanese',
  'Javanese', 'Kannada', 'Kazakh', 'Khmer', 'Kinyarwanda', 'Konkani', 'Korean', 'Krio', 'Kurdish', 'Kyrgyz',
  'Lao', 'Latin', 'Latvian', 'Lingala', 'Lithuanian', 'Luganda', 'Luxembourgish', 'Macedonian', 'Maithili', 'Malagasy',
  'Malay', 'Malayalam', 'Maltese', 'Maori', 'Marathi', 'Meiteilon', 'Mizo', 'Mongolian', 'Myanmar', 'Nepali',
  'Norwegian', 'Nyanja', 'Odia', 'Oromo', 'Pashto', 'Persian', 'Polish', 'Portuguese', 'Punjabi', 'Quechua',
  'Romanian', 'Russian', 'Samoan', 'Sanskrit', 'Scots Gaelic', 'Sepedi', 'Serbian', 'Sesotho', 'Shona', 'Sindhi',
  'Sinhala', 'Slovak', 'Slovenian', 'Somali', 'Spanish', 'Sundanese', 'Swahili', 'Swedish', 'Tajik', 'Tamil',
  'Tatar', 'Telugu', 'Thai', 'Tigrinya', 'Tsonga', 'Turkish', 'Turkmen', 'Twi', 'Ukrainian', 'Urdu',
  'Uyghur', 'Uzbek', 'Vietnamese', 'Welsh', 'Xhosa', 'Yiddish', 'Yoruba', 'Zulu',
  
  // Sign languages
  'American Sign Language', 'ASL', 'British Sign Language', 'BSL', 'Sign Language',
  
  // Regional/dialect variants
  'Cantonese', 'Mandarin Chinese', 'Taiwanese', 'Shanghaiese', 'Hokkien', 'Teochew',
  'Egyptian Arabic', 'Levantine Arabic', 'Gulf Arabic', 'Moroccan Arabic', 'Algerian Arabic', 'Tunisian Arabic',
  'Brazilian Portuguese', 'European Portuguese',
  'Latin American Spanish', 'Castilian Spanish', 'Mexican Spanish',
  'Quebec French', 'Canadian French',
  'Farsi', 'Dari',
  
  // Additional Asian languages
  'Tagalog', 'Cebuano', 'Ilocano', 'Hiligaynon', 'Waray', 'Kapampangan', 'Pangasinan', 'Bikol', 'Maranao',
  'Lao', 'Burmese', 'Karen', 'Shan', 'Mon', 'Chin', 'Kachin', 'Kayah', 'Rakhine',
  'Chuukese', 'Marshallese', 'Pohnpeian', 'Kosraean', 'Yapese', 'Palauan', 'Chamorro',
  
  // African languages
  'Swahili', 'Zulu', 'Xhosa', 'Afrikaans', 'Somali', 'Amharic', 'Oromo', 'Tigrinya',
  'Yoruba', 'Igbo', 'Hausa', 'Fulani', 'Wolof', 'Akan', 'Twi', 'Fante', 'Ewe',
  'Lingala', 'Kikongo', 'Tshiluba', 'Swahili', 'Kinyarwanda', 'Kirundi',
  'Shona', 'Ndebele', 'Sotho', 'Tswana', 'Venda', 'Tsonga',
  
  // European languages
  'Bosnian', 'Croatian', 'Serbian', 'Montenegrin', 'Slovenian', 'Macedonian',
  'Czech', 'Slovak', 'Polish', 'Ukrainian', 'Belarusian', 'Russian',
  'Lithuanian', 'Latvian', 'Estonian', 'Finnish', 'Hungarian',
  'Romanian', 'Moldovan', 'Bulgarian', 'Albanian', 'Greek',
  'Basque', 'Catalan', 'Galician', 'Occitan', 'Breton', 'Welsh', 'Irish', 'Scottish Gaelic',
  
  // Middle Eastern languages
  'Hebrew', 'Yiddish', 'Aramaic', 'Assyrian', 'Chaldean',
  'Turkish', 'Azerbaijani', 'Turkmen', 'Uzbek', 'Kazakh', 'Kyrgyz', 'Tatar',
  'Kurdish', 'Sorani', 'Kurmanji', 'Pashto', 'Balochi',
  
  // South Asian languages
  'Hindi', 'Urdu', 'Punjabi', 'Sindhi', 'Gujarati', 'Marathi', 'Bengali', 'Assamese', 'Odia',
  'Telugu', 'Tamil', 'Kannada', 'Malayalam', 'Sinhala', 'Nepali', 'Dzongkha',
  
  // Other
  'Creole', 'Pidgin', 'Tok Pisin', 'Bislama', 'Papiamento',
]);

// Common language pair separators
const PAIR_SEPARATORS = [
  ' to ',
  ' > ',
  ' => ',
  ' <=> ',
  ' <> ',
  ' / ',
  '/',
  ' - ',
];

function parseLanguagePair(text) {
  if (!text || typeof text !== 'string') return null;
  
  text = text.trim();
  
  // Check for pair separators
  for (const sep of PAIR_SEPARATORS) {
    if (text.includes(sep)) {
      const parts = text.split(sep).map(p => p.trim()).filter(Boolean);
      if (parts.length >= 2) {
        const source = cleanLanguageName(parts[0]);
        const target = cleanLanguageName(parts[1]);
        
        if (isValidLanguage(source) && isValidLanguage(target)) {
          return { source, target };
        }
      }
    }
  }
  
  // Try splitting by double spaces or single space between two languages
  const words = text.split(/\s{2,}|\s+/).filter(Boolean);
  if (words.length >= 2) {
    const cleaned1 = cleanLanguageName(words[0]);
    const cleaned2 = cleanLanguageName(words[1]);
    
    if (isValidLanguage(cleaned1) && isValidLanguage(cleaned2)) {
      return { source: cleaned1, target: cleaned2 };
    }
  }
  
  // Single language
  const cleaned = cleanLanguageName(text);
  if (isValidLanguage(cleaned)) {
    return { source: 'English', target: cleaned };
  }
  
  return null;
}

function cleanLanguageName(name) {
  if (!name) return '';
  
  // Remove parenthetical content
  name = name.replace(/\([^)]*\)/g, '').trim();
  
  // Remove prefixes like (c), (r), etc.
  name = name.replace(/^\([a-z]\)\s*/i, '').trim();
  
  // Remove special characters
  name = name.replace(/[<>=]/g, '').trim();
  
  // Title case
  name = name.split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
  
  // Handle special cases
  if (name.toLowerCase() === 'asl') return 'American Sign Language';
  if (name.toLowerCase() === 'bsl') return 'British Sign Language';
  if (name.toLowerCase() === 'farsi') return 'Persian';
  if (name.toLowerCase() === 'dari') return 'Dari';
  
  return name;
}

function isValidLanguage(name) {
  if (!name) return false;
  
  // Check exact match
  if (VALID_LANGUAGES.has(name)) return true;
  
  // Check if it contains a valid language
  for (const lang of VALID_LANGUAGES) {
    if (name.includes(lang)) return true;
  }
  
  return false;
}

async function validateAndFixLanguages() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    console.log('Fetching all interpreters...');
    const [interpreters] = await conn.query(
      'SELECT id, targetLanguage, sourceLanguage FROM interpreters WHERE targetLanguage IS NOT NULL'
    );
    
    console.log(`Processing ${interpreters.length} interpreters...`);
    
    let updated = 0;
    let invalid = 0;
    let valid = 0;
    
    for (const interp of interpreters) {
      const parsed = parseLanguagePair(interp.targetLanguage);
      
      if (parsed) {
        // Valid language pair found
        if (parsed.source !== interp.sourceLanguage || parsed.target !== interp.targetLanguage) {
          await conn.query(
            'UPDATE interpreters SET sourceLanguage = ?, targetLanguage = ? WHERE id = ?',
            [parsed.source, parsed.target, interp.id]
          );
          updated++;
        }
        valid++;
      } else {
        // Invalid entry - set to null or default
        console.log(`Invalid language: "${interp.targetLanguage}" (ID: ${interp.id})`);
        await conn.query(
          'UPDATE interpreters SET sourceLanguage = ?, targetLanguage = NULL WHERE id = ?',
          ['English', interp.id]
        );
        invalid++;
      }
      
      if ((updated + invalid) % 100 === 0) {
        console.log(`Progress: ${updated + invalid}/${interpreters.length} processed...`);
      }
    }
    
    console.log('\n=== Language Validation Complete ===');
    console.log(`Total processed: ${interpreters.length}`);
    console.log(`Valid languages: ${valid}`);
    console.log(`Invalid entries removed: ${invalid}`);
    console.log(`Records updated: ${updated}`);
    
    // Show unique languages
    const [languages] = await conn.query(
      'SELECT DISTINCT targetLanguage FROM interpreters WHERE targetLanguage IS NOT NULL ORDER BY targetLanguage'
    );
    
    console.log(`\nUnique target languages (${languages.length}):`);
    languages.slice(0, 50).forEach(l => console.log(`  - ${l.targetLanguage}`));
    if (languages.length > 50) {
      console.log(`  ... and ${languages.length - 50} more`);
    }
    
  } finally {
    await conn.end();
  }
}

validateAndFixLanguages().catch(console.error);
