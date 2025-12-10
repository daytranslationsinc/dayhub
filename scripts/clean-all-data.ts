import { db } from '../server/db';
import { interpreters } from '../drizzle/schema';
import { sql } from 'drizzle-orm';

// Comprehensive language mapping
const languageMap: Record<string, string> = {
  // Remove city names and non-language entries
  'New York': 'English',
  'Los Angeles': 'English',
  'Chicago': 'English',
  'Houston': 'English',
  'Phoenix': 'English',
  'Philadelphia': 'English',
  'San Antonio': 'English',
  'San Diego': 'English',
  'Dallas': 'English',
  'San Jose': 'English',
  'Austin': 'English',
  'Jacksonville': 'English',
  'Fort Worth': 'English',
  'Columbus': 'English',
  'Charlotte': 'English',
  'San Francisco': 'English',
  'Indianapolis': 'English',
  'Seattle': 'English',
  'Denver': 'English',
  'Washington': 'English',
  'Boston': 'English',
  'El Paso': 'English',
  'Nashville': 'English',
  'Detroit': 'English',
  'Oklahoma City': 'English',
  'Portland': 'English',
  'Las Vegas': 'English',
  'Memphis': 'English',
  'Louisville': 'English',
  'Baltimore': 'English',
  'Milwaukee': 'English',
  'Albuquerque': 'English',
  'Tucson': 'English',
  'Fresno': 'English',
  'Mesa': 'English',
  'Sacramento': 'English',
  'Atlanta': 'English',
  'Kansas City': 'English',
  'Colorado Springs': 'English',
  'Raleigh': 'English',
  'Miami': 'English',
  'Long Beach': 'English',
  'Virginia Beach': 'English',
  'Omaha': 'English',
  'Oakland': 'English',
  'Minneapolis': 'English',
  'Tulsa': 'English',
  'Tampa': 'English',
  'Arlington': 'English',
  'New Orleans': 'English',
  
  // Normalize language variants
  'English - Australian': 'English',
  'English - British': 'English',
  'English - American': 'English',
  'English - Canadian': 'English',
  'English (Us)': 'English',
  'English (Uk)': 'English',
  'English/Spanish': 'English',
  'Spanish/English': 'Spanish',
  'Mandarin Chinese': 'Mandarin',
  'Chinese Mandarin': 'Mandarin',
  'Chinese (Mandarin)': 'Mandarin',
  'Chinese (Cantonese)': 'Cantonese',
  'Cantonese Chinese': 'Cantonese',
  'Arabic (Egyptian)': 'Arabic',
  'Arabic (Levantine)': 'Arabic',
  'Arabic (Gulf)': 'Arabic',
  'Arabic (Moroccan)': 'Arabic',
  'Portuguese (Brazilian)': 'Portuguese',
  'Portuguese (European)': 'Portuguese',
  'Portuguese - Brazilian': 'Portuguese',
  'Portuguese - Portugal': 'Portuguese',
  'French (Canadian)': 'French',
  'French (France)': 'French',
  'French - Canadian': 'French',
  'Spanish (Latin American)': 'Spanish',
  'Spanish (Spain)': 'Spanish',
  'Spanish - Latin American': 'Spanish',
  'Spanish - Spain': 'Spanish',
  'Farsi/Persian': 'Farsi',
  'Persian/Farsi': 'Persian',
  'Dari': 'Dari',
  'Pashto/Dari': 'Pashto',
  'Haitian': 'Haitian Creole',
  'Creole': 'Haitian Creole',
  'Haitian-Creole': 'Haitian Creole',
  'Filipino': 'Tagalog',
  'Tagalog/Filipino': 'Tagalog',
  'Taiwanese': 'Mandarin',
  'Taiwanese Mandarin': 'Mandarin',
  'Taiwanese Hokkien': 'Hokkien',
  'Hokkien': 'Hokkien',
  'Wu': 'Wu Chinese',
  'Shanghainese': 'Wu Chinese',
  
  // Fix common typos and variations
  'Spainsh': 'Spanish',
  'Spansh': 'Spanish',
  'Espanol': 'Spanish',
  'Español': 'Spanish',
  'Francais': 'French',
  'Français': 'French',
  'Portugues': 'Portuguese',
  'Português': 'Portuguese',
  'Deutsche': 'German',
  'Deutsch': 'German',
  'Italiano': 'Italian',
  'Русский': 'Russian',
  '中文': 'Mandarin',
  '普通话': 'Mandarin',
  '廣東話': 'Cantonese',
  '日本語': 'Japanese',
  '한국어': 'Korean',
  'العربية': 'Arabic',
  'עברית': 'Hebrew',
  'हिन्दी': 'Hindi',
  'বাংলা': 'Bengali',
  'ไทย': 'Thai',
  'Tiếng Việt': 'Vietnamese',
  'Bahasa Indonesia': 'Indonesian',
  'Bahasa Melayu': 'Malay',
  
  // Handle empty or invalid entries
  '': 'English',
  'N/A': 'English',
  'NA': 'English',
  'None': 'English',
  'Unknown': 'English',
  'Other': 'English',
  'Multiple': 'English',
};

