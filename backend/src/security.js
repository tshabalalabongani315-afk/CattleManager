import { HttpError, wrap } from "./http.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * CSRF defence in depth on top of SameSite=Strict cookies: a browser always
 * sends Origin on cross-site writes, so if it is present it must be ours.
 * Non-browser clients (curl, tests) send no Origin and are unaffected — they
 * still need a valid session cookie.
 */
export function originGuard(config) {
  return (req, _res, next) => {
    if (SAFE_METHODS.has(req.method)) return next();

    const origin = req.headers.origin;
    if (!origin) return next();

    try {
      const ok =
        config.allowedOrigins.includes(origin) || new URL(origin).host === req.headers.host;
      if (ok) return next();
    } catch {
      /* fall through */
    }
    next(new HttpError(403, "Cross-origin request blocked"));
  };
}

/**
 * Postgres-backed fixed-window rate limiter. State lives in the database so
 * it holds across serverless instances and cold starts.
 */
export function rateLimit(db, { name, limit, windowSeconds, key }) {
  return wrap(async (req, res, next) => {
    const id = key ? key(req) : clientIp(req);
    const [row] = await db.query(
      `INSERT INTO rate_limits (key, window_start, count)
       VALUES ($1, now(), 1)
       ON CONFLICT (key) DO UPDATE SET
         count = CASE WHEN rate_limits.window_start < now() - make_interval(secs => $2::float8)
                      THEN 1 ELSE rate_limits.count + 1 END,
         window_start = CASE WHEN rate_limits.window_start < now() - make_interval(secs => $2::float8)
                             THEN now() ELSE rate_limits.window_start END
       RETURNING count, EXTRACT(EPOCH FROM (window_start + make_interval(secs => $2::float8) - now()))::int AS retry_after`,
      [`${name}:${id}`, windowSeconds]
    );

    if (row.count > limit) {
      res.setHeader("Retry-After", String(Math.max(1, row.retry_after)));
      throw new HttpError(429, "Too many attempts. Please wait a bit and try again.");
    }
    next();
  });
}

/**
 * The client address as seen by the platform's proxy. `trust proxy` is 1, so
 * Express reads the entry the Vercel edge appended to X-Forwarded-For (Vercel
 * overwrites any client-supplied value). If you host this behind something
 * else, make sure that proxy sets X-Forwarded-For itself.
 */
export function clientIp(req) {
  return req.ip || "unknown";
}
