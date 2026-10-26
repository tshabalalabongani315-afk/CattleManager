import crypto from "node:crypto";

const MIN_SECRET_LENGTH = 32;

/**
 * Reads and validates environment configuration. Fails fast in production so
 * a misconfigured deploy never starts with weak or missing secrets.
 */
export function loadConfig(env = process.env) {
  const isProd = env.NODE_ENV === "production";
  const isTest = env.NODE_ENV === "test";

  let jwtSecret = env.JWT_SECRET;
  if (!jwtSecret || jwtSecret.length < MIN_SECRET_LENGTH) {
    if (isProd) {
      throw new Error(
        `JWT_SECRET must be set to a random string of at least ${MIN_SECRET_LENGTH} characters.`
      );
    }
    if (!isTest) {
      console.warn(
        "[config] JWT_SECRET is missing or too short — using a throwaway secret for this process. " +
          "Sessions will reset on restart. Set a real one in backend/.env."
      );
    }
    jwtSecret = crypto.randomBytes(48).toString("hex");
  }

  if (isProd && !env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set in production.");
  }

  const bcryptRounds = isTest ? 4 : 12;

  return {
    isProd,
    isTest,
    port: Number(env.PORT) || 4000,
    databaseUrl: env.DATABASE_URL || null,
    jwtSecret,
    cronSecret: env.CRON_SECRET || null,
    allowedOrigins: (env.ALLOWED_ORIGINS || "")
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean),
    bcryptRounds,
    // Demo sandboxes live this long before the nightly cron removes them.
    demoTtlHours: 24,
    cookieName: isProd ? "__Host-cm_session" : "cm_session",
    sessionDays: 7,
  };
}
