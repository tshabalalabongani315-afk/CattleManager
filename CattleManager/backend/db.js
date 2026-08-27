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

await db.exec(`
  CREATE TABLE IF NOT EXISTS movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    note TEXT,
    date TEXT NOT NULL
  )
`);


export default db;
