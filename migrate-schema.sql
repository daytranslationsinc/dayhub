ALTER TABLE interpreters 
  ADD COLUMN sourceLanguage VARCHAR(100) DEFAULT 'English',
  ADD COLUMN targetLanguage VARCHAR(100),
  ADD COLUMN zipCode VARCHAR(10),
  ADD INDEX source_language_idx (sourceLanguage),
  ADD INDEX target_language_idx (targetLanguage),
  ADD INDEX zip_code_idx (zipCode);
