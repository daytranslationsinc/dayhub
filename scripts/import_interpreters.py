#!/usr/bin/env python3
"""
Fast bulk import of interpreters using Python and MySQL connector
"""
import csv
import os
import mysql.connector
from urllib.parse import urlparse

def parse_database_url(url):
    """Parse DATABASE_URL into connection parameters"""
    parsed = urlparse(url)
    return {
        'host': parsed.hostname,
        'port': parsed.port or 3306,
        'user': parsed.username,
        'password': parsed.password,
        'database': parsed.path[1:] if parsed.path else None
    }

def map_metro(city, state):
    """Map city and state to metro area"""
    if not city:
        return None
    
    city_lower = city.lower()
    state_upper = state.upper() if state else ""
    
    metro_mappings = {
        ("tampa", "st. petersburg", "clearwater"): "Tampa-St. Petersburg-Clearwater, FL",
        ("miami", "fort lauderdale", "west palm"): "Miami-Fort Lauderdale-West Palm Beach, FL",
        ("orlando", "kissimmee"): "Orlando-Kissimmee-Sanford, FL",
        ("jacksonville",): "Jacksonville, FL",
        ("new york", "newark", "jersey city"): "New York-Newark-Jersey City, NY-NJ-PA",
        ("los angeles", "long beach", "anaheim"): "Los Angeles-Long Beach-Anaheim, CA",
        ("chicago", "naperville"): "Chicago-Naperville-Elgin, IL-IN-WI",
        ("houston", "woodlands", "sugar land"): "Houston-The Woodlands-Sugar Land, TX",
        ("phoenix", "mesa", "scottsdale"): "Phoenix-Mesa-Scottsdale, AZ",
        ("philadelphia", "camden", "wilmington"): "Philadelphia-Camden-Wilmington, PA-NJ-DE-MD",
        ("san antonio",): "San Antonio-New Braunfels, TX",
        ("san diego",): "San Diego-Carlsbad, CA",
        ("dallas", "fort worth", "arlington"): "Dallas-Fort Worth-Arlington, TX",
        ("san jose", "sunnyvale", "santa clara"): "San Jose-Sunnyvale-Santa Clara, CA",
        ("austin", "round rock"): "Austin-Round Rock, TX",
        ("seattle", "tacoma", "bellevue"): "Seattle-Tacoma-Bellevue, WA",
        ("denver", "aurora", "lakewood"): "Denver-Aurora-Lakewood, CO",
        ("washington", "arlington", "alexandria"): "Washington-Arlington-Alexandria, DC-VA-MD-WV",
        ("boston", "cambridge", "newton"): "Boston-Cambridge-Newton, MA-NH",
        ("atlanta", "sandy springs", "roswell"): "Atlanta-Sandy Springs-Roswell, GA",
        ("baltimore", "columbia", "towson"): "Baltimore-Columbia-Towson, MD",
    }
    
    for keywords, metro in metro_mappings.items():
        if any(keyword in city_lower for keyword in keywords):
            return metro
    
    if "portland" in city_lower and state_upper in ("OR", "WA"):
        return "Portland-Vancouver-Hillsboro, OR-WA"
    
    return None

def main():
    print("Starting fast interpreter import...")
    
    # Get database connection
    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        print("ERROR: DATABASE_URL not set")
        return
    
    conn_params = parse_database_url(database_url)
    print(f"Connecting to database: {conn_params['host']}")
    
    conn = mysql.connector.connect(**conn_params)
    cursor = conn.cursor()
    
    # Read CSV
    csv_path = "/home/ubuntu/all_interpreters_combined_final.csv"
    if not os.path.exists(csv_path):
        print(f"ERROR: CSV file not found at {csv_path}")
        return
    
    print(f"Reading CSV from {csv_path}...")
    
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        
        batch = []
        batch_size = 1000
        imported = 0
        
        for row in reader:
            metro = map_metro(row.get('City', ''), row.get('State', ''))
            
            batch.append((
                row.get('Name', 'Unknown'),
                row.get('Language', 'Unknown'),
                row.get('City') or None,
                row.get('State') or None,
                metro,
                row.get('Phone') or None,
                row.get('Email') or None,
                row.get('Source', 'Unknown'),
                None,  # certifications
                None,  # specialties
                None,  # latitude
                None,  # longitude
            ))
            
            if len(batch) >= batch_size:
                cursor.executemany("""
                    INSERT INTO interpreters 
                    (name, language, city, state, metro, phone, email, source, 
                     certifications, specialties, latitude, longitude)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, batch)
                conn.commit()
                imported += len(batch)
                print(f"Imported {imported} interpreters...")
                batch = []
        
        # Import remaining
        if batch:
            cursor.executemany("""
                INSERT INTO interpreters 
                (name, language, city, state, metro, phone, email, source, 
                 certifications, specialties, latitude, longitude)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, batch)
            conn.commit()
            imported += len(batch)
            print(f"Imported {imported} interpreters...")
    
    cursor.close()
    conn.close()
    
    print(f"\n✓ Import complete! Total: {imported} interpreters")

if __name__ == "__main__":
    main()
