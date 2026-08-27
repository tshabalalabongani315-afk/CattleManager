import sqlite3 from "sqlite3";
import { open } from "sqlite";

const db = await open({
  filename: "./farm.db",
  driver: sqlite3.Database,
});

await db.exec(`
  CREATE TABLE IF NOT EXISTS cattle (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tag TEXT,
    breed TEXT
  );

  CREATE TABLE IF NOT EXISTS daily_counts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT,
    count INTEGER
  );
`);

const cattleColumns = (await db.all("PRAGMA table_info(cattle)")).map((c) => c.name);
if (!cattleColumns.includes("sex")) {
  await db.exec("ALTER TABLE cattle ADD COLUMN sex TEXT");
}
if (!cattleColumns.includes("date_of_birth")) {
  await db.exec("ALTER TABLE cattle ADD COLUMN date_of_birth TEXT");
}
if (!cattleColumns.includes("status")) {
  await db.exec("ALTER TABLE cattle ADD COLUMN status TEXT DEFAULT 'Active'");
}

await db.exec(`
  CREATE TABLE IF NOT EXISTS movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    note TEXT,
    date TEXT NOT NULL
  )
`);

await db.exec(`
  CREATE TABLE IF NOT EXISTS vaccinations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cattle_id INTEGER NOT NULL,
    vaccine_name TEXT NOT NULL,
    date_given TEXT NOT NULL,
    next_due_date TEXT,
    notes TEXT,
    FOREIGN KEY (cattle_id) REFERENCES cattle(id)
  )
`);

await db.exec(`
  CREATE TABLE IF NOT EXISTS weights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cattle_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    weight_kg REAL NOT NULL,
    FOREIGN KEY (cattle_id) REFERENCES cattle(id)
  )
`);

export default db;
