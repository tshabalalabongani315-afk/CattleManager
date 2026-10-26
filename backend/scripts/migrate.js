import "dotenv/config";
import { createDb } from "../src/db.js";
import { migrate } from "../src/migrate.js";

// Usage: DATABASE_URL=postgres://... npm run migrate
// Idempotent — safe to run on every deploy. Deliberately independent of the
// app's runtime secrets so the build step only needs DATABASE_URL.
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
    console.error("[migrate] DATABASE_URL is not set — refusing to deploy without a database.");
    process.exit(1);
  }
  console.log("[migrate] DATABASE_URL not set; skipping (local dev migrates automatically).");
  process.exit(0);
}

const db = await createDb({ databaseUrl });
try {
  const ran = await migrate(db);
  console.log(ran.length ? `[migrate] applied: ${ran.join(", ")}` : "[migrate] already up to date");
} catch (err) {
  console.error("[migrate] failed:", err.message);
  process.exitCode = 1;
} finally {
  await db.close();
}
