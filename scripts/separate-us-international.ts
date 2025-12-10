import { db } from '../server/db';
import { interpreters } from '../drizzle/schema';
import { sql } from 'drizzle-orm';

// Valid 2-letter US state codes ONLY
const validUSStates = new Set([
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 
  'DC', 'PR', 'GU', 'VI', 'AS', 'MP'
]);

async function main() {
  console.log('\n🌍 Separating US States from International Countries...\n');
  
  // Get all interpreters
  console.log('📊 Fetching all interpreters...');
  const allInterpreters = await db.select().from(interpreters);
  console.log(`   Found ${allInterpreters.length} interpreters\n`);
  
  let usInterpreters = 0;
  let internationalMoved = 0;
  let statesCleared = 0;
  
  console.log('🔧 Processing location data...\n');
  
  for (const interpreter of allInterpreters) {
    const updates: any = {};
    let needsUpdate = false;
    
    const currentState = interpreter.state?.trim().toUpperCase();
    
    // Check if state is a valid US state code
    if (currentState && validUSStates.has(currentState)) {
      // Valid US state - ensure country is USA
      usInterpreters++;
      if (interpreter.country !== 'USA') {
        updates.country = 'USA';
        needsUpdate = true;
      }
    } else if (currentState) {
      // Not a valid US state - this is an international location
      // Move state value to country field and clear state
      console.log(`   🌍 Moving "${currentState}" from state to country`);
      updates.country = currentState;
      updates.state = null;
      needsUpdate = true;
      internationalMoved++;
      statesCleared++;
    }
    
    // Apply updates if needed
    if (needsUpdate) {
      await db.update(interpreters)
        .set(updates)
        .where(sql`${interpreters.id} = ${interpreter.id}`);
    }
  }
  
  console.log('\n✨ Separation Complete!\n');
  console.log(`   🇺🇸 US interpreters (valid state codes): ${usInterpreters}`);
  console.log(`   🌍 International locations moved to country: ${internationalMoved}`);
  console.log(`   🧹 State fields cleared for international: ${statesCleared}`);
  console.log(`   📊 Total interpreters processed: ${allInterpreters.length}\n`);
  
  // Verify results
  console.log('📊 Verification:\n');
  
  console.log('US States Distribution (should only show 2-letter codes):');
  const stateStats = await db.execute(sql`
    SELECT state, COUNT(*) as count 
    FROM interpreters 
    WHERE state IS NOT NULL
    GROUP BY state 
    ORDER BY count DESC 
    LIMIT 20
  `);
  
  for (const row of stateStats.rows as any[]) {
    const isValid = validUSStates.has(row.state?.toUpperCase());
    const marker = isValid ? '✅' : '❌';
    console.log(`   ${marker} ${row.state}: ${row.count}`);
  }
  
  console.log('\nCountries Distribution:');
  const countryStats = await db.execute(sql`
    SELECT country, COUNT(*) as count 
    FROM interpreters 
    WHERE country IS NOT NULL AND country != 'USA'
    GROUP BY country 
    ORDER BY count DESC 
    LIMIT 20
  `);
  
  for (const row of countryStats.rows as any[]) {
    console.log(`   ${row.country}: ${row.count}`);
  }
  
  // Check for any remaining invalid states
  console.log('\nChecking for invalid states...');
  const invalidStates = await db.execute(sql`
    SELECT DISTINCT state, COUNT(*) as count
    FROM interpreters 
    WHERE state IS NOT NULL 
      AND state NOT IN ('AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC','PR','GU','VI','AS','MP')
    GROUP BY state
  `);
  
  if (invalidStates.rows && (invalidStates.rows as any[]).length > 0) {
    console.log(`   ❌ Found ${(invalidStates.rows as any[]).length} invalid state entries:`);
    for (const row of invalidStates.rows as any[]) {
      console.log(`      - "${row.state}": ${row.count} interpreters`);
    }
  } else {
    console.log('   ✅ All state values are valid US state codes!');
  }
  
  process.exit(0);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
