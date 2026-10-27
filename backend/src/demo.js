import crypto from "node:crypto";
import bcrypt from "bcryptjs";

const addDays = (n) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

const BREEDS = ["Nguni", "Bonsmara", "Brahman", "Angus"];
const VACCINES = [
  ["Anthrax", 365],
  ["Brucellosis", 365],
  ["Lumpy Skin Disease", 365],
  ["Foot-and-Mouth", 180],
];

// Deterministic-looking but varied sample herd (no randomness needed for tests).
const HERD = Array.from({ length: 24 }, (_, i) => ({
  tag: `ZA-${String(100 + i)}`,
  breed: BREEDS[i % BREEDS.length],
  sex: i % 3 === 0 ? "Male" : "Female",
  dob: addDays(-(240 + i * 53)),
  status: i === 21 ? "Sold" : i === 22 ? "Deceased" : "Active",
}));

/**
 * Creates an isolated, expiring sandbox account pre-filled with a realistic
 * herd. Every demo visitor gets their own, so nobody sees anyone else's data.
 */
export async function createDemoAccount(db, config) {
  const username = `demo-${crypto.randomBytes(4).toString("hex")}`;
  // Nobody ever signs in with this password; the account is reached via /auth/demo only.
  const passwordHash = await bcrypt.hash(crypto.randomBytes(24).toString("hex"), config.bcryptRounds);

  return db.tx(async (t) => {
    const [user] = await t.query(
      `INSERT INTO users (username, password_hash, is_demo, expires_at)
       VALUES ($1, $2, TRUE, now() + make_interval(hours => $3::int))
       RETURNING id, username, role, is_demo, expires_at, session_version`,
      [username, passwordHash, config.demoTtlHours]
    );

    // Each table is seeded with ONE multi-row insert. Row-at-a-time inserts meant
    // ~150 network round trips to the database, which timed out on serverless.
    const cattleRows = await t.query(
      ...multiInsert(
        "cattle",
        ["user_id", "tag", "breed", "sex", "date_of_birth", "status"],
        HERD.map((a) => [user.id, a.tag, a.breed, a.sex, a.dob, a.status]),
        "id"
      )
    );
    const cattle = HERD.map((a, i) => ({ ...a, id: cattleRows[i].id }));
    const active = cattle.filter((c) => c.status === "Active");

    const vaccinations = [];
    const weights = [];
    for (const [i, animal] of active.entries()) {
      // Mostly healthy, with a handful overdue / due soon so the alerts have something to show.
      const [vaccine, intervalDays] = VACCINES[i % VACCINES.length];
      const dueOffset = [210, 95, -9, 140, 60, 8, 260, 175, 110, 75, 230, -3, 120, 190, 12, 85][i % 16];
      vaccinations.push([
        animal.id,
        vaccine,
        addDays(dueOffset - intervalDays),
        addDays(dueOffset),
        i % 4 === 0 ? "Batch checked by vet" : null,
      ]);

      // Four weigh-ins per animal with realistic growth.
      const base = 180 + (i % 6) * 22;
      for (let w = 0; w < 4; w++) {
        weights.push([animal.id, addDays(-(90 - w * 30)), base + w * (24 + (i % 5))]);
      }
    }
    await t.query(
      ...multiInsert("vaccinations", ["cattle_id", "vaccine_name", "date_given", "next_due_date", "notes"], vaccinations)
    );
    await t.query(...multiInsert("weights", ["cattle_id", "date", "weight_kg"], weights));

    const movements = [
      ["IN", 6, "New heifers from Ladybrand auction", -26],
      ["SOLD", 3, "Sold at weekly auction", -19],
      ["OUT", 2, "Moved to northern camp", -12],
      ["DIED", 1, "Snake bite", -8],
      ["IN", 4, "Purchased breeding stock", -3],
    ].map(([type, quantity, note, offset]) => [user.id, type, quantity, note, addDays(offset)]);
    await t.query(...multiInsert("movements", ["user_id", "type", "quantity", "note", "date"], movements));

    const activeCount = active.length;
    const counts = [activeCount + 1, activeCount, activeCount, activeCount - 1, activeCount].map((count, i, all) => [
      user.id,
      addDays(-(all.length - 1 - i) * 2),
      count,
    ]);
    await t.query(...multiInsert("daily_counts", ["user_id", "date", "count"], counts));

    return user;
  });
}

/** Builds `INSERT ... VALUES (...), (...)` plus its parameter list for a multi-row insert. */
function multiInsert(table, columns, rows, returning) {
  const params = [];
  const tuples = rows.map(
    (row) =>
      `(${row
        .map((value) => {
          params.push(value);
          return `$${params.length}`;
        })
        .join(", ")})`
  );
  const sql = `INSERT INTO ${table} (${columns.join(", ")}) VALUES ${tuples.join(", ")}${
    returning ? ` RETURNING ${returning}` : ""
  }`;
  return [sql, params];
}
