const { execSync } = require('child_process');

// Synchronize all postgres environment variables from any available source
const effectiveDbUrl =
  process.env.POSTGRES_PRISMA_DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_DATABASE_URL ||
  process.env.DATABASE_URL ||
  'postgresql://dummy:dummy@localhost:5432/dummy';

process.env.DATABASE_URL = effectiveDbUrl;
process.env.POSTGRES_PRISMA_DATABASE_URL = effectiveDbUrl;
process.env.POSTGRES_URL = effectiveDbUrl;
process.env.POSTGRES_DATABASE_URL = effectiveDbUrl;
process.env.POSTGRES_URL_NON_POOLING = effectiveDbUrl;

console.log('Building with Prisma and Next.js...');

try {
  execSync('npx prisma generate', { stdio: 'inherit', env: process.env });
} catch (e) {
  console.warn('Prisma generate warning (continuing build):', e.message);
}

execSync('npx next build', { stdio: 'inherit', env: process.env, shell: true });
