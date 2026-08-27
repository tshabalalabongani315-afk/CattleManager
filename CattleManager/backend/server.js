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

// Add cattle
app.post("/cattle", async (req, res) => {
  const { tag, breed } = req.body;
  await db.run(
    "INSERT INTO cattle (tag, breed) VALUES (?, ?)",
    [tag, breed]
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

// Update cattle
app.put("/cattle/:id", async (req, res) => {
  const { tag, breed } = req.body;
  const { id } = req.params;

  await db.run(
    "UPDATE cattle SET tag = ?, breed = ? WHERE id = ?",
    [tag, breed, id]
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


