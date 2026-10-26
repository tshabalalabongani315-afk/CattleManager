import { Router } from "express";
import { notFound, wrap } from "../http.js";
import {
  validate,
  idParams,
  cattleBody,
  cattleUpdateBody,
  countBody,
  movementBody,
  vaccinationBody,
  weightBody,
  cattleIdQuery,
  requiredCattleIdQuery,
} from "../schemas.js";

// Explicit column lists everywhere: nothing is returned by accident, and
// internal columns (user_id, created_at) never reach the client.
const CATTLE_COLS = "id, tag, breed, sex, date_of_birth, status";
const today = () => new Date().toISOString().slice(0, 10);

/**
 * All farm-data routes. Every query is scoped to req.user.id (directly, or
 * through the owning cattle row), and a resource that exists but belongs to
 * someone else is indistinguishable from one that doesn't exist: always 404.
 */
export function herdRoutes({ db }) {
  const router = Router();

  const ownsCattle = async (cattleId, userId) => {
    const [row] = await db.query("SELECT 1 AS ok FROM cattle WHERE id = $1 AND user_id = $2", [
      cattleId,
      userId,
    ]);
    if (!row) throw notFound();
  };

  /* ---- cattle ---- */

  router.get(
    "/cattle",
    wrap(async (req, res) => {
      res.json(
        await db.query(`SELECT ${CATTLE_COLS} FROM cattle WHERE user_id = $1 ORDER BY tag`, [
          req.user.id,
        ])
      );
    })
  );

  router.get(
    "/cattle/:id",
    validate({ params: idParams }),
    wrap(async (req, res) => {
      const [animal] = await db.query(
        `SELECT ${CATTLE_COLS} FROM cattle WHERE id = $1 AND user_id = $2`,
        [req.params.id, req.user.id]
      );
      if (!animal) throw notFound();
      res.json(animal);
    })
  );

  router.post(
    "/cattle",
    validate({ body: cattleBody }),
    wrap(async (req, res) => {
      const b = req.body;
      const [created] = await db.query(
        `INSERT INTO cattle (user_id, tag, breed, sex, date_of_birth, status)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING ${CATTLE_COLS}`,
        [req.user.id, b.tag, b.breed, b.sex ?? null, b.date_of_birth ?? null, b.status ?? "Active"]
      );
      res.status(201).json(created);
    })
  );

  // Partial update: omitted fields keep their current value; null clears sex / date of birth.
  router.put(
    "/cattle/:id",
    validate({ params: idParams, body: cattleUpdateBody }),
    wrap(async (req, res) => {
      const [current] = await db.query(
        `SELECT ${CATTLE_COLS} FROM cattle WHERE id = $1 AND user_id = $2`,
        [req.params.id, req.user.id]
      );
      if (!current) throw notFound();

      const next = { ...current, ...req.body };
      const [updated] = await db.query(
        `UPDATE cattle SET tag = $1, breed = $2, sex = $3, date_of_birth = $4, status = $5
         WHERE id = $6 AND user_id = $7 RETURNING ${CATTLE_COLS}`,
        [next.tag, next.breed, next.sex ?? null, next.date_of_birth ?? null, next.status, req.params.id, req.user.id]
      );
      res.json(updated);
    })
  );

  router.delete(
    "/cattle/:id",
    validate({ params: idParams }),
    wrap(async (req, res) => {
      // Vaccination and weight history are removed by ON DELETE CASCADE.
      const rows = await db.query("DELETE FROM cattle WHERE id = $1 AND user_id = $2 RETURNING id", [
        req.params.id,
        req.user.id,
      ]);
      if (rows.length === 0) throw notFound();
      res.sendStatus(204);
    })
  );

  /* ---- daily counts ---- */

  router.get(
    "/daily-counts",
    wrap(async (req, res) => {
      res.json(
        await db.query(
          "SELECT id, date, count FROM daily_counts WHERE user_id = $1 ORDER BY date DESC, id DESC",
          [req.user.id]
        )
      );
    })
  );

  router.post(
    "/daily-counts",
    validate({ body: countBody }),
    wrap(async (req, res) => {
      const [created] = await db.query(
        `INSERT INTO daily_counts (user_id, date, count) VALUES ($1, $2, $3)
         RETURNING id, date, count`,
        [req.user.id, req.body.date ?? today(), req.body.count]
      );
      res.status(201).json(created);
    })
  );

  router.delete(
    "/daily-counts/:id",
    validate({ params: idParams }),
    wrap(async (req, res) => {
      const rows = await db.query(
        "DELETE FROM daily_counts WHERE id = $1 AND user_id = $2 RETURNING id",
        [req.params.id, req.user.id]
      );
      if (rows.length === 0) throw notFound();
      res.sendStatus(204);
    })
  );

  /* ---- movements ---- */

  router.get(
    "/movements",
    wrap(async (req, res) => {
      res.json(
        await db.query(
          `SELECT id, type, quantity, note, date FROM movements
           WHERE user_id = $1 ORDER BY date DESC, id DESC`,
          [req.user.id]
        )
      );
    })
  );

  router.post(
    "/movements",
    validate({ body: movementBody }),
    wrap(async (req, res) => {
      const b = req.body;
      const [created] = await db.query(
        `INSERT INTO movements (user_id, type, quantity, note, date) VALUES ($1, $2, $3, $4, $5)
         RETURNING id, type, quantity, note, date`,
        [req.user.id, b.type, b.quantity, b.note ?? null, b.date]
      );
      res.status(201).json(created);
    })
  );

  router.delete(
    "/movements/:id",
    validate({ params: idParams }),
    wrap(async (req, res) => {
      const rows = await db.query(
        "DELETE FROM movements WHERE id = $1 AND user_id = $2 RETURNING id",
        [req.params.id, req.user.id]
      );
      if (rows.length === 0) throw notFound();
      res.sendStatus(204);
    })
  );

  /* ---- vaccinations (owned through their cattle row) ---- */

  router.get(
    "/vaccinations",
    validate({ query: cattleIdQuery }),
    wrap(async (req, res) => {
      const { cattle_id } = req.query;
      const params = [req.user.id];
      let where = "c.user_id = $1";
      if (cattle_id) {
        params.push(cattle_id);
        where += " AND v.cattle_id = $2";
      }
      res.json(
        await db.query(
          `SELECT v.id, v.cattle_id, c.tag AS cattle_tag, v.vaccine_name,
                  v.date_given, v.next_due_date, v.notes
           FROM vaccinations v JOIN cattle c ON c.id = v.cattle_id
           WHERE ${where}
           ORDER BY v.next_due_date ASC NULLS LAST, v.id DESC`,
          params
        )
      );
    })
  );

  router.post(
    "/vaccinations",
    validate({ body: vaccinationBody }),
    wrap(async (req, res) => {
      const b = req.body;
      await ownsCattle(b.cattle_id, req.user.id);
      const [created] = await db.query(
        `INSERT INTO vaccinations (cattle_id, vaccine_name, date_given, next_due_date, notes)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, cattle_id, vaccine_name, date_given, next_due_date, notes`,
        [b.cattle_id, b.vaccine_name, b.date_given, b.next_due_date ?? null, b.notes ?? null]
      );
      res.status(201).json(created);
    })
  );

  router.delete(
    "/vaccinations/:id",
    validate({ params: idParams }),
    wrap(async (req, res) => {
      const rows = await db.query(
        `DELETE FROM vaccinations WHERE id = $1
           AND cattle_id IN (SELECT id FROM cattle WHERE user_id = $2) RETURNING id`,
        [req.params.id, req.user.id]
      );
      if (rows.length === 0) throw notFound();
      res.sendStatus(204);
    })
  );

  /* ---- weights ---- */

  router.get(
    "/weights",
    validate({ query: requiredCattleIdQuery }),
    wrap(async (req, res) => {
      res.json(
        await db.query(
          `SELECT w.id, w.cattle_id, w.date, w.weight_kg
           FROM weights w JOIN cattle c ON c.id = w.cattle_id
           WHERE w.cattle_id = $1 AND c.user_id = $2
           ORDER BY w.date ASC, w.id ASC`,
          [req.query.cattle_id, req.user.id]
        )
      );
    })
  );

  router.post(
    "/weights",
    validate({ body: weightBody }),
    wrap(async (req, res) => {
      const b = req.body;
      await ownsCattle(b.cattle_id, req.user.id);
      const [created] = await db.query(
        `INSERT INTO weights (cattle_id, date, weight_kg) VALUES ($1, $2, $3)
         RETURNING id, cattle_id, date, weight_kg`,
        [b.cattle_id, b.date, b.weight_kg]
      );
      res.status(201).json(created);
    })
  );

  router.delete(
    "/weights/:id",
    validate({ params: idParams }),
    wrap(async (req, res) => {
      const rows = await db.query(
        `DELETE FROM weights WHERE id = $1
           AND cattle_id IN (SELECT id FROM cattle WHERE user_id = $2) RETURNING id`,
        [req.params.id, req.user.id]
      );
      if (rows.length === 0) throw notFound();
      res.sendStatus(204);
    })
  );

  /* ---- dashboard: one round trip instead of four ---- */

  router.get(
    "/dashboard",
    wrap(async (req, res) => {
      const uid = req.user.id;
      const [totals, latest, breeds, monthRows, recent, due] = await Promise.all([
        db.query(
          `SELECT count(*)::int AS registered,
                  count(*) FILTER (WHERE status = 'Active')::int AS active
           FROM cattle WHERE user_id = $1`,
          [uid]
        ),
        db.query(
          `SELECT id, date, count FROM daily_counts WHERE user_id = $1
           ORDER BY date DESC, id DESC LIMIT 1`,
          [uid]
        ),
        db.query(
          `SELECT breed AS name, count(*)::int AS value FROM cattle
           WHERE user_id = $1 AND status = 'Active' GROUP BY breed ORDER BY value DESC, breed`,
          [uid]
        ),
        db.query(
          `SELECT type, COALESCE(sum(quantity), 0)::int AS total FROM movements
           WHERE user_id = $1 AND date >= date_trunc('month', current_date)::date GROUP BY type`,
          [uid]
        ),
        db.query(
          `SELECT id, type, quantity, note, date FROM movements
           WHERE user_id = $1 ORDER BY date DESC, id DESC LIMIT 5`,
          [uid]
        ),
        db.query(
          `SELECT v.id, v.cattle_id, c.tag AS cattle_tag, v.vaccine_name, v.next_due_date
           FROM vaccinations v JOIN cattle c ON c.id = v.cattle_id
           WHERE c.user_id = $1 AND c.status = 'Active'
             AND v.next_due_date IS NOT NULL AND v.next_due_date <= current_date + 14
           ORDER BY v.next_due_date ASC LIMIT 50`,
          [uid]
        ),
      ]);

      const monthMovements = { IN: 0, OUT: 0, SOLD: 0, DIED: 0 };
      for (const r of monthRows) monthMovements[r.type] = r.total;

      res.json({
        registered: totals[0].registered,
        active: totals[0].active,
        latestCount: latest[0] ?? null,
        breeds,
        monthMovements,
        recentMovements: recent,
        vaccinationsDue: due,
      });
    })
  );

  return router;
}
