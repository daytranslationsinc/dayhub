import { db } from '../server/db';
import { interpreters } from '../drizzle/schema';
import { sql } from 'drizzle-orm';

// US State name to 2-letter code mapping
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
  'American Samoa': 'AS', 'Northern Mariana Islands': 'MP'
};

// Valid 2-letter US state codes
const validUSStates = new Set([
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 
  'DC', 'PR', 'GU', 'VI', 'AS', 'MP'
]);

// Country name standardization
const countryMap: Record<string, string> = {
  'United States': 'USA',
  'United States of America': 'USA',
  'US': 'USA',
  'U.S.': 'USA',
  'U.S.A.': 'USA',
  'America': 'USA',
  'United Kingdom': 'UK',
  'Great Britain': 'UK',
  'England': 'UK',
  'Britain': 'UK',
  'UAE': 'United Arab Emirates',
  'U.A.E.': 'United Arab Emirates',
  'South Korea': 'Korea',
  'Republic of Korea': 'Korea',
  'North Korea': 'Korea',
  'Democratic Republic of Congo': 'Congo',
  'DRC': 'Congo',
  'Republic of the Congo': 'Congo',
  'Czech Republic': 'Czechia',
  'The Netherlands': 'Netherlands',
  'Holland': 'Netherlands',
};

// Common countries (for validation)
const validCountries = new Set([
  'USA', 'Canada', 'Mexico', 'UK', 'France', 'Germany', 'Italy', 'Spain', 
  'Portugal', 'Netherlands', 'Belgium', 'Switzerland', 'Austria', 'Sweden', 
  'Norway', 'Denmark', 'Finland', 'Poland', 'Czechia', 'Hungary', 'Romania', 
  'Greece', 'Turkey', 'Russia', 'Ukraine', 'China', 'Japan', 'Korea', 
  'India', 'Pakistan', 'Bangladesh', 'Indonesia', 'Philippines', 'Vietnam', 
  'Thailand', 'Malaysia', 'Singapore', 'Australia', 'New Zealand', 'Brazil', 
  'Argentina', 'Chile', 'Colombia', 'Peru', 'Venezuela', 'Egypt', 'Nigeria', 
  'South Africa', 'Kenya', 'Ethiopia', 'Morocco', 'Algeria', 'Israel', 
  'Saudi Arabia', 'United Arab Emirates', 'Iran', 'Iraq', 'Afghanistan', 
  'Lebanon', 'Jordan', 'Syria', 'Yemen', 'Oman', 'Kuwait', 'Qatar', 'Bahrain',
  'Congo', 'Ghana', 'Uganda', 'Tanzania', 'Sudan', 'Somalia', 'Senegal',
  'Cambodia', 'Laos', 'Myanmar', 'Nepal', 'Sri Lanka', 'Taiwan', 'Hong Kong',
  'Ireland', 'Scotland', 'Wales', 'Iceland', 'Luxembourg', 'Malta', 'Cyprus'
]);

function cleanState(state: string | null, country: string | null): string | null {
  if (!state) return null;
  
  const trimmed = state.trim();
  
  // If it's already a valid 2-letter US state code, keep it
  if (validUSStates.has(trimmed.toUpperCase())) {
    return trimmed.toUpperCase();
  }
  
  // Try to map full state name to code
  if (stateMap[trimmed]) {
    return stateMap[trimmed];
  }
  
  // Case-insensitive state name lookup
  const lowerState = trimmed.toLowerCase();
  for (const [fullName, code] of Object.entries(stateMap)) {
    if (fullName.toLowerCase() === lowerState) {
      return code;
    }
  }
  
  // If country is USA but state is invalid, try to extract state from complex strings
  if (country === 'USA' || country === 'United States') {
    // Try to find a state code in the string
    const upperState = trimmed.toUpperCase();
    for (const code of validUSStates) {
      if (upperState.includes(code)) {
        return code;
      }
    }
    
    // Try to find a state name in the string
    for (const [fullName, code] of Object.entries(stateMap)) {
      if (trimmed.toLowerCase().includes(fullName.toLowerCase())) {
        return code;
      }
    }
  }
  
  // If it looks like a country name, standardize it
  const standardizedCountry = countryMap[trimmed] || trimmed;
  if (validCountries.has(standardizedCountry)) {
    return standardizedCountry;
  }
  
  // Check if it's already a valid country
  if (validCountries.has(trimmed)) {
    return trimmed;
  }
  
  // If it contains "USA" or "United States", extract and return null (will use country field)
  if (trimmed.toLowerCase().includes('usa') || trimmed.toLowerCase().includes('united states')) {
    return null;
  }
  
  // If it's a long string that might be a country, keep it
  if (trimmed.length > 3 && !trimmed.match(/[0-9]/)) {
    return trimmed;
  }
  
  // Invalid or unclear - return null
  console.log(`   ⚠️  Unclear state: "${trimmed}" - setting to null`);
  return null;
}

