import { Router } from "express";
import bcrypt from "bcryptjs";
import { HttpError, wrap } from "../http.js";
import { forbidDemo, issueSession, clearSession } from "../auth.js";
import { rateLimit } from "../security.js";
import { validate, changePasswordBody, deleteAccountBody } from "../schemas.js";

export function accountRoutes({ db, config }) {
  const router = Router();
  router.use(forbidDemo);

  // Re-checks the current password so a stolen session can't take over the account.
  async function confirmPassword(userId, password) {
    const [row] = await db.query("SELECT password_hash FROM users WHERE id = $1", [userId]);
    const ok = row && (await bcrypt.compare(password, row.password_hash));
    if (!ok) throw new HttpError(403, "Current password is incorrect");
  }

  const sensitiveLimit = rateLimit(db, {
    name: "account",
    limit: 10,
    windowSeconds: 15 * 60,
    key: (req) => String(req.user.id),
  });

  router.post(
    "/password",
    sensitiveLimit,
    validate({ body: changePasswordBody }),
    wrap(async (req, res) => {
      const { currentPassword, newPassword } = req.body;
      await confirmPassword(req.user.id, currentPassword);

      const passwordHash = await bcrypt.hash(newPassword, config.bcryptRounds);
      // Bumping session_version signs out every other device/session.
      const [user] = await db.query(
        `UPDATE users SET password_hash = $1, session_version = session_version + 1
         WHERE id = $2 RETURNING id, session_version`,
        [passwordHash, req.user.id]
      );
      issueSession(res, config, user);
      res.sendStatus(204);
    })
  );

  router.get(
    "/export",
    wrap(async (req, res) => {
      const uid = req.user.id;
      const [cattle, vaccinations, weights, movements, dailyCounts] = await Promise.all([
        db.query(
          `SELECT id, tag, breed, sex, date_of_birth, status, created_at
           FROM cattle WHERE user_id = $1 ORDER BY id`,
          [uid]
        ),
        db.query(
          `SELECT v.id, v.cattle_id, v.vaccine_name, v.date_given, v.next_due_date, v.notes
           FROM vaccinations v JOIN cattle c ON c.id = v.cattle_id
           WHERE c.user_id = $1 ORDER BY v.id`,
          [uid]
        ),
        db.query(
          `SELECT w.id, w.cattle_id, w.date, w.weight_kg
           FROM weights w JOIN cattle c ON c.id = w.cattle_id
           WHERE c.user_id = $1 ORDER BY w.id`,
          [uid]
        ),
        db.query(
          "SELECT id, type, quantity, note, date FROM movements WHERE user_id = $1 ORDER BY id",
          [uid]
        ),
        db.query("SELECT id, date, count FROM daily_counts WHERE user_id = $1 ORDER BY id", [uid]),
      ]);

      res.setHeader("Content-Disposition", 'attachment; filename="cattle-manager-export.json"');
      res.json({
        exportedAt: new Date().toISOString(),
        account: { username: req.user.username },
        cattle,
        vaccinations,
        weights,
        movements,
        dailyCounts,
      });
    })
  );

  router.delete(
    "/",
    sensitiveLimit,
    validate({ body: deleteAccountBody }),
    wrap(async (req, res) => {
      await confirmPassword(req.user.id, req.body.password);
      // ON DELETE CASCADE removes every owned row.
      await db.query("DELETE FROM users WHERE id = $1", [req.user.id]);
      clearSession(res, config);
      res.sendStatus(204);
    })
  );

  return router;
}
