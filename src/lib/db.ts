// ============================================================================
// KisanJod - Global Prisma Client Singleton
// Prevents multiple PrismaClient instances during Next.js Hot Module Reload (HMR)
// ============================================================================

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

globalForPrisma.prisma = db;

export const prisma = db;
export default db;

