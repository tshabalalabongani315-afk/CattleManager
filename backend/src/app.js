import crypto from "node:crypto";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";

import { loadConfig } from "./config.js";
import { createDb } from "./db.js";
import { migrate } from "./migrate.js";
import { HttpError, errorHandler, notFound, requestId, wrap } from "./http.js";
import { originGuard } from "./security.js";
import { requireAuth } from "./auth.js";
import { authRoutes } from "./routes/auth.js";
import { accountRoutes } from "./routes/account.js";
import { herdRoutes } from "./routes/herd.js";

/**
 * Builds the Express app. Kept free of `listen()` so the same app runs under
 * `node server.js` locally, inside a Vercel serverless function, and in tests.
 */
export async function createApp({ config = loadConfig(), db } = {}) {
  db ??= await createDb({ databaseUrl: config.databaseUrl });

  // Local/test databases (PGlite) migrate themselves; production runs
  // `npm run migrate` as part of the deploy build.
  if (db.kind === "pglite") await migrate(db);

  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  app.use(requestId);
  app.use(
    helmet({
      // This service only returns JSON; lock everything else down.
      contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
      crossOriginResourcePolicy: { policy: "same-origin" },
      strictTransportSecurity: { maxAge: 63072000, includeSubDomains: true, preload: true },
    })
  );
  // Same-origin in production (the SPA and API share a domain), so CORS is
  // only enabled for explicitly listed origins (e.g. a separate dev host).
  app.use(
    cors({
      origin: config.allowedOrigins.length ? config.allowedOrigins : false,
      credentials: true,
    })
  );
  app.use(express.json({ limit: "10kb" }));
  app.use(cookieParser());
  // Never let a browser or CDN cache API responses (they're per-user).
  app.use((_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });
  app.use(originGuard(config));

  const api = express.Router();

  api.get("/health", wrap(async (_req, res) => {
    await db.query("SELECT 1");
    res.json({ status: "ok" });
  }));

  api.use("/auth", authRoutes({ db, config }));

  // Scheduled cleanup (Vercel Cron sends `Authorization: Bearer $CRON_SECRET`).
  api.get(
    "/cron/cleanup",
    wrap(async (req, res) => {
      const expected = config.cronSecret ? `Bearer ${config.cronSecret}` : null;
      const given = req.headers.authorization || "";
      const ok =
        expected &&
        given.length === expected.length &&
        crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected));
      if (!ok) throw new HttpError(401, "Unauthorized");

      const demos = await db.query(
        "DELETE FROM users WHERE is_demo AND expires_at <= now() RETURNING id"
      );
      const limits = await db.query(
        "DELETE FROM rate_limits WHERE window_start < now() - interval '1 day' RETURNING key"
      );
      res.json({ expiredDemoAccountsRemoved: demos.length, rateLimitRowsRemoved: limits.length });
    })
  );

  // Everything below needs a valid session.
  api.use(requireAuth(db, config));
  api.use("/account", accountRoutes({ db, config }));
  api.use(herdRoutes({ db }));

  api.use((_req, _res, next) => next(notFound()));

  app.use("/api", api);
  app.use((_req, _res, next) => next(notFound()));
  app.use(errorHandler);

  app.locals.db = db;
  app.locals.config = config;
  return app;
}
