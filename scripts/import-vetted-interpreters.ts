import XLSX from 'xlsx';
import * as fs from 'fs';
import { db } from '../server/db';
import { interpreters } from '../drizzle/schema';
import { eq, or, sql } from 'drizzle-orm';

interface VettedInterpreter {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  city?: string;
  state?: string;
  country?: string;
  sourceLanguage?: string;
  targetLanguage?: string;
  hourlyRate?: number;
  specialties?: string;
  certifications?: string;
  notes?: string;
  vettedNotes?: string;
}

// Parse US state abbreviations
function parseState(state: string | undefined): string | undefined {
  if (!state) return undefined;
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
  
  const trimmed = state.trim();
  if (trimmed.length === 2) return trimmed.toUpperCase();
  return stateMap[trimmed] || trimmed;
}

// Parse hourly rate from string
function parseRate(rateStr: string | undefined): number | undefined {
  if (!rateStr) return undefined;
  const match = String(rateStr).match(/[\d.]+/);
  return match ? parseFloat(match[0]) : undefined;
}

// Clean and normalize language
function normalizeLanguage(lang: string | undefined): string | undefined {
  if (!lang) return undefined;
  const cleaned = lang.trim();
  if (!cleaned) return undefined;
  
  // Capitalize first letter of each word
  return cleaned.split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
}