function cleanCountry(country: string | null, state: string | null): string {
  if (!country || country.trim() === '') {
    // If no country specified, assume USA
    return 'USA';
  }
  
  const trimmed = country.trim();
  
  // Standardize country name
  const standardized = countryMap[trimmed] || trimmed;
  
  // If state looks like a US state code, country should be USA
  if (state && validUSStates.has(state.toUpperCase())) {
    return 'USA';
  }
  
  return standardized;
}

function cleanCity(city: string | null): string | null {
  if (!city) return null;
  
  const trimmed = city.trim();
  
  // Remove if it's too short (likely invalid)
  if (trimmed.length < 2) {
    return null;
  }
  
  // Remove if it's just numbers
  if (/^\d+$/.test(trimmed)) {
    return null;
  }
  
  // Remove obvious test data
  if (trimmed.toLowerCase() === 'test' || trimmed.toLowerCase() === 'n/a' || 
      trimmed.toLowerCase() === 'na' || trimmed.toLowerCase() === 'none') {
    return null;
  }
  
  // Clean up city names with multiple parts separated by commas (take first part)
  if (trimmed.includes(',')) {
    const parts = trimmed.split(',');
    const firstPart = parts[0].trim();
    if (firstPart.length >= 2) {
      return firstPart;
    }
  }
  
  // Clean up city names with state codes appended (e.g., "New York, NY" -> "New York")
  const cityStatePattern = /^(.+?),?\s+([A-Z]{2})$/;
  const match = trimmed.match(cityStatePattern);
  if (match) {
    return match[1].trim();
  }
  
  // Title case the city name
  const titleCased = trimmed
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  
  return titleCased;
}

async function main() {
  console.log('\n🧹 Starting State and City Data Cleaning...\n');
  
  // Get all interpreters
  console.log('📊 Fetching all interpreters...');
  const allInterpreters = await db.select().from(interpreters);
  console.log(`   Found ${allInterpreters.length} interpreters\n`);
  
  let statesCleaned = 0;
  let citiesCleaned = 0;
  let countriesSet = 0;
  
  console.log('🔧 Cleaning location data...\n');
  
  for (const interpreter of allInterpreters) {
    const updates: any = {};
    let needsUpdate = false;
    
    // Clean country first
    const cleanedCountry = cleanCountry(interpreter.country, interpreter.state);
    if (cleanedCountry !== interpreter.country) {
      updates.country = cleanedCountry;
      needsUpdate = true;
      countriesSet++;
    }
    
    // Clean state
    const cleanedState = cleanState(interpreter.state, cleanedCountry);
    if (cleanedState !== interpreter.state) {
      updates.state = cleanedState;
      needsUpdate = true;
      statesCleaned++;
    }
    
    // Clean city
    const cleanedCity = cleanCity(interpreter.city);
    if (cleanedCity !== interpreter.city) {
      updates.city = cleanedCity;
      needsUpdate = true;
      citiesCleaned++;
    }
    
    // Apply updates if needed
    if (needsUpdate) {
      await db.update(interpreters)
        .set(updates)
        .where(sql`${interpreters.id} = ${interpreter.id}`);
    }
  }
  
  console.log('\n✨ Location Data Cleaning Complete!\n');
  console.log(`   📍 States cleaned/normalized: ${statesCleaned}`);
  console.log(`   🏙️  Cities cleaned: ${citiesCleaned}`);
  console.log(`   🌍 Countries set/standardized: ${countriesSet}`);
  console.log(`   📊 Total interpreters processed: ${allInterpreters.length}\n`);
  
  // Show summary statistics
  console.log('📊 Location Distribution After Cleaning:\n');
  
  console.log('Top 20 States/Countries:');
  const stateStats = await db.execute(sql`
    SELECT state, COUNT(*) as count 
    FROM interpreters 
    WHERE state IS NOT NULL
    GROUP BY state 
    ORDER BY count DESC 
    LIMIT 20
  `);
  
  for (const row of stateStats.rows as any[]) {
    console.log(`   ${row.state}: ${row.count}`);
  }
  
  console.log('\nTop 20 Countries:');
  const countryStats = await db.execute(sql`
    SELECT country, COUNT(*) as count 
    FROM interpreters 
    WHERE country IS NOT NULL
    GROUP BY country 
    ORDER BY count DESC 
    LIMIT 20
  `);
  
  for (const row of countryStats.rows as any[]) {
    console.log(`   ${row.country}: ${row.count}`);
  }
  
  console.log('\nTop 20 Cities:');
  const cityStats = await db.execute(sql`
    SELECT city, COUNT(*) as count 
    FROM interpreters 
    WHERE city IS NOT NULL
    GROUP BY city 
    ORDER BY count DESC 
    LIMIT 20
  `);
  
  for (const row of cityStats.rows as any[]) {
    console.log(`   ${row.city}: ${row.count}`);
  }
  
  process.exit(0);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
