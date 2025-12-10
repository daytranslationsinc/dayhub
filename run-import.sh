#!/bin/bash
# Load env from Node.js process
node -e "
const { config } = require('dotenv');
config();
const url = new URL(process.env.DATABASE_URL);
console.log('export DB_USER=' + url.username);
console.log('export DB_PASS=' + url.password);
console.log('export DB_HOST=' + url.hostname);
console.log('export DB_PORT=' + url.port);
console.log('export DB_NAME=' + url.pathname.slice(1).split('?')[0]);
" > /tmp/db_env.sh
source /tmp/db_env.sh
python3.11 import-all.py