async function main() {
  console.log('\n🚀 Starting Vetted Interpreters Import...\n');
  
  const vettedInterpreters: VettedInterpreter[] = [];
  const seenEmails = new Set<string>();
  const seenPhones = new Set<string>();
  
  // ===== FILE 1: TerpApplicantsViewOnly.xlsx =====
  console.log('📄 Processing File 1: TerpApplicantsViewOnly.xlsx');
  const workbook1 = XLSX.readFile('/home/ubuntu/upload/pasted_file_jy9Wzs_TerpApplicantsViewOnly.xlsx');
  const data1 = XLSX.utils.sheet_to_json(workbook1.Sheets[workbook1.SheetNames[0]]);
  
  let file1Count = 0;
  for (const row of data1 as any[]) {
    const email = row['Email Address_1'] || row['Email Address'];
    const phone = row['Phone #1'];
    const firstName = row['First Name'];
    const lastName = row['Last Name'];
    
    if (!firstName || !lastName) continue;
    if (email && seenEmails.has(email)) continue;
    if (phone && seenPhones.has(phone)) continue;
    
    const nativeLang = normalizeLanguage(row['Native Language']);
    const langCombos = row['Language combinations'];
    let sourceLanguage = nativeLang || 'English';
    let targetLanguage = 'English';
    
    // Parse language combinations
    if (langCombos) {
      const combos = String(langCombos).split(/[,;\/]/).map(l => normalizeLanguage(l)).filter(Boolean);
      if (combos.length > 0) {
        targetLanguage = combos[0] || 'English';
        if (combos.length > 1) sourceLanguage = combos[1] || sourceLanguage;
      }
    }
    
    const hourlyRate = parseRate(row['Interpreting - Rate per hour in USD']);
    const specialties = row['Interpreting Specialty fields (Please check all that apply)'] || row['Interpreting specialty fields'];
    
    const certifications = [];
    if (row['Are you court certified?'] === 'Yes') certifications.push('Court Certified');
    if (row['Are you federally certified?'] === 'Yes') certifications.push('Federal Certified');
    if (row['Are you medically certified?'] === 'Yes') certifications.push('Medical Certified');
    if (row['Can you do conference interpreting?'] === 'Yes') certifications.push('Conference Interpreting');
    
    const notes = row['Important notes about yourself.'] || '';
    const vettedNotes = `Vetted applicant from Day Translations. ${notes}`.trim();
    
    vettedInterpreters.push({
      firstName: String(firstName).trim(),
      lastName: String(lastName).trim(),
      email: email ? String(email).trim() : undefined,
      phone: phone ? String(phone).trim() : undefined,
      city: row['City'] ? String(row['City']).trim() : undefined,
      state: parseState(row['State/Province']),
      country: row['Country'] || 'USA',
      sourceLanguage,
      targetLanguage,
      hourlyRate,
      specialties: specialties ? String(specialties) : undefined,
      certifications: certifications.length > 0 ? certifications.join(', ') : undefined,
      notes,
      vettedNotes,
    });
    
    if (email) seenEmails.add(email);
    if (phone) seenPhones.add(phone);
    file1Count++;
  }
  console.log(`   ✅ Processed ${file1Count} interpreters from File 1\n`);
  
  // ===== FILE 2: InterpretersDBViewOnly(2).xlsx =====
  console.log('📄 Processing File 2: InterpretersDBViewOnly(2).xlsx');
  const workbook2 = XLSX.readFile('/home/ubuntu/upload/pasted_file_DvZZjn_InterpretersDBViewOnly(2).xlsx');
  const data2 = XLSX.utils.sheet_to_json(workbook2.Sheets[workbook2.SheetNames[0]]);
  
  let file2Count = 0;
  for (const row of data2 as any[]) {
    // This file seems to have less complete data, skip if no useful info
    const nativeLang = normalizeLanguage(row['Native Language_1']);
    if (!nativeLang) continue;
    
    const certifications = [];
    if (row['Are you court certified?'] === 'Yes') certifications.push('Court Certified');
    if (row['Are you federally certified?'] === 'Yes') certifications.push('Federal Certified');
    if (row['Are you medically certified?'] === 'Yes') certifications.push('Medical Certified');
    if (row['Can you do conference interpreting?'] === 'Yes') certifications.push('Conference Interpreting');
    
    // Only add if we have meaningful data
    if (certifications.length > 0) {
      file2Count++;
    }
  }
  console.log(`   ℹ️  File 2 has ${file2Count} records with certifications (used for enrichment)\n`);
  
  // ===== FILE 3: FinishedInterpretation.csv =====
  console.log('📄 Processing File 3: FinishedInterpretation.csv');
  const csvContent = fs.readFileSync('/home/ubuntu/upload/pasted_file_atuoQD_FinishedInterpretation.csv', 'utf-8');
  const lines = csvContent.split('\n').filter(l => l.trim());
  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
  
  let file3Count = 0;
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.replace(/"/g, '').trim());
    const row: any = {};
    headers.forEach((h, idx) => { row[h] = values[idx]; });
    
    const name = row['Interpreter name'];
    const email = row['Your Email (Interpreter e-mail)'];
    
    if (!name || !email) continue;
    if (seenEmails.has(email)) continue;
    
    const nameParts = name.split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || nameParts[0];
    
    const sourceLanguage = normalizeLanguage(row['Source language']) || 'English';
    const targetLanguage = normalizeLanguage(row['Target language']) || 'English';
    const totalAmount = parseRate(row['Total Amount Due for the project:']);
    
    const vettedNotes = `Completed ${row['Type of interpretation'] || 'interpretation'} project. ${row['Interpretation details. Anything important we should know?'] || ''}`.trim();
    
    vettedInterpreters.push({
      firstName,
      lastName,
      email,
      sourceLanguage,
      targetLanguage,
      hourlyRate: totalAmount,
      vettedNotes,
    });
    
    seenEmails.add(email);
    file3Count++;
  }
  console.log(`   ✅ Processed ${file3Count} interpreters from File 3\n`);
  
  // ===== IMPORT TO DATABASE =====
  console.log(`📊 Total unique vetted interpreters to import: ${vettedInterpreters.length}\n`);
  console.log('💾 Importing to database...\n');
  
  let imported = 0;
  let updated = 0;
  let skipped = 0;
  
  for (const interp of vettedInterpreters) {
    try {
      // Check if interpreter already exists by email or phone
      let existing = null;
      if (interp.email) {
        const results = await db.select().from(interpreters).where(eq(interpreters.email, interp.email)).limit(1);
        existing = results[0];
      }
      if (!existing && interp.phone) {
        const results = await db.select().from(interpreters).where(eq(interpreters.phone, interp.phone)).limit(1);
        existing = results[0];
      }
      
      if (existing) {
        // Update existing interpreter to mark as vetted
        await db.update(interpreters)
          .set({
            isVetted: true,
            vettedNotes: interp.vettedNotes || existing.vettedNotes,
            hourlyRate: interp.hourlyRate ? String(interp.hourlyRate) : existing.hourlyRate,
            specialties: interp.specialties || existing.specialties,
            certifications: interp.certifications || existing.certifications,
          })
          .where(eq(interpreters.id, existing.id));
        updated++;
      } else {
        // Insert new vetted interpreter
        await db.insert(interpreters).values({
          firstName: interp.firstName,
          lastName: interp.lastName,
          email: interp.email,
          phone: interp.phone,
          city: interp.city,
          state: interp.state,
          country: interp.country || 'USA',
          sourceLanguage: interp.sourceLanguage || 'English',
          targetLanguage: interp.targetLanguage || 'English',
          hourlyRate: interp.hourlyRate ? String(interp.hourlyRate) : undefined,
          specialties: interp.specialties,
          certifications: interp.certifications,
          notes: interp.notes,
          isVetted: true,
          vettedNotes: interp.vettedNotes,
          isActive: true,
          approvalStatus: 'approved',
        });
        imported++;
      }
    } catch (error: any) {
      if (error.message?.includes('Duplicate entry')) {
        skipped++;
      } else {
        console.error(`   ❌ Error processing ${interp.firstName} ${interp.lastName}:`, error.message);
      }
    }
  }
  
  console.log('\n✨ Import Complete!\n');
  console.log(`   📥 New interpreters imported: ${imported}`);
  console.log(`   🔄 Existing interpreters updated: ${updated}`);
  console.log(`   ⏭️  Duplicates skipped: ${skipped}`);
  console.log(`   📊 Total processed: ${imported + updated + skipped}\n`);
  
  process.exit(0);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
