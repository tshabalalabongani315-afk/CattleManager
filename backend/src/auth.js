import jwt from "jsonwebtoken";
import { HttpError, wrap } from "./http.js";

const ISSUER = "cattle-manager";
const AUDIENCE = "cattle-manager-web";

export function cookieOptions(config) {
  return {
    httpOnly: true,
    secure: config.isProd,
    sameSite: "strict",
    path: "/",
    maxAge: config.sessionDays * 24 * 60 * 60 * 1000,
  };
}

export function issueSession(res, config, user) {
  const token = jwt.sign({ sub: String(user.id), sv: user.session_version }, config.jwtSecret, {
    algorithm: "HS256",
    expiresIn: `${config.sessionDays}d`,
    issuer: ISSUER,
    audience: AUDIENCE,
  });
  res.cookie(config.cookieName, token, cookieOptions(config));
}

export function clearSession(res, config) {
  const { maxAge: _ignored, ...opts } = cookieOptions(config);
  res.clearCookie(config.cookieName, opts);
}

/** The only user fields ever returned to the browser. */
export const publicUser = (u) => ({
  id: u.id,
  username: u.username,
  role: u.role,
  isDemo: u.is_demo,
  expiresAt: u.expires_at ?? null,
});

/**
 * Verifies the session cookie, then re-reads the user so deleted accounts,
 * expired demo sandboxes, and tokens issued before a password change are
 * rejected immediately instead of living out their JWT lifetime.
 */
async function sessionUser(db, config, req) {
  const token = req.cookies?.[config.cookieName];
  if (!token) return null;

  let claims;
  try {
    claims = jwt.verify(token, config.jwtSecret, {
      algorithms: ["HS256"],
      issuer: ISSUER,
      audience: AUDIENCE,
    });
  } catch {
    return null;
  }

  const [user] = await db.query(
    `SELECT id, username, role, is_demo, expires_at, session_version
     FROM users WHERE id = $1`,
    [Number(claims.sub)]
  );

  const expired = user?.expires_at && new Date(user.expires_at) <= new Date();
  if (!user || expired || user.session_version !== claims.sv) return null;
  return user;
}

export function requireAuth(db, config) {
  return wrap(async (req, _res, next) => {
    const user = await sessionUser(db, config, req);
    if (!user) throw new HttpError(401, "Please sign in");
    req.user = user;
    next();
  });
}

/** Like requireAuth but anonymous visitors get `req.user = null` instead of an error. */
export function optionalAuth(db, config) {
  return wrap(async (req, _res, next) => {
    req.user = await sessionUser(db, config, req);
    next();
  });
}

/** Blocks account-level actions for throwaway demo sandboxes. */
export function forbidDemo(req, _res, next) {
  if (req.user?.is_demo) {
    return next(new HttpError(403, "That isn't available in the demo account"));
  }
  next();
}
