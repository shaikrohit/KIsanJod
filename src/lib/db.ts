// ============================================================================
// KisanJod - Global Prisma Client Singleton
// Prevents multiple PrismaClient instances during Next.js Hot Module Reload (HMR)
// ============================================================================

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Ensure DATABASE_URL has valid postgresql:// protocol in PostgreSQL mode
const rawDbUrl = process.env.DATABASE_URL;
if (rawDbUrl && !rawDbUrl.startsWith("postgres://") && !rawDbUrl.startsWith("postgresql://")) {
  if (process.env.DIRECT_URL && (process.env.DIRECT_URL.startsWith("postgres://") || process.env.DIRECT_URL.startsWith("postgresql://"))) {
    process.env.DATABASE_URL = process.env.DIRECT_URL;
  }
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

export const prisma = db;
export default db;

