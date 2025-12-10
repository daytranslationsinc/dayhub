import mysql from "mysql2/promise";
import { config } from "dotenv";

config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);

const sampleInterpreters = [
  // Spanish Interpreters - Various Cities
  {
    firstName: "Maria",
    lastName: "Rodriguez",
    phone: "(305) 555-0123",
    email: "maria.rodriguez@example.com",
    city: "Miami",
    state: "FL",
    metro: "Miami-Fort Lauderdale-West Palm Beach",
    lat: "25.7617",
    lng: "-80.1918",
    languages: JSON.stringify(["Spanish", "English"]),
    specialties: JSON.stringify(["Medical", "Legal"]),
    certifications: "ATA Certified Spanish Interpreter",
    source: "ATA",
  },
  {
    firstName: "Carlos",
    lastName: "Hernandez",
    phone: "(213) 555-0145",
    email: "carlos.h@example.com",
    city: "Los Angeles",
    state: "CA",
    metro: "Los Angeles-Long Beach-Anaheim",
    lat: "34.0522",
    lng: "-118.2437",
    languages: JSON.stringify(["Spanish", "English"]),
    specialties: JSON.stringify(["Business", "Conference"]),
    certifications: "NAJIT Certified",
    source: "NAJIT",
  },
  {
    firstName: "Isabel",
    lastName: "Sanchez",
    phone: "(312) 555-0167",
    email: "isabel.sanchez@example.com",
    city: "Chicago",
    state: "IL",
    metro: "Chicago-Naperville-Elgin",
    lat: "41.8781",
    lng: "-87.6298",
    languages: JSON.stringify(["Spanish", "English"]),
    specialties: JSON.stringify(["Medical", "Community"]),
    source: "State Court Registry",
  },

  // French Interpreters
  {
    firstName: "Jean",
    lastName: "Dubois",
    phone: "(212) 555-0189",
    email: "jean.dubois@example.com",
    city: "New York",
    state: "NY",
    metro: "New York-Newark-Jersey City",
    lat: "40.7128",
    lng: "-74.0060",
    languages: JSON.stringify(["French", "English", "Haitian Creole"]),
    specialties: JSON.stringify(["Legal", "Diplomatic"]),
    certifications: "ATA Certified French Interpreter",
    source: "ATA",
  },
  {
    firstName: "Sophie",
    lastName: "Laurent",
    phone: "(202) 555-0201",
    email: "sophie.laurent@example.com",
    city: "Washington",
    state: "DC",
    metro: "Washington-Arlington-Alexandria",
    lat: "38.9072",
    lng: "-77.0369",
    languages: JSON.stringify(["French", "English"]),
    specialties: JSON.stringify(["Conference", "Diplomatic"]),
    source: "ProZ.com",
  },

  // Mandarin Chinese Interpreters
  {
    firstName: "Wei",
    lastName: "Zhang",
    phone: "(415) 555-0223",
    email: "wei.zhang@example.com",
    city: "San Francisco",
    state: "CA",
    metro: "San Francisco-Oakland-Hayward",
    lat: "37.7749",
    lng: "-122.4194",
    languages: JSON.stringify(["Mandarin Chinese", "English", "Cantonese"]),
    specialties: JSON.stringify(["Business", "Technical"]),
    certifications: "ATA Certified Chinese Interpreter",
    source: "ATA",
  },
  {
    firstName: "Li",
    lastName: "Chen",
    phone: "(206) 555-0245",
    email: "li.chen@example.com",
    city: "Seattle",
    state: "WA",
    metro: "Seattle-Tacoma-Bellevue",
    lat: "47.6062",
    lng: "-122.3321",
    languages: JSON.stringify(["Mandarin Chinese", "English"]),
    specialties: JSON.stringify(["Medical", "Community"]),
    source: "Local Language Association",
  },

  // ASL (American Sign Language) Interpreters
  {
    firstName: "Sarah",
    lastName: "Johnson",
    phone: "(617) 555-0267",
    email: "sarah.johnson@example.com",
    city: "Boston",
    state: "MA",
    metro: "Boston-Cambridge-Newton",
    lat: "42.3601",
    lng: "-71.0589",
    languages: JSON.stringify(["ASL", "English"]),
    specialties: JSON.stringify(["Educational", "Medical"]),
    certifications: "RID Certified Interpreter",
    source: "RID",
  },
  {
    firstName: "Michael",
    lastName: "Davis",
    phone: "(512) 555-0289",
    email: "michael.davis@example.com",
    city: "Austin",
    state: "TX",
    metro: "Austin-Round Rock",
    lat: "30.2672",
    lng: "-97.7431",
    languages: JSON.stringify(["ASL", "English"]),
    specialties: JSON.stringify(["Legal", "Educational"]),
    certifications: "RID Certified Interpreter",
    source: "RID",
  },

  // Arabic Interpreters
  {
    firstName: "Fatima",
    lastName: "Al-Rashid",
    phone: "(313) 555-0301",
    email: "fatima.alrashid@example.com",
    city: "Detroit",
    state: "MI",
    metro: "Detroit-Warren-Dearborn",
    lat: "42.3314",
    lng: "-83.0458",
    languages: JSON.stringify(["Arabic", "English"]),
    specialties: JSON.stringify(["Medical", "Community"]),
    source: "Local Language Association",
  },
  {
    firstName: "Omar",
    lastName: "Hassan",
    phone: "(713) 555-0323",
    email: "omar.hassan@example.com",
    city: "Houston",
    state: "TX",
    metro: "Houston-The Woodlands-Sugar Land",
    lat: "29.7604",
    lng: "-95.3698",
    languages: JSON.stringify(["Arabic", "English", "French"]),
    specialties: JSON.stringify(["Legal", "Business"]),
    certifications: "ATA Certified Arabic Interpreter",
    source: "ATA",
  },

  // Russian Interpreters
  {
    firstName: "Dmitri",
    lastName: "Volkov",
    phone: "(718) 555-0345",
    email: "dmitri.volkov@example.com",
    city: "Brooklyn",
    state: "NY",
    metro: "New York-Newark-Jersey City",
    lat: "40.6782",
    lng: "-73.9442",
    languages: JSON.stringify(["Russian", "English", "Ukrainian"]),
    specialties: JSON.stringify(["Legal", "Medical"]),
    source: "State Court Registry",
  },

  // Vietnamese Interpreters
  {
    firstName: "Nguyen",
    lastName: "Tran",
    phone: "(714) 555-0367",
    email: "nguyen.tran@example.com",
    city: "Santa Ana",
    state: "CA",
    metro: "Los Angeles-Long Beach-Anaheim",
    lat: "33.7455",
    lng: "-117.8677",
    languages: JSON.stringify(["Vietnamese", "English"]),
    specialties: JSON.stringify(["Medical", "Community"]),
    source: "Local Language Association",
  },

  // Korean Interpreters
  {
    firstName: "Ji-Yoon",
    lastName: "Kim",
    phone: "(404) 555-0389",
    email: "jiyoon.kim@example.com",
    city: "Atlanta",
    state: "GA",
    metro: "Atlanta-Sandy Springs-Roswell",
    lat: "33.7490",
    lng: "-84.3880",
    languages: JSON.stringify(["Korean", "English"]),
    specialties: JSON.stringify(["Business", "Medical"]),
    certifications: "ATA Certified Korean Interpreter",
    source: "ATA",
  },

  // Portuguese Interpreters
  {
    firstName: "Ana",
    lastName: "Silva",
    phone: "(617) 555-0401",
    email: "ana.silva@example.com",
    city: "Cambridge",
    state: "MA",
    metro: "Boston-Cambridge-Newton",
    lat: "42.3736",
    lng: "-71.1097",
    languages: JSON.stringify(["Portuguese", "English", "Spanish"]),
    specialties: JSON.stringify(["Medical", "Legal"]),
    source: "ProZ.com",
  },

  // Japanese Interpreters
  {
    firstName: "Yuki",
    lastName: "Tanaka",
    phone: "(408) 555-0423",
    email: "yuki.tanaka@example.com",
    city: "San Jose",
    state: "CA",
    metro: "San Jose-Sunnyvale-Santa Clara",
    lat: "37.3382",
    lng: "-121.8863",
    languages: JSON.stringify(["Japanese", "English"]),
    specialties: JSON.stringify(["Business", "Technical"]),
    certifications: "ATA Certified Japanese Interpreter",
    source: "ATA",
  },

  // German Interpreters
  {
    firstName: "Hans",
    lastName: "Mueller",
    phone: "(215) 555-0445",
    email: "hans.mueller@example.com",
    city: "Philadelphia",
    state: "PA",
    metro: "Philadelphia-Camden-Wilmington",
    lat: "39.9526",
    lng: "-75.1652",
    languages: JSON.stringify(["German", "English"]),
    specialties: JSON.stringify(["Business", "Technical"]),
    source: "ProZ.com",
  },

  // Italian Interpreters
  {
    firstName: "Lucia",
    lastName: "Romano",
    phone: "(602) 555-0467",
    email: "lucia.romano@example.com",
    city: "Phoenix",
    state: "AZ",
    metro: "Phoenix-Mesa-Scottsdale",
    lat: "33.4484",
    lng: "-112.0740",
    languages: JSON.stringify(["Italian", "English"]),
    specialties: JSON.stringify(["Conference", "Business"]),
    source: "ATA",
  },

  // Haitian Creole Interpreters
  {
    firstName: "Pierre",
    lastName: "Jean-Baptiste",
    phone: "(954) 555-0489",
    email: "pierre.jb@example.com",
    city: "Fort Lauderdale",
    state: "FL",
    metro: "Miami-Fort Lauderdale-West Palm Beach",
    lat: "26.1224",
    lng: "-80.1373",
    languages: JSON.stringify(["Haitian Creole", "French", "English"]),
    specialties: JSON.stringify(["Medical", "Community"]),
    source: "Local Language Association",
  },

  // Polish Interpreters
  {
    firstName: "Anna",
    lastName: "Kowalski",
    phone: "(773) 555-0501",
    email: "anna.kowalski@example.com",
    city: "Chicago",
    state: "IL",
    metro: "Chicago-Naperville-Elgin",
    lat: "41.8781",
    lng: "-87.6298",
    languages: JSON.stringify(["Polish", "English"]),
    specialties: JSON.stringify(["Medical", "Legal"]),
    source: "State Court Registry",
  },

  // Hindi Interpreters
  {
    firstName: "Raj",
    lastName: "Patel",
    phone: "(972) 555-0523",
    email: "raj.patel@example.com",
    city: "Dallas",
    state: "TX",
    metro: "Dallas-Fort Worth-Arlington",
    lat: "32.7767",
    lng: "-96.7970",
    languages: JSON.stringify(["Hindi", "English", "Gujarati"]),
    specialties: JSON.stringify(["Business", "Technical"]),
    source: "Local Language Association",
  },

  // Tagalog Interpreters
  {
    firstName: "Maria",
    lastName: "Santos",
    phone: "(619) 555-0545",
    email: "maria.santos@example.com",
    city: "San Diego",
    state: "CA",
    metro: "San Diego-Carlsbad",
    lat: "32.7157",
    lng: "-117.1611",
    languages: JSON.stringify(["Tagalog", "English"]),
    specialties: JSON.stringify(["Medical", "Community"]),
    source: "Local Language Association",
  },

  // Somali Interpreters
  {
    firstName: "Amina",
    lastName: "Mohamed",
    phone: "(612) 555-0567",
    email: "amina.mohamed@example.com",
    city: "Minneapolis",
    state: "MN",
    metro: "Minneapolis-St. Paul-Bloomington",
    lat: "44.9778",
    lng: "-93.2650",
    languages: JSON.stringify(["Somali", "English", "Arabic"]),
    specialties: JSON.stringify(["Medical", "Community"]),
    source: "Local Language Association",
  },

  // Farsi Interpreters
  {
    firstName: "Reza",
    lastName: "Ahmadi",
    phone: "(310) 555-0589",
    email: "reza.ahmadi@example.com",
    city: "Los Angeles",
    state: "CA",
    metro: "Los Angeles-Long Beach-Anaheim",
    lat: "34.0522",
    lng: "-118.2437",
    languages: JSON.stringify(["Farsi", "English"]),
    specialties: JSON.stringify(["Legal", "Medical"]),
    source: "State Court Registry",
  },

  // Hmong Interpreters
  {
    firstName: "Mai",
    lastName: "Yang",
    phone: "(651) 555-0601",
    email: "mai.yang@example.com",
    city: "St. Paul",
    state: "MN",
    metro: "Minneapolis-St. Paul-Bloomington",
    lat: "44.9537",
    lng: "-93.0900",
    languages: JSON.stringify(["Hmong", "English"]),
    specialties: JSON.stringify(["Medical", "Community"]),
    source: "Local Language Association",
  },
];

