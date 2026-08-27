import express from "express";
import cors from "cors";
import db from "./db.js";

const app = express();
app.use(cors());
app.use(express.json());

/* ---- CATTLE REGISTER ---- */

// Get all cattle
app.get("/cattle", async (req, res) => {
  const cattle = await db.all("SELECT * FROM cattle");
  res.json(cattle);
});

// Get single cattle
app.get("/cattle/:id", async (req, res) => {
  const animal = await db.get("SELECT * FROM cattle WHERE id = ?", [req.params.id]);
  if (!animal) return res.sendStatus(404);
  res.json(animal);
});

// Add cattle
app.post("/cattle", async (req, res) => {
  const { tag, breed, sex, date_of_birth, status } = req.body;
  await db.run(
    "INSERT INTO cattle (tag, breed, sex, date_of_birth, status) VALUES (?, ?, ?, ?, ?)",
    [tag, breed, sex || null, date_of_birth || null, status || "Active"]
  );
  res.sendStatus(201);
});

/* ---- DAILY COUNTS ---- */

// Get counts
app.get("/daily-counts", async (req, res) => {
  const rows = await db.all(
    "SELECT * FROM daily_counts ORDER BY id DESC"
  );
  res.json(rows);
});

// Add count
app.post("/daily-counts", async (req, res) => {
  const { count } = req.body;
  const date = new Date().toLocaleDateString();

  await db.run(
    "INSERT INTO daily_counts (date, count) VALUES (?, ?)",
    [date, count]
  );
  res.sendStatus(201);
});

app.listen(4000, () =>
  console.log("Backend running on http://localhost:4000")
);

// Update cattle (merges with existing record so partial edits don't wipe other fields)
app.put("/cattle/:id", async (req, res) => {
  const { id } = req.params;
  const current = await db.get("SELECT * FROM cattle WHERE id = ?", [id]);
  if (!current) return res.sendStatus(404);

  const tag = req.body.tag ?? current.tag;
  const breed = req.body.breed ?? current.breed;
  const sex = req.body.sex ?? current.sex;
  const date_of_birth = req.body.date_of_birth ?? current.date_of_birth;
  const status = req.body.status ?? current.status;

  await db.run(
    "UPDATE cattle SET tag = ?, breed = ?, sex = ?, date_of_birth = ?, status = ? WHERE id = ?",
    [tag, breed, sex, date_of_birth, status, id]
  );

  res.json({ success: true });
});

// Delete cattle
app.delete("/cattle/:id", async (req, res) => {
  const { id } = req.params;

  await db.run("DELETE FROM cattle WHERE id = ?", [id]);
  res.json({ success: true });
});

// Get all daily movements
app.get("/movements", async (req, res) => {
  const rows = await db.all(
    "SELECT * FROM movements ORDER BY date DESC"
  );
  res.json(rows);
});

// Add daily movement
app.post("/movements", async (req, res) => {
  const { type, quantity, note, date } = req.body;

  await db.run(
    "INSERT INTO movements (type, quantity, note, date) VALUES (?, ?, ?, ?)",
    [type, quantity, note, date]
  );

  res.json({ success: true });
});

// Delete movement
app.delete("/movements/:id", async (req, res) => {
  await db.run("DELETE FROM movements WHERE id = ?", [req.params.id]);
  res.json({ success: true });
});

/* ---- VACCINATIONS ---- */

// Get vaccinations (all, or filtered by cattle_id), joined with tag for display
app.get("/vaccinations", async (req, res) => {
  const { cattle_id } = req.query;

  const rows = cattle_id
    ? await db.all(
        `SELECT vaccinations.*, cattle.tag AS cattle_tag FROM vaccinations
         JOIN cattle ON cattle.id = vaccinations.cattle_id
         WHERE vaccinations.cattle_id = ?
         ORDER BY date_given DESC`,
        [cattle_id]
      )
    : await db.all(
        `SELECT vaccinations.*, cattle.tag AS cattle_tag FROM vaccinations
         JOIN cattle ON cattle.id = vaccinations.cattle_id
         ORDER BY next_due_date IS NULL, next_due_date ASC`
      );

  res.json(rows);
});

// Add vaccination record
app.post("/vaccinations", async (req, res) => {
  const { cattle_id, vaccine_name, date_given, next_due_date, notes } = req.body;

  await db.run(
    `INSERT INTO vaccinations (cattle_id, vaccine_name, date_given, next_due_date, notes)
     VALUES (?, ?, ?, ?, ?)`,
    [cattle_id, vaccine_name, date_given, next_due_date || null, notes || null]
  );

  res.sendStatus(201);
});

// Delete vaccination record
app.delete("/vaccinations/:id", async (req, res) => {
  await db.run("DELETE FROM vaccinations WHERE id = ?", [req.params.id]);
  res.json({ success: true });
});

/* ---- WEIGHTS ---- */

// Get weight records for an animal
app.get("/weights", async (req, res) => {
  const { cattle_id } = req.query;
  const rows = await db.all(
    "SELECT * FROM weights WHERE cattle_id = ? ORDER BY date ASC",
    [cattle_id]
  );
  res.json(rows);
});

// Add weight record
app.post("/weights", async (req, res) => {
  const { cattle_id, date, weight_kg } = req.body;

  await db.run(
    "INSERT INTO weights (cattle_id, date, weight_kg) VALUES (?, ?, ?)",
    [cattle_id, date, weight_kg]
  );

  res.sendStatus(201);
});

// Delete weight record
app.delete("/weights/:id", async (req, res) => {
  await db.run("DELETE FROM weights WHERE id = ?", [req.params.id]);
  res.json({ success: true });
});


