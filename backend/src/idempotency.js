import { HttpError, wrap } from "./http.js";

// UUIDs from the app; anything URL-safe of a sensible length is accepted.
const KEY_PATTERN = /^[A-Za-z0-9_-]{16,64}$/;
// A claim that never completed (the function died mid-request) can be taken over after this long.
const STALE_CLAIM_SECONDS = 60;

/**
 * Makes POST requests safe to retry. When a request carries an
 * `Idempotency-Key` header, the first request with that key runs normally and
 * its 2xx response is stored; any repeat gets the stored response back
 * (`Idempotent-Replay: true`) without running the handler again. A request
 * that fails (validation, 404, 500...) releases the key so it can be retried.
 *
 * Must run after authentication: keys are scoped to the signed-in user.
 */
export function idempotency(db) {
  return wrap(async (req, res, next) => {
    const key = req.get("Idempotency-Key");
    if (req.method !== "POST" || key === undefined) return next();
    if (!KEY_PATTERN.test(key)) throw new HttpError(400, "Invalid Idempotency-Key");

    const userId = req.user.id;
    const claimed = await db.query(
      `INSERT INTO idempotency_keys (user_id, idem_key) VALUES ($1, $2)
       ON CONFLICT DO NOTHING RETURNING idem_key`,
      [userId, key]
    );

    if (claimed.length === 0) {
      const [row] = await db.query(
        "SELECT status, body FROM idempotency_keys WHERE user_id = $1 AND idem_key = $2",
        [userId, key]
      );
      if (row?.status) {
        res.setHeader("Idempotent-Replay", "true");
        return res.status(row.status).json(row.body);
      }
      // Claimed but unfinished: either still running, or abandoned by a dead function.
      const takenOver = await db.query(
        `UPDATE idempotency_keys SET created_at = now()
         WHERE user_id = $1 AND idem_key = $2 AND status = 0
           AND created_at < now() - make_interval(secs => $3::float8)
         RETURNING idem_key`,
        [userId, key, STALE_CLAIM_SECONDS]
      );
      if (takenOver.length === 0) {
        res.setHeader("Retry-After", "2");
        throw new HttpError(409, "That request is still being processed. Try again in a moment.");
      }
    }

    // Settle the claim *before* the response goes out: a serverless function
    // may be frozen the moment the response ends.
    const send = res.json.bind(res);
    res.json = (body) => {
      const ok = res.statusCode >= 200 && res.statusCode < 300;
      const settle = ok
        ? db.query("UPDATE idempotency_keys SET status = $3, body = $4 WHERE user_id = $1 AND idem_key = $2", [
            userId,
            key,
            res.statusCode,
            JSON.stringify(body ?? null),
          ])
        : db.query("DELETE FROM idempotency_keys WHERE user_id = $1 AND idem_key = $2", [userId, key]);
      settle
        .catch((err) => console.error(`[idempotency] ${req.id} could not settle key`, err))
        .then(() => send(body));
      return res;
    };
    next();
  });
}