// Valid language list
const validLanguages = new Set([
  'English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Russian',
  'Chinese', 'Mandarin', 'Cantonese', 'Japanese', 'Korean', 'Arabic', 'Hindi',
  'Bengali', 'Punjabi', 'Urdu', 'Vietnamese', 'Thai', 'Turkish', 'Polish',
  'Dutch', 'Greek', 'Hebrew', 'Swedish', 'Norwegian', 'Danish', 'Finnish',
  'Czech', 'Hungarian', 'Romanian', 'Ukrainian', 'Tagalog', 'Indonesian',
  'Malay', 'Persian', 'Farsi', 'Dari', 'Swahili', 'Amharic', 'Somali',
  'Haitian Creole', 'Albanian', 'Armenian', 'Bosnian', 'Bulgarian', 'Croatian',
  'Estonian', 'Georgian', 'Gujarati', 'Hausa', 'Igbo', 'Kazakh', 'Khmer',
  'Kurdish', 'Lao', 'Latvian', 'Lithuanian', 'Macedonian', 'Malayalam',
  'Marathi', 'Mongolian', 'Nepali', 'Pashto', 'Serbian', 'Sinhala', 'Slovak',
  'Slovenian', 'Tamil', 'Telugu', 'Tigrinya', 'Uzbek', 'Yoruba', 'Zulu',
  'Afrikaans', 'Basque', 'Catalan', 'Welsh', 'Icelandic', 'Irish', 'Maltese',
  'Yiddish', 'Azerbaijani', 'Belarusian', 'Burmese', 'Cebuano', 'Chichewa',
  'Esperanto', 'Galician', 'Hmong', 'Hokkien', 'Javanese', 'Kannada', 'Kinyarwanda',
  'Kyrgyz', 'Luxembourgish', 'Malagasy', 'Maori', 'Odia', 'Oromo', 'Quechua',
  'Samoan', 'Scots Gaelic', 'Sesotho', 'Shona', 'Sindhi', 'Sundanese', 'Tajik',
  'Tatar', 'Turkmen', 'Uyghur', 'Wu Chinese', 'Xhosa', 'Yiddish'
]);

function cleanLanguage(lang: string | null): string {
  if (!lang) return 'English';
  
  const trimmed = lang.trim();
  
  // Check if it's in the mapping
  if (languageMap[trimmed]) {
    return languageMap[trimmed];
  }
  
  // Check if it's already valid
  if (validLanguages.has(trimmed)) {
    return trimmed;
  }
  
  // Try to extract language from complex strings like "English - Spanish"
  const parts = trimmed.split(/[-–—/,]/);
  for (const part of parts) {
    const cleaned = part.trim();
    if (validLanguages.has(cleaned)) {
      return cleaned;
    }
    if (languageMap[cleaned]) {
      return languageMap[cleaned];
    }
  }
  
  // If it looks like a city name (contains common city indicators), default to English
  if (trimmed.includes('City') || trimmed.includes('Beach') || trimmed.includes('Springs') || 
      trimmed.includes('Fort') || trimmed.includes('San') || trimmed.includes('Los') ||
      trimmed.includes('New') || trimmed.includes('Saint')) {
    return 'English';
  }
  
  // Default to English for unrecognized entries
  console.log(`   ⚠️  Unrecognized language: "${trimmed}" - defaulting to English`);
  return 'English';
}

async function main() {
  console.log('\n🧹 Starting Comprehensive Data Cleaning...\n');
  
  // Get all interpreters
  console.log('📊 Fetching all interpreters...');
  const allInterpreters = await db.select().from(interpreters);
  console.log(`   Found ${allInterpreters.length} interpreters\n`);
  
  let languagesCleaned = 0;
  let citiesFixed = 0;
  let statesNormalized = 0;
  
  console.log('🔧 Cleaning data...\n');
  
  for (const interpreter of allInterpreters) {
    const updates: any = {};
    let needsUpdate = false;
    
    // Clean source language
    const cleanedSource = cleanLanguage(interpreter.sourceLanguage);
    if (cleanedSource !== interpreter.sourceLanguage) {
      updates.sourceLanguage = cleanedSource;
      needsUpdate = true;
      languagesCleaned++;
    }
    
    // Clean target language
    const cleanedTarget = cleanLanguage(interpreter.targetLanguage);
    if (cleanedTarget !== interpreter.targetLanguage) {
      updates.targetLanguage = cleanedTarget;
      needsUpdate = true;
      languagesCleaned++;
    }
    
    // Clean city - remove if it's in language field
    if (interpreter.city && validLanguages.has(interpreter.city)) {
      updates.city = null;
      needsUpdate = true;
      citiesFixed++;
    }
    
    // Normalize state to 2-letter code
    if (interpreter.state && interpreter.state.length > 2) {
      const stateMap: Record<string, string> = {
        'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
        'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'Florida': 'FL', 'Georgia': 'GA',
        'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
        'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
        'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS', 'Missouri': 'MO',
        'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
        'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH',
        'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
        'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT',
        'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY',
        'District of Columbia': 'DC', 'Puerto Rico': 'PR'
      };
      
      const normalized = stateMap[interpreter.state];
      if (normalized) {
        updates.state = normalized;
        needsUpdate = true;
        statesNormalized++;
      }
    }
    
    // Apply updates if needed
    if (needsUpdate) {
      await db.update(interpreters)
        .set(updates)
        .where(sql`${interpreters.id} = ${interpreter.id}`);
    }
  }
  
  console.log('\n✨ Data Cleaning Complete!\n');
  console.log(`   🔤 Languages cleaned: ${languagesCleaned}`);
  console.log(`   🏙️  Cities fixed: ${citiesFixed}`);
  console.log(`   📍 States normalized: ${statesNormalized}`);
  console.log(`   📊 Total interpreters processed: ${allInterpreters.length}\n`);
  
  // Show summary of languages after cleaning
  console.log('📊 Language Distribution After Cleaning:\n');
  const languageStats = await db.execute(sql`
    SELECT sourceLanguage, COUNT(*) as count 
    FROM interpreters 
    GROUP BY sourceLanguage 
    ORDER BY count DESC 
    LIMIT 20
  `);
  
  for (const row of languageStats.rows as any[]) {
    console.log(`   ${row.sourceLanguage}: ${row.count}`);
  }
  
  process.exit(0);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
