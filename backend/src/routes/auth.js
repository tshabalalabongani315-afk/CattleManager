import { Router } from "express";
import bcrypt from "bcryptjs";
import { HttpError, wrap } from "../http.js";
import { issueSession, clearSession, publicUser, optionalAuth } from "../auth.js";
import { rateLimit, clientIp } from "../security.js";
import { validate, signupBody, loginBody } from "../schemas.js";
import { createDemoAccount } from "../demo.js";

export function authRoutes({ db, config }) {
  const router = Router();

  // Compared against when a username doesn't exist, so "unknown user" and
  // "wrong password" take the same time and can't be told apart by timing.
  const dummyHash = bcrypt.hashSync("not-a-real-password", config.bcryptRounds);

  const ipLimit = (name, limit, windowSeconds) => rateLimit(db, { name, limit, windowSeconds });

  router.post(
    "/signup",
    ipLimit("signup", 10, 60 * 60),
    validate({ body: signupBody }),
    wrap(async (req, res) => {
      const { username, password } = req.body;
      const passwordHash = await bcrypt.hash(password, config.bcryptRounds);

      let user;
      try {
        [user] = await db.query(
          `INSERT INTO users (username, password_hash) VALUES ($1, $2)
           RETURNING id, username, role, is_demo, expires_at, session_version`,
          [username, passwordHash]
        );
      } catch (err) {
        if (err.code === "23505") throw new HttpError(409, "That username is already taken");
        throw err;
      }

      issueSession(res, config, user);
      res.status(201).json({ user: publicUser(user) });
    })
  );

  router.post(
    "/login",
    ipLimit("login-ip", 20, 15 * 60),
    // Per-username limit stops a distributed guess against one account.
    rateLimit(db, {
      name: "login-user",
      limit: 8,
      windowSeconds: 15 * 60,
      key: (req) => String(req.body?.username ?? "").trim().toLowerCase().slice(0, 64) || clientIp(req),
    }),
    validate({ body: loginBody }),
    wrap(async (req, res) => {
      const { username, password } = req.body;
      const [user] = await db.query(
        `SELECT id, username, role, is_demo, expires_at, session_version, password_hash
         FROM users WHERE username = $1`,
        [username]
      );

      const valid = await bcrypt.compare(password, user?.password_hash ?? dummyHash);
      if (!user || !valid || user.is_demo) {
        throw new HttpError(401, "Invalid username or password");
      }

      issueSession(res, config, user);
      res.json({ user: publicUser(user) });
    })
  );

  router.post(
    "/demo",
    ipLimit("demo", 6, 60 * 60),
    wrap(async (req, res) => {
      const user = await createDemoAccount(db, config);
      issueSession(res, config, user);
      res.status(201).json({ user: publicUser(user) });
    })
  );

  router.post("/logout", (req, res) => {
    clearSession(res, config);
    res.sendStatus(204);
  });

  // Always 200: "nobody is signed in" is a normal answer, not an error, so
  // anonymous visitors don't get a red 401 in their browser console.
  router.get("/me", optionalAuth(db, config), (req, res) => {
    res.json({ user: req.user ? publicUser(req.user) : null });
  });

  return router;
}
