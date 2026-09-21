// ============================================================================
// KisanJod - Global Prisma Client Singleton
// Prevents multiple PrismaClient instances during Next.js Hot Module Reload (HMR)
// ============================================================================

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Ensure DATABASE_URL is loaded in standalone scripts and CLI environments
if (!process.env.DATABASE_URL) {
  try {
    const fs = require("fs");
    const path = require("path");
    const envPath = path.resolve(process.cwd(), ".env");
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
          const idx = trimmed.indexOf("=");
          const key = trimmed.slice(0, idx).trim();
          let val = trimmed.slice(idx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    }
  } catch {}
}

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
    datasources: process.env.DATABASE_URL ? { db: { url: process.env.DATABASE_URL } } : undefined,
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

