import "dotenv/config";
import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "./db.js";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.warn(
    "WARNING: JWT_SECRET is not set. Copy backend/.env.example to backend/.env and set a real secret."
  );
}

const app = express();
app.use(cors());
app.use(express.json());

/* ---- AUTH (public) ---- */

app.post("/auth/signup", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }

  const existing = await db.get("SELECT id FROM users WHERE username = ?", [username]);
  if (existing) {
    return res.status(409).json({ error: "That username is already taken" });
  }

  // Every account owns its own private herd data — role is descriptive only
  // and is never client-controlled, so it can't be used to claim privileges
  // that don't exist yet.
  const password_hash = await bcrypt.hash(password, 10);
  await db.run(
    "INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)",
    [username, password_hash, "owner"]
  );

  res.sendStatus(201);
});

app.post("/auth/login", async (req, res) => {
  const { username, password } = req.body;

  const user = await db.get("SELECT * FROM users WHERE username = ?", [username]);
  if (!user) return res.status(401).json({ error: "Invalid username or password" });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: "Invalid username or password" });

  const token = jwt.sign(
    { sub: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.json({
    token,
    user: { id: user.id, username: user.username, role: user.role },
  });
});

/* ---- everything below requires a valid login ---- */

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.sendStatus(401);

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.sendStatus(401);
  }
}

app.use(requireAuth);

/* ---- CATTLE REGISTER ----
   Every cattle row belongs to the user who created it (user_id). All routes
   below scope reads/writes to req.user.sub so one account can never see or
   modify another account's herd. */

// Get all cattle
app.get("/cattle", async (req, res) => {
  const cattle = await db.all("SELECT * FROM cattle WHERE user_id = ?", [req.user.sub]);
  res.json(cattle);
});

// Get single cattle
app.get("/cattle/:id", async (req, res) => {
  const animal = await db.get("SELECT * FROM cattle WHERE id = ? AND user_id = ?", [
    req.params.id,
    req.user.sub,
  ]);
  if (!animal) return res.sendStatus(404);
  res.json(animal);
});

// Add cattle
app.post("/cattle", async (req, res) => {
  const { tag, breed, sex, date_of_birth, status } = req.body;
  await db.run(
    "INSERT INTO cattle (tag, breed, sex, date_of_birth, status, user_id) VALUES (?, ?, ?, ?, ?, ?)",
    [tag, breed, sex || null, date_of_birth || null, status || "Active", req.user.sub]
  );
  res.sendStatus(201);
});

// Update cattle (merges with existing record so partial edits don't wipe other fields)
app.put("/cattle/:id", async (req, res) => {
  const { id } = req.params;
  const current = await db.get("SELECT * FROM cattle WHERE id = ? AND user_id = ?", [
    id,
    req.user.sub,
  ]);
  if (!current) return res.sendStatus(404);

  const tag = req.body.tag ?? current.tag;
  const breed = req.body.breed ?? current.breed;
  const sex = req.body.sex ?? current.sex;
  const date_of_birth = req.body.date_of_birth ?? current.date_of_birth;
  const status = req.body.status ?? current.status;

  await db.run(
    "UPDATE cattle SET tag = ?, breed = ?, sex = ?, date_of_birth = ?, status = ? WHERE id = ? AND user_id = ?",
    [tag, breed, sex, date_of_birth, status, id, req.user.sub]
  );

  res.json({ success: true });
});

// Delete cattle
app.delete("/cattle/:id", async (req, res) => {
  const { id } = req.params;

  await db.run("DELETE FROM cattle WHERE id = ? AND user_id = ?", [id, req.user.sub]);
  res.json({ success: true });
});

/* ---- DAILY COUNTS ---- */

// Get counts
app.get("/daily-counts", async (req, res) => {
  const rows = await db.all(
    "SELECT * FROM daily_counts WHERE user_id = ? ORDER BY id DESC",
    [req.user.sub]
  );
  res.json(rows);
});

// Add count
app.post("/daily-counts", async (req, res) => {
  const { count } = req.body;
  const date = new Date().toLocaleDateString();

  await db.run(
    "INSERT INTO daily_counts (date, count, user_id) VALUES (?, ?, ?)",
    [date, count, req.user.sub]
  );
  res.sendStatus(201);
});

