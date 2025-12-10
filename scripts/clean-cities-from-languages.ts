import mysql from 'mysql2/promise';

async function cleanCitiesFromLanguages() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  
  console.log('=== Clean Cities/States from Language Fields ===\n');
  
  // Comprehensive list of US cities and states that should NOT be in language fields
  const invalidEntries = [
    // Major US cities
    'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia',
    'San Antonio', 'San Diego', 'Dallas', 'San Jose', 'Austin', 'Jacksonville',
    'Fort Worth', 'Columbus', 'Charlotte', 'San Francisco', 'Indianapolis',
    'Seattle', 'Denver', 'Washington', 'Boston', 'El Paso', 'Nashville',
    'Detroit', 'Oklahoma City', 'Portland', 'Las Vegas', 'Memphis', 'Louisville',
    'Baltimore', 'Milwaukee', 'Albuquerque', 'Tucson', 'Fresno', 'Mesa',
    'Sacramento', 'Atlanta', 'Kansas City', 'Colorado Springs', 'Raleigh',
    'Miami', 'Long Beach', 'Virginia Beach', 'Omaha', 'Oakland', 'Minneapolis',
    'Tulsa', 'Tampa', 'Arlington', 'New Orleans', 'Wichita', 'Cleveland',
    
    // Additional cities from the database
    'Addison', 'Allentown', 'Anaheim', 'Ann Arbor', 'Arcadia', 'Astoria',
    'Aurora', 'Bakersfield', 'Bangalore', 'Bellevue', 'Bensalem', 'Bethel',
    'Beverly Hills', 'Biddeford', 'Blaine', 'Bloomington', 'Boise', 'Box Elder',
    'Braintree', 'Bronx', 'Brookline', 'Brooklyn', 'Brownsville', 'Buffalo Grove',
    'Canaan', 'Canton', 'Centereach', 'Chandler', 'Charlotte Hall', 'Cherry Hill',
    'Chestertown', 'Cincinnati', 'Clearwater', 'Clifton', 'Clovis', 'Corpus Christi',
    'Cumming', 'Daly City', 'Danbury', 'Davie', 'Dededo', 'Delta Junction',
    'Durant', 'East Providence', 'El Cajon', 'Elmhurst', 'Englewood Cliffs',
    'Evansville', 'Fairview Heights', 'Fall River', 'Folsom', 'Fond Du Lac',
    'Fort Mill', 'Framingham', 'Frisco', 'Flushing', 'Garden City', 'Glen Burnie',
    'Glendale', 'Grand Island', 'Great Neck', 'Hermitage', 'Hialeah', 'Honolulu',
    'Inverness', 'Irvine', 'Jackson Heights', 'Kenmore', 'Keswick', 'Kotzebue',
    'La Grange', 'Laredo', 'Lawrenceville', 'Lexington', 'Lilburn', 'Little Falls',
    'Lowell', 'Manhattan', 'Mcallen', 'Miami Beach', 'Monterey Park', 'Mount Laurel',
    'Mt Pleasant', 'New Bedford', 'Newark', 'Newton', 'Norman', 'North Miami Beach',
    'North Riverside', 'Oceanside', 'Orange County', 'Oshkosh', 'Palisades Park',
    'Pasadena', 'Pawtucket', 'Pittsburgh', 'Plano', 'Polacca', 'Pomona',
    'Providence', 'Redondo Beach', 'Reston', 'Richmond', 'Ridgewood', 'Riverdale',
    'Rogers', 'Saint Louis', 'Salt Lake City', 'San Lorenzo', 'San Mateo',
    'Santa Ana', 'Shanghai', 'Shelby Township', 'Silver Spring', 'Spring',
    'St. Paul', 'Stafford', 'Staten Island', 'Syosset', 'Takoma Park',
    'Tallahassee', 'Torrance', 'Trenton', 'Troy', 'Vail', 'Vancouver',
    'Vernon Hills', 'Waimea', 'Waunakee', 'West Grove', 'West Roxbury',
    'Westminster', 'Whiteland', 'Whittier', 'Woburn', 'Yuba City', 'Orlando',
    
    // US States (full names and abbreviations)
    'Alabama', 'AL', 'Alaska', 'AK', 'Arizona', 'AZ', 'Arkansas', 'AR',
    'California', 'CA', 'Colorado', 'CO', 'Connecticut', 'CT', 'Delaware', 'DE',
    'Florida', 'FL', 'Georgia', 'GA', 'Hawaii', 'HI', 'Idaho', 'ID',
    'Illinois', 'IL', 'Indiana', 'IN', 'Iowa', 'IA', 'Kansas', 'KS',
    'Kentucky', 'KY', 'Louisiana', 'LA', 'Maine', 'ME', 'Maryland', 'MD',
    'Massachusetts', 'MA', 'Michigan', 'MI', 'Minnesota', 'MN', 'Mississippi', 'MS',
    'Missouri', 'MO', 'Montana', 'MT', 'Nebraska', 'NE', 'Nevada', 'NV',
    'New Hampshire', 'NH', 'New Jersey', 'NJ', 'New Mexico', 'NM', 'New York', 'NY',
    'North Carolina', 'NC', 'North Dakota', 'ND', 'Ohio', 'OH', 'Oklahoma', 'OK',
    'Oregon', 'OR', 'Pennsylvania', 'PA', 'Rhode Island', 'RI', 'South Carolina', 'SC',
    'South Dakota', 'SD', 'Tennessee', 'TN', 'Texas', 'TX', 'Utah', 'UT',
    'Vermont', 'VT', 'Virginia', 'VA', 'Washington', 'WA', 'West Virginia', 'WV',
    'Wisconsin', 'WI', 'Wyoming', 'WY', 'District of Columbia', 'DC',
    
    // Other invalid entries
    'Muncie', 'Ny', 'Il', 'Ca', 'Tx', 'Fl', 'Nj', 'Ma', 'Pa', 'Oh', 'Mi', 'Nc', 'Va'
  ];
  
  let totalCleaned = 0;
  
  // Clean source languages
  console.log('Cleaning source languages...');
  for (const entry of invalidEntries) {
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
  for (const entry of invalidEntries) {
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
  
  // Show remaining unique languages
  const [langs] = await conn.query(`
    SELECT DISTINCT sourceLanguage as lang
    FROM interpreters
    WHERE sourceLanguage IS NOT NULL AND sourceLanguage != ''
    ORDER BY sourceLanguage
    LIMIT 30
  `);
  
  console.log('\n📝 Sample of remaining languages:');
  (langs as any[]).forEach(row => console.log(`  - ${row.lang}`));
  
  await conn.end();
}

cleanCitiesFromLanguages().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
