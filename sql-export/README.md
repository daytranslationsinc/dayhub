# DayHub Database Migration

## Files

1. `01-schema.sql` - Database schema (tables, indexes, foreign keys)
2. `02-interpreters-batch-*.sql` - Interpreter data in batches of 1000
3. `03-zipcode-cache.sql` - ZIP code geocoding cache

## Import Instructions

### MySQL/MariaDB
```bash
mysql -u username -p database_name < 01-schema.sql
mysql -u username -p database_name < 02-interpreters-batch-1.sql
mysql -u username -p database_name < 02-interpreters-batch-2.sql
# ... repeat for all batches
mysql -u username -p database_name < 03-zipcode-cache.sql
```

### Import all files at once
```bash
cat *.sql | mysql -u username -p database_name
```

## Database Requirements

- MySQL 5.7+ or MariaDB 10.2+
- InnoDB storage engine
- UTF-8 (utf8mb4) character set

## Data Summary

- Total Interpreters: 11000
- ZIP Code Cache: 42741 entries
- Languages: 84+
- States: 50
- Metro Areas: 72

Generated: 2025-12-05T14:08:49.649Z
