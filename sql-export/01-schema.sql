
-- DayHub Interpreter Database Schema
-- Generated: 2025-12-05T14:08:48.695Z

-- Create interpreters table
CREATE TABLE IF NOT EXISTS interpreters (
  id INT AUTO_INCREMENT PRIMARY KEY,
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  source_language VARCHAR(100),
  target_language VARCHAR(100),
  city VARCHAR(100),
  state VARCHAR(50),
  zip_code VARCHAR(20),
  country VARCHAR(100) DEFAULT 'USA',
  metro VARCHAR(100),
  lat DECIMAL(10, 8),
  lng DECIMAL(11, 8),
  timezone VARCHAR(50),
  certifications TEXT,
  certification_type VARCHAR(100),
  years_experience INT,
  hourly_rate DECIMAL(10, 2),
  proficiency_level VARCHAR(50),
  rating DECIMAL(3, 2),
  active BOOLEAN DEFAULT TRUE,
  available BOOLEAN DEFAULT TRUE,
  approval_status ENUM('pending', 'approved', 'rejected') DEFAULT 'approved',
  notes TEXT,
  source VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_active TIMESTAMP,
  INDEX idx_source_language (source_language),
  INDEX idx_target_language (target_language),
  INDEX idx_city (city),
  INDEX idx_state (state),
  INDEX idx_metro (metro),
  INDEX idx_lat_lng (lat, lng),
  INDEX idx_approval_status (approval_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create zipcode_cache table
CREATE TABLE IF NOT EXISTS zipcode_cache (
  zip_code VARCHAR(10) PRIMARY KEY,
  lat DECIMAL(10, 8),
  lng DECIMAL(11, 8),
  city VARCHAR(100),
  state VARCHAR(50),
  cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_lat_lng (lat, lng)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  open_id VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  email VARCHAR(255),
  avatar_url TEXT,
  role ENUM('admin', 'user') DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_open_id (open_id),
  INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  interpreter_id INT NOT NULL,
  booking_date TIMESTAMP NOT NULL,
  duration_hours DECIMAL(4, 2),
  status ENUM('pending', 'confirmed', 'completed', 'cancelled') DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (interpreter_id) REFERENCES interpreters(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_interpreter_id (interpreter_id),
  INDEX idx_booking_date (booking_date),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create favorites table
CREATE TABLE IF NOT EXISTS favorites (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  interpreter_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (interpreter_id) REFERENCES interpreters(id) ON DELETE CASCADE,
  UNIQUE KEY unique_favorite (user_id, interpreter_id),
  INDEX idx_user_id (user_id),
  INDEX idx_interpreter_id (interpreter_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
