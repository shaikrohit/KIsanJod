const fs = require("fs");
const path = require("path");

const target = process.argv[2]?.toLowerCase();
if (!target || !["sqlite", "postgresql"].includes(target)) {
  console.log("Usage: node scripts/switch_db.js [sqlite|postgresql]");
  process.exit(1);
}

const schemaPath = path.join(__dirname, "..", "prisma", "schema.prisma");
let content = fs.readFileSync(schemaPath, "utf8");

if (target === "postgresql") {
  content = content.replace(
    /datasource db \{[\s\S]*?\}/,
    `datasource db {\n  provider  = "postgresql"\n  url       = env("DATABASE_URL")\n  directUrl = env("DIRECT_URL")\n}`
  );
  console.log("✓ Updated prisma/schema.prisma datasource provider to 'postgresql' (with directUrl for Supabase pooler)");
} else {
  content = content.replace(
    /datasource db \{[\s\S]*?\}/,
    `datasource db {\n  provider = "sqlite"\n  url      = env("DATABASE_URL")\n}`
  );
  console.log("✓ Updated prisma/schema.prisma datasource provider to 'sqlite'");
}

fs.writeFileSync(schemaPath, content, "utf8");
console.log("Done! Run 'npx prisma generate' to update Prisma Client.");

