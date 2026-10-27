import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const rawDbUrl =
  process.env.POSTGRES_PRISMA_DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_DATABASE_URL ||
  process.env.DATABASE_URL;

// Optimize connection parameters for remote Prisma Postgres cloud database
function getOptimizedDbUrl(url?: string): string | undefined {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    if (!parsed.searchParams.has('connection_limit')) {
      parsed.searchParams.set('connection_limit', '10');
    }
    if (!parsed.searchParams.has('pool_timeout')) {
      parsed.searchParams.set('pool_timeout', '20');
    }
    if (!parsed.searchParams.has('connect_timeout')) {
      parsed.searchParams.set('connect_timeout', '15');
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

const effectiveDbUrl = getOptimizedDbUrl(rawDbUrl);

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasources: effectiveDbUrl
      ? {
          db: {
            url: effectiveDbUrl,
          },
        }
      : undefined,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

// ALWAYS preserve the Prisma instance on globalThis across all environments
// to prevent connection pool exhaustion on serverless and hot reloads
globalForPrisma.prisma = prisma;

/**
 * Resilient query wrapper with automatic retry for transient cloud database connection drops.
 */
export async function withPrismaRetry<T>(
  operation: () => Promise<T>,
  retries = 2,
  delayMs = 400
): Promise<T> {
  let lastError: any;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await operation();
    } catch (err: any) {
      lastError = err;
      const isConnectionError =
        err?.message?.includes("Can't reach database server") ||
        err?.message?.includes('connection') ||
        err?.code === 'P1001' ||
        err?.code === 'P1002' ||
        err?.code === 'P1017';

      if (isConnectionError && attempt < retries) {
        console.warn(
          `[Prisma] Connection retry ${attempt + 1}/${retries} after transient failure...`
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

export default prisma;
