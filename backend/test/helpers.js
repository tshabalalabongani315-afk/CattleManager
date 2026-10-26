import request from "supertest";
import { createApp } from "../src/app.js";
import { createDb } from "../src/db.js";
import { loadConfig } from "../src/config.js";

export const PASSWORD = "correct-horse-battery";

/** A fresh app on its own in-memory Postgres (PGlite) — fully isolated per test file. */
export async function buildTestApp(envOverrides = {}) {
  const config = loadConfig({
    NODE_ENV: "test",
    JWT_SECRET: "test-secret-test-secret-test-secret-1234",
    CRON_SECRET: "cron-secret-for-tests",
    ...envOverrides,
  });
  const db = await createDb({ dataDir: null });
  const app = await createApp({ config, db });
  return { app, db, config };
}

let counter = 0;
let ipCounter = 0;

/** supertest agent (keeps cookies) with its own client IP. */
export function newAgent(app) {
  return request.agent(app).set("x-forwarded-for", `10.0.${Math.floor(++ipCounter / 250)}.${ipCounter % 250}`);
}

/** One-off anonymous request from a fresh client IP. */
export const anon = (app) => {
  const ip = `10.1.${Math.floor(++ipCounter / 250)}.${ipCounter % 250}`;
  const wrap = (method) => (url) => request(app)[method](url).set("x-forwarded-for", ip);
  return { get: wrap("get"), post: wrap("post"), put: wrap("put"), delete: wrap("delete") };
};

/** Signs up a new user and returns a supertest agent that carries their session cookie. */
export async function signupAgent(app, name = "farmer") {
  const username = `${name}${++counter}`;
  const agent = newAgent(app);
  const res = await agent.post("/api/auth/signup").send({ username, password: PASSWORD });
  if (res.status !== 201) throw new Error(`signup failed: ${res.status} ${JSON.stringify(res.body)}`);
  return { agent, username, user: res.body.user };
}

export const today = () => new Date().toISOString().slice(0, 10);
export const daysFromNow = (n) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