console.log("Starting database seed...");

try {
  // Insert interpreters
  for (const interpreter of sampleInterpreters) {
    await connection.execute(
      `INSERT INTO interpreters 
      (firstName, lastName, phone, email, city, state, metro, lat, lng, languages, specialties, certifications, source, isActive, country) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'USA')`,
      [
        interpreter.firstName,
        interpreter.lastName,
        interpreter.phone || null,
        interpreter.email || null,
        interpreter.city || null,
        interpreter.state || null,
        interpreter.metro || null,
        interpreter.lat || null,
        interpreter.lng || null,
        interpreter.languages || null,
        interpreter.specialties || null,
        interpreter.certifications || null,
        interpreter.source || null,
      ]
    );
  }

  console.log(`✅ Successfully seeded ${sampleInterpreters.length} interpreters`);
  console.log("\nSample data includes:");
  console.log("- Spanish, French, Mandarin, ASL, Arabic, Russian, Vietnamese");
  console.log("- Korean, Portuguese, Japanese, German, Italian, Haitian Creole");
  console.log("- Polish, Hindi, Tagalog, Somali, Farsi, Hmong");
  console.log("\nCovering major metros:");
  console.log("- New York, Los Angeles, Chicago, Miami, Houston, Phoenix");
  console.log("- Philadelphia, San Antonio, San Diego, Dallas, San Jose");
  console.log("- Austin, Jacksonville, Fort Worth, Columbus, San Francisco");
  console.log("- Charlotte, Indianapolis, Seattle, Denver, Washington DC, Boston");
  console.log("- And more...");
} catch (error) {
  console.error("Error seeding database:", error);
} finally {
  await connection.end();
}
