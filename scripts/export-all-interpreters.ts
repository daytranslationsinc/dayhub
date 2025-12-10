import mysql from 'mysql2/promise';
import * as XLSX from 'xlsx';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function exportAllInterpreters() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  
  console.log('=== Export All Interpreters to Excel ===\n');
  
  // Fetch all interpreters with all fields
  const [interpreters] = await conn.query(`
    SELECT 
      id,
      firstName,
      lastName,
      email,
      phone,
      city,
      state,
      zipCode,
      country,
      metro,
      sourceLanguage,
      targetLanguage,
      lat,
      lng,
      timezone,
      specialties,
      certifications,
      certification_type,
      years_of_experience,
      hourly_rate,
      proficiency_level,
      rating,
      isActive,
      is_available,
      notes,
      source,
      approval_status,
      createdAt,
      updatedAt,
      last_active
    FROM interpreters
    ORDER BY lastName, firstName
  `);
  
  const records = interpreters as any[];
  console.log(`📊 Found ${records.length} interpreters\n`);
  
  // Format data for Excel
  const excelData = records.map(record => ({
    'ID': record.id,
    'First Name': record.firstName,
    'Last Name': record.lastName,
    'Email': record.email || '',
    'Phone': record.phone || '',
    'City': record.city || '',
    'State': record.state || '',
    'ZIP Code': record.zipCode || '',
    'Country': record.country || 'USA',
    'Metro Area': record.metro || '',
    'Source Language': record.sourceLanguage || '',
    'Target Language': record.targetLanguage || '',
    'Latitude': record.lat || '',
    'Longitude': record.lng || '',
    'Timezone': record.timezone || '',
    'Specialties': record.specialties || '',
    'Certifications': record.certifications || '',
    'Certification Type': record.certification_type || '',
    'Years of Experience': record.years_of_experience || 0,
    'Hourly Rate': record.hourly_rate || '',
    'Proficiency Level': record.proficiency_level || '',
    'Rating': record.rating || 0,
    'Active': record.isActive ? 'Yes' : 'No',
    'Available': record.is_available ? 'Yes' : 'No',
    'Notes': record.notes || '',
    'Source': record.source || '',
    'Approval Status': record.approval_status || 'approved',
    'Created At': record.createdAt ? new Date(record.createdAt).toISOString() : '',
    'Updated At': record.updatedAt ? new Date(record.updatedAt).toISOString() : '',
    'Last Active': record.last_active ? new Date(record.last_active).toISOString() : '',
  }));
  
  // Create workbook and worksheet
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(excelData);
  
  // Set column widths for better readability
  const columnWidths = [
    { wch: 6 },  // ID
    { wch: 15 }, // First Name
    { wch: 15 }, // Last Name
    { wch: 25 }, // Email
    { wch: 15 }, // Phone
    { wch: 15 }, // City
    { wch: 8 },  // State
    { wch: 10 }, // ZIP Code
    { wch: 8 },  // Country
    { wch: 20 }, // Metro Area
    { wch: 15 }, // Source Language
    { wch: 15 }, // Target Language
    { wch: 12 }, // Latitude
    { wch: 12 }, // Longitude
    { wch: 15 }, // Timezone
    { wch: 30 }, // Specialties
    { wch: 30 }, // Certifications
    { wch: 20 }, // Certification Type
    { wch: 12 }, // Years of Experience
    { wch: 12 }, // Hourly Rate
    { wch: 15 }, // Proficiency Level
    { wch: 8 },  // Rating
    { wch: 8 },  // Active
    { wch: 10 }, // Available
    { wch: 40 }, // Notes
    { wch: 15 }, // Source
    { wch: 15 }, // Approval Status
    { wch: 20 }, // Created At
    { wch: 20 }, // Updated At
    { wch: 20 }, // Last Active
  ];
  
  worksheet['!cols'] = columnWidths;
  
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Interpreters');
  
  // Generate filename with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const filename = `interpreters_export_${timestamp}.xlsx`;
  const filepath = join(__dirname, '..', filename);
  
  // Write to file
  XLSX.writeFile(workbook, filepath);
  
  console.log(`✅ Export complete!\n`);
  console.log(`📄 File saved to: ${filepath}`);
  console.log(`📊 Total records: ${records.length}`);
  
  await conn.end();
}

exportAllInterpreters().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
