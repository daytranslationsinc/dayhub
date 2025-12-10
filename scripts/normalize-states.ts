import mysql from 'mysql2/promise';

// Map of full state names to abbreviations
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

async function normalizeStates() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  
  console.log('=== Normalizing State Names ===\n');
  
  let totalUpdated = 0;
  
  for (const [fullName, abbrev] of Object.entries(stateMap)) {
    const [result] = await conn.query(
      'UPDATE interpreters SET state = ? WHERE state = ?',
      [abbrev, fullName]
    );
    
    const updated = (result as any).affectedRows;
    if (updated > 0) {
      console.log(`✓ ${fullName} → ${abbrev} (${updated} interpreters)`);
      totalUpdated += updated;
    }
  }
  
  console.log(`\n✅ Total interpreters updated: ${totalUpdated}`);
  
  // Check final count
  const [states] = await conn.query(
    'SELECT COUNT(DISTINCT state) as count FROM interpreters WHERE state IS NOT NULL AND state != ""'
  );
  console.log(`\n📊 Unique states after normalization: ${(states as any)[0].count}`);
  
  // Show top states
  const [topStates] = await conn.query(
    'SELECT state, COUNT(*) as count FROM interpreters WHERE state IS NOT NULL AND state != "" GROUP BY state ORDER BY count DESC LIMIT 10'
  );
  console.log('\nTop 10 states:');
  (topStates as any[]).forEach(s => {
    console.log(`  ${s.state}: ${s.count} interpreters`);
  });
  
  await conn.end();
}

normalizeStates().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
