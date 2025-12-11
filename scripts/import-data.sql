-- Import script for Railway MySQL
-- This transforms old schema column names to new schema

-- First, create a temporary table with the old schema
CREATE TEMPORARY TABLE IF NOT EXISTS temp_interpreters (
  id INT,
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  email VARCHAR(320),
  phone VARCHAR(50),
  source_language VARCHAR(100),
  target_language VARCHAR(100),
  city VARCHAR(255),
  state VARCHAR(100),
  zip_code VARCHAR(10),
  country VARCHAR(100),
  metro VARCHAR(255),
  lat DECIMAL(10, 7),
  lng DECIMAL(10, 7),
  timezone VARCHAR(100),
  certifications TEXT,
  certification_type VARCHAR(100),
  years_experience INT,
  hourly_rate DECIMAL(8, 2),
  proficiency_level VARCHAR(50),
  rating DECIMAL(3, 2),
  active BOOLEAN,
  available BOOLEAN,
  approval_status VARCHAR(20),
  notes TEXT,
  source VARCHAR(255),
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  last_active TIMESTAMP
);

-- The data will be inserted into temp_interpreters, then copied to interpreters
