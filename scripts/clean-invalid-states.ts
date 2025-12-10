import mysql from 'mysql2/promise';

async function cleanInvalidStates() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  
  console.log('=== Cleaning Invalid State Values ===\n');
  
  // Valid US state abbreviations
  const validStates = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
    'DC', 'PR', 'GU', 'VI', 'AS', 'MP'
  ];
  
  const placeholders = validStates.map(() => '?').join(',');
  
  // Set invalid states to NULL
  const [result] = await conn.query(
    `UPDATE interpreters SET state = NULL WHERE state IS NOT NULL AND state != '' AND state NOT IN (${placeholders})`,
    validStates
  );
  
  const updated = (result as any).affectedRows;
  console.log(`✓ Cleaned ${updated} interpreters with invalid state values\n`);
  
  // Check final count
  const [states] = await conn.query(
    'SELECT COUNT(DISTINCT state) as count FROM interpreters WHERE state IS NOT NULL AND state != ""'
  );
  console.log(`📊 Unique states after cleanup: ${(states as any)[0].count}`);
  
  // Show all valid states
  const [stateList] = await conn.query(
    'SELECT state, COUNT(*) as count FROM interpreters WHERE state IS NOT NULL AND state != "" GROUP BY state ORDER BY count DESC'
  );
  console.log('\nAll states in database:');
  (stateList as any[]).forEach(s => {
    console.log(`  ${s.state}: ${s.count} interpreters`);
  });
  
  await conn.end();
}

cleanInvalidStates().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
