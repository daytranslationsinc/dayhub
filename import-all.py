#!/usr/bin/env python3.11
import openpyxl
import mysql.connector
import json
import os
from pathlib import Path

# Database connection
db = mysql.connector.connect(
    host=os.environ.get("DB_HOST", "gateway01.us-west-2.prod.aws.tidbcloud.com"),
    port=int(os.environ.get("DB_PORT", 4000)),
    user=os.environ.get("DB_USER"),
    password=os.environ.get("DB_PASSWORD"),
    database=os.environ.get("DB_NAME"),
    ssl_ca="/etc/ssl/certs/ca-certificates.crt",
    ssl_verify_cert=True,
    ssl_verify_identity=True
)

cursor = db.cursor()

print("🚀 Starting comprehensive interpreter import...\n")

# Directory with all Excel files
excel_dir = Path("/home/ubuntu/FINAL_Comprehensive_All_56_Metros")

# Get all Excel files except summary
excel_files = [f for f in excel_dir.glob("*.xlsx") if not f.name.startswith("00_SUMMARY") and not f.name.startswith("MASTER")]

print(f"📂 Found {len(excel_files)} metro Excel files to process\n")

total_imported = 0
total_skipped = 0
total_errors = 0

for excel_file in sorted(excel_files):
    metro_name = excel_file.stem.replace("_", " ")
    print(f"\n📍 Processing: {metro_name}")
    
    try:
        wb = openpyxl.load_workbook(excel_file, read_only=True, data_only=True)
        sheet = wb.active
        
        rows = list(sheet.rows)
        if len(rows) < 2:
            print(f"   ⚠️  Empty sheet, skipping")
            continue
            
        # Get headers
        headers = [cell.value for cell in rows[0]]
        data_rows = rows[1:]
        
        print(f"   Found {len(data_rows)} rows")
        
        sheet_imported = 0
        sheet_skipped = 0
        
        for row in data_rows:
            try:
                # Extract data
                row_data = {headers[i]: cell.value for i, cell in enumerate(row) if i < len(headers)}
                
                # Parse name
                full_name = str(row_data.get("Name", "")).strip()
                if not full_name or full_name == "None":
                    sheet_skipped += 1
                    continue
                
                name_parts = full_name.split()
                first_name = name_parts[0] if name_parts else "Unknown"
                last_name = " ".join(name_parts[1:]) if len(name_parts) > 1 else ""
                
                # Extract other fields
                language = str(row_data.get("Language", "")).strip()
                if not language or language == "None":
                    sheet_skipped += 1
                    continue
                
                # Parse languages (could be comma-separated)
                languages = [l.strip() for l in language.split(",") if l.strip()]
                
                city = row_data.get("City")
                city = str(city).strip() if city and str(city) != "None" else None
                
                state = row_data.get("State")
                state = str(state).strip() if state and str(state) != "None" else None
                
                phone = row_data.get("Phone")
                phone = str(phone).strip() if phone and str(phone) != "None" else None
                
                email = row_data.get("Email")
                email = str(email).strip() if email and str(email) != "None" else None
                
                source = row_data.get("Source", "Unknown")
                source = str(source).strip() if source and str(source) != "None" else "Unknown"
                
                # Check for duplicates
                if email and email != "None":
                    cursor.execute("SELECT id FROM interpreters WHERE email = %s LIMIT 1", (email,))
                    if cursor.fetchone():
                        sheet_skipped += 1
                        continue
                
                if city and first_name and last_name:
                    cursor.execute(
                        "SELECT id FROM interpreters WHERE firstName = %s AND lastName = %s AND city = %s LIMIT 1",
                        (first_name, last_name, city)
                    )
                    if cursor.fetchone():
                        sheet_skipped += 1
                        continue
                
                # Insert interpreter
                cursor.execute("""
                    INSERT INTO interpreters 
                    (firstName, lastName, phone, email, city, state, metro, languages, source, isActive, country) 
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 1, 'USA')
                """, (
                    first_name,
                    last_name,
                    phone,
                    email,
                    city,
                    state,
                    metro_name,
                    json.dumps(languages),
                    source
                ))
                
                sheet_imported += 1
                total_imported += 1
                
                # Progress indicator
                if sheet_imported % 50 == 0:
                    print(".", end="", flush=True)
                    
            except Exception as e:
                total_errors += 1
                if total_errors <= 5:
                    print(f"\n   ⚠️  Error: {str(e)[:100]}")
        
        total_skipped += sheet_skipped
        db.commit()
        print(f"\n   ✅ Imported: {sheet_imported} | Skipped: {sheet_skipped}")
        
    except Exception as e:
        print(f"   ❌ Error processing file: {str(e)}")
        total_errors += 1

print("\n" + "=" * 60)
print("📊 IMPORT SUMMARY")
print("=" * 60)
print(f"✅ Total Imported: {total_imported}")
print(f"⏭️  Total Skipped:  {total_skipped}")
print(f"❌ Total Errors:   {total_errors}")
print("=" * 60)

# Get final statistics
cursor.execute("SELECT COUNT(*) FROM interpreters WHERE isActive = 1")
total_interpreters = cursor.fetchone()[0]

cursor.execute("SELECT DISTINCT metro FROM interpreters WHERE isActive = 1 AND metro IS NOT NULL")
metros = cursor.fetchall()

cursor.execute("SELECT DISTINCT state FROM interpreters WHERE isActive = 1 AND state IS NOT NULL")
states = cursor.fetchall()

cursor.execute("SELECT languages FROM interpreters WHERE isActive = 1 AND languages IS NOT NULL")
all_langs = set()
for (langs_json,) in cursor.fetchall():
    try:
        langs = json.loads(langs_json)
        all_langs.update(langs)
    except:
        pass

print("\n📈 DATABASE STATISTICS")
print("=" * 60)
print(f"Total Active Interpreters: {total_interpreters}")
print(f"Unique Languages: {len(all_langs)}")
print(f"Metro Areas: {len(metros)}")
print(f"States: {len(states)}")
print("=" * 60)

print("\n🎉 Import completed successfully!")

cursor.close()
db.close()
