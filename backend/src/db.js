import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

// Postgres OIDs we want as plain values instead of JS Date objects, so a
// calendar date like 2026-03-01 never shifts across a timezone boundary.
const OID_DATE = 1082;

/**
 * Creates the database handle. Production (DATABASE_URL set) talks to Postgres
 * through `pg`. With no DATABASE_URL (local dev and tests) it uses PGlite, a
 * real Postgres compiled to WASM, so there is nothing to install or run.
 *
 * Both back ends expose the same tiny interface:
 *   query(text, params) -> rows[]
 *   tx(fn)              -> runs fn({ query }) inside BEGIN/COMMIT
 *   close()
 */
export async function createDb({ databaseUrl, dataDir } = {}) {
  if (databaseUrl) return createPgDb(databaseUrl);
  return createPgliteDb(dataDir);
}

async function createPgDb(connectionString) {
  const { default: pg } = await import("pg");
  pg.types.setTypeParser(OID_DATE, (v) => v);

  // Serverless functions can fan out; keep each instance's pool tiny.
  const pool = new pg.Pool({ connectionString, max: 3, idleTimeoutMillis: 10_000 });

  const run = (client) => async (text, params = []) => (await client.query(text, params)).rows;

  return {
    kind: "pg",
    query: run(pool),
    async tx(fn) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const result = await fn({ query: run(client) });
        await client.query("COMMIT");
        return result;
      } catch (err) {
        await client.query("ROLLBACK").catch(() => {});
        throw err;
      } finally {
        client.release();
      }
    },
    close: () => pool.end(),
  };
}

async function createPgliteDb(dataDir) {
  // Computed specifier: keeps the WASM build out of the serverless bundle.
  const specifier = "@electric-sql/pglite";
  const { PGlite } = await import(specifier);

  let location; // undefined => in-memory (tests)
  if (dataDir !== null) {
    location = dataDir ?? path.resolve(here, "../.data/pglite");
    fs.mkdirSync(path.dirname(location), { recursive: true });
  }

  // Single-object form: options are ignored when dataDir is passed positionally as undefined.
  const client = new PGlite({ dataDir: location, parsers: { [OID_DATE]: (v) => v } });
  await client.waitReady;

  const run = (c) => async (text, params = []) => (await c.query(text, params)).rows;

  return {
    kind: "pglite",
    query: run(client),
    tx: (fn) => client.transaction((t) => fn({ query: run(t) })),
    close: () => client.close(),
  };
}
