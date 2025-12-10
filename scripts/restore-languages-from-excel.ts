import mysql from 'mysql2/promise';
import XLSX from 'xlsx';

async function restoreLanguages() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  
  console.log('=== Restore Languages from Excel Backup ===\n');
  
  // Read the Excel file (the one created after language standardization)
  const workbook = XLSX.readFile('/home/ubuntu/interpreter-database/interpreters_export_2025-12-05T05-07-41.xlsx');
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(worksheet);
  
  console.log(`📄 Loaded ${data.length} records from Excel backup\n`);
  
  let restored = 0;
  let skipped = 0;
  
  for (const row of data as any[]) {
    const id = row['ID'];
    const sourceLanguage = row['Source Language'];
    const targetLanguage = row['Target Language'];
    
    if (!id) {
      skipped++;
      continue;
    }
    
    // Update the interpreter's language fields
    await conn.query(
      'UPDATE interpreters SET sourceLanguage = ?, targetLanguage = ? WHERE id = ?',
      [sourceLanguage || null, targetLanguage || null, id]
    );
    
    restored++;
    
    if (restored % 1000 === 0) {
      console.log(`  Restored ${restored} interpreters...`);
    }
  }
  
  console.log(`\n✅ Restored ${restored} interpreters`);
  console.log(`⏭️  Skipped ${skipped} records\n`);
  
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
  
  await conn.end();
}

restoreLanguages().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
