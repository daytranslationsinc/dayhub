-- Create ZIP code cache table for fast lookups without API calls
CREATE TABLE IF NOT EXISTS zipcode_cache (
  zipcode VARCHAR(10) PRIMARY KEY,
  lat DECIMAL(10, 7) NOT NULL,
  lng DECIMAL(11, 7) NOT NULL,
  city VARCHAR(255),
  state VARCHAR(2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create index for faster lookups
CREATE INDEX idx_zipcode_state ON zipcode_cache(state);
CREATE INDEX idx_zipcode_city ON zipcode_cache(city);

-- Seed with common ZIP codes (this would be populated from a free ZIP database or API calls)
-- For now, we'll populate it dynamically as users search
