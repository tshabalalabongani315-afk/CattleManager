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

    const cattle = [];
    for (const a of HERD) {
      const [row] = await t.query(
        `INSERT INTO cattle (user_id, tag, breed, sex, date_of_birth, status)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [user.id, a.tag, a.breed, a.sex, a.dob, a.status]
      );
      cattle.push({ ...a, id: row.id });
    }

    const active = cattle.filter((c) => c.status === "Active");
    for (const [i, animal] of active.entries()) {
      // Mostly healthy, with a handful overdue / due soon so the alerts have something to show.
      const [vaccine, intervalDays] = VACCINES[i % VACCINES.length];
      const dueOffset = [210, 95, -9, 140, 60, 8, 260, 175, 110, 75, 230, -3, 120, 190, 12, 85][i % 16];
      await t.query(
        `INSERT INTO vaccinations (cattle_id, vaccine_name, date_given, next_due_date, notes)
         VALUES ($1, $2, $3, $4, $5)`,
        [animal.id, vaccine, addDays(dueOffset - intervalDays), addDays(dueOffset), i % 4 === 0 ? "Batch checked by vet" : null]
      );

      // Four weigh-ins per animal with realistic growth.
      const base = 180 + (i % 6) * 22;
      for (let w = 0; w < 4; w++) {
        await t.query("INSERT INTO weights (cattle_id, date, weight_kg) VALUES ($1, $2, $3)", [
          animal.id,
          addDays(-(90 - w * 30)),
          base + w * (24 + (i % 5)),
        ]);
      }
    }

    const movements = [
      ["IN", 6, "New heifers from Ladybrand auction", -26],
      ["SOLD", 3, "Sold at weekly auction", -19],
      ["OUT", 2, "Moved to northern camp", -12],
      ["DIED", 1, "Snake bite", -8],
      ["IN", 4, "Purchased breeding stock", -3],
    ];
    for (const [type, quantity, note, offset] of movements) {
      await t.query(
        "INSERT INTO movements (user_id, type, quantity, note, date) VALUES ($1, $2, $3, $4, $5)",
        [user.id, type, quantity, note, addDays(offset)]
      );
    }

    const activeCount = active.length;
    const counts = [activeCount + 1, activeCount, activeCount, activeCount - 1, activeCount];
    for (const [i, count] of counts.entries()) {
      await t.query("INSERT INTO daily_counts (user_id, date, count) VALUES ($1, $2, $3)", [
        user.id,
        addDays(-(counts.length - 1 - i) * 2),
        count,
      ]);
    }

    return user;
  });
}
