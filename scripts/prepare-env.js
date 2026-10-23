const fs = require('fs');
const path = require('path');

const url =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_PRISMA_DATABASE_URL ||
  process.env.POSTGRES_DATABASE_URL ||
  process.env.POSTGRES_URL ||
  'postgresql://dummy:dummy@localhost:5432/dummy';

const envPath = path.join(__dirname, '..', '.env');
let content = '';
if (fs.existsSync(envPath)) {
  content = fs.readFileSync(envPath, 'utf8');
}

if (!content.includes('DATABASE_URL=')) {
  fs.appendFileSync(envPath, `\nDATABASE_URL="${url}"\n`);
  console.log('Synchronized DATABASE_URL to .env for Prisma generation.');
}