// Get all daily movements
app.get("/movements", async (req, res) => {
  const rows = await db.all(
    "SELECT * FROM movements WHERE user_id = ? ORDER BY date DESC",
    [req.user.sub]
  );
  res.json(rows);
});

// Add daily movement
app.post("/movements", async (req, res) => {
  const { type, quantity, note, date } = req.body;

  await db.run(
    "INSERT INTO movements (type, quantity, note, date, user_id) VALUES (?, ?, ?, ?, ?)",
    [type, quantity, note, date, req.user.sub]
  );

  res.json({ success: true });
});

// Delete movement
app.delete("/movements/:id", async (req, res) => {
  await db.run("DELETE FROM movements WHERE id = ? AND user_id = ?", [
    req.params.id,
    req.user.sub,
  ]);
  res.json({ success: true });
});

/* ---- VACCINATIONS ----
   No user_id column here — ownership is transitive through the parent
   cattle row, so every query joins/subqueries against cattle.user_id. */

// Get vaccinations (all, or filtered by cattle_id), joined with tag for display
app.get("/vaccinations", async (req, res) => {
  const { cattle_id } = req.query;

  const rows = cattle_id
    ? await db.all(
        `SELECT vaccinations.*, cattle.tag AS cattle_tag FROM vaccinations
         JOIN cattle ON cattle.id = vaccinations.cattle_id
         WHERE vaccinations.cattle_id = ? AND cattle.user_id = ?
         ORDER BY date_given DESC`,
        [cattle_id, req.user.sub]
      )
    : await db.all(
        `SELECT vaccinations.*, cattle.tag AS cattle_tag FROM vaccinations
         JOIN cattle ON cattle.id = vaccinations.cattle_id
         WHERE cattle.user_id = ?
         ORDER BY next_due_date IS NULL, next_due_date ASC`,
        [req.user.sub]
      );

  res.json(rows);
});

// Add vaccination record
app.post("/vaccinations", async (req, res) => {
  const { cattle_id, vaccine_name, date_given, next_due_date, notes } = req.body;

  const owned = await db.get("SELECT id FROM cattle WHERE id = ? AND user_id = ?", [
    cattle_id,
    req.user.sub,
  ]);
  if (!owned) return res.sendStatus(403);

  await db.run(
    `INSERT INTO vaccinations (cattle_id, vaccine_name, date_given, next_due_date, notes)
     VALUES (?, ?, ?, ?, ?)`,
    [cattle_id, vaccine_name, date_given, next_due_date || null, notes || null]
  );

  res.sendStatus(201);
});

// Delete vaccination record
app.delete("/vaccinations/:id", async (req, res) => {
  await db.run(
    "DELETE FROM vaccinations WHERE id = ? AND cattle_id IN (SELECT id FROM cattle WHERE user_id = ?)",
    [req.params.id, req.user.sub]
  );
  res.json({ success: true });
});

/* ---- WEIGHTS ----
   Same transitive-ownership pattern as vaccinations. */

// Get weight records for an animal
app.get("/weights", async (req, res) => {
  const { cattle_id } = req.query;
  const rows = await db.all(
    `SELECT weights.* FROM weights
     JOIN cattle ON cattle.id = weights.cattle_id
     WHERE weights.cattle_id = ? AND cattle.user_id = ?
     ORDER BY date ASC`,
    [cattle_id, req.user.sub]
  );
  res.json(rows);
});

// Add weight record
app.post("/weights", async (req, res) => {
  const { cattle_id, date, weight_kg } = req.body;

  const owned = await db.get("SELECT id FROM cattle WHERE id = ? AND user_id = ?", [
    cattle_id,
    req.user.sub,
  ]);
  if (!owned) return res.sendStatus(403);

  await db.run(
    "INSERT INTO weights (cattle_id, date, weight_kg) VALUES (?, ?, ?)",
    [cattle_id, date, weight_kg]
  );

  res.sendStatus(201);
});

// Delete weight record
app.delete("/weights/:id", async (req, res) => {
  await db.run(
    "DELETE FROM weights WHERE id = ? AND cattle_id IN (SELECT id FROM cattle WHERE user_id = ?)",
    [req.params.id, req.user.sub]
  );
  res.json({ success: true });
});

app.listen(4000, () =>
  console.log("Backend running on http://localhost:4000")
);
