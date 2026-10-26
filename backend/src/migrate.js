import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../migrations");

/** Applies any unapplied migrations/*.sql files, each inside a transaction. */
export async function migrate(db) {
  await db.query(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
       name TEXT PRIMARY KEY,
       applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
     )`
  );

  const applied = new Set((await db.query("SELECT name FROM schema_migrations")).map((r) => r.name));
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const ran = [];
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = fs.readFileSync(path.join(dir, file), "utf8");
    await db.tx(async (t) => {
      // One statement at a time keeps this portable across pg and PGlite.
      for (const stmt of splitStatements(sql)) await t.query(stmt);
      await t.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
    });
    ran.push(file);
  }
  return ran;
}

// Migrations only contain plain DDL (no function bodies / dollar quoting), so
// splitting on semicolons outside comments is sufficient and safe here.
function splitStatements(sql) {
  return sql
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}
