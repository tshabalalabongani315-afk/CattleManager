import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { buildTestApp, signupAgent, anon, today, daysFromNow } from "./helpers.js";

let ctx;
let agent;

beforeAll(async () => {
  ctx = await buildTestApp();
  ({ agent } = await signupAgent(ctx.app));
});
afterAll(() => ctx.db.close());

describe("stability: bad input never crashes the server", () => {
  const bad = [
    ["movement without type", "/api/movements", { quantity: 1, date: today() }],
    ["movement with unknown type", "/api/movements", { type: "STOLEN", quantity: 1, date: today() }],
    ["negative quantity", "/api/movements", { type: "IN", quantity: -5, date: today() }],
    ["fractional quantity", "/api/movements", { type: "IN", quantity: 1.5, date: today() }],
    ["garbage date", "/api/movements", { type: "IN", quantity: 1, date: "tomorrow" }],
    ["note too long", "/api/movements", { type: "IN", quantity: 1, date: today(), note: "x".repeat(501) }],
    ["negative daily count", "/api/daily-counts", { count: -1 }],
    ["non-numeric daily count", "/api/daily-counts", { count: "lots" }],
    ["cattle without tag", "/api/cattle", { breed: "Nguni" }],
    ["cattle with invalid sex", "/api/cattle", { tag: "Z", breed: "Nguni", sex: "Other" }],
    ["cattle born in the future", "/api/cattle", { tag: "Z", breed: "Nguni", date_of_birth: "2999-01-01" }],
    ["cattle tag too long", "/api/cattle", { tag: "T".repeat(33), breed: "Nguni" }],
    ["weight of zero", "/api/weights", { cattle_id: 1, date: today(), weight_kg: 0 }],
    ["weight of nonsense", "/api/weights", { cattle_id: 1, date: today(), weight_kg: 99999 }],
    ["vaccination due before given", "/api/vaccinations", { cattle_id: 1, vaccine_name: "A", date_given: today(), next_due_date: daysFromNow(-5) }],
    ["body is an array", "/api/cattle", [1, 2, 3]],
  ];

  it.each(bad)("%s -> 400", async (_name, path, body) => {
    const res = await agent.post(path).send(body);
    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });

  it("rejects malformed JSON with 400 instead of crashing", async () => {
    const res = await agent.post("/api/cattle").set("Content-Type", "application/json").send("{not json");
    expect(res.status).toBe(400);
  });

  it("rejects oversized bodies with 413", async () => {
    const res = await agent.post("/api/cattle").send({ tag: "T", breed: "B", pad: "x".repeat(20_000) });
    expect(res.status).toBe(413);
  });

  it("rejects non-integer ids", async () => {
    for (const id of ["abc", "-1", "1.5", "99999999999", "1;DROP TABLE users"]) {
      const res = await agent.get(`/api/cattle/${encodeURIComponent(id)}`);
      expect(res.status, id).toBe(400);
    }
  });

  it("treats SQL metacharacters as plain data", async () => {
    const tag = "'); DROP TABLE cattle;--";
    const created = await agent.post("/api/cattle").send({ tag, breed: "Nguni" }).expect(201);
    expect(created.body.tag).toBe(tag);
    await agent.get("/api/cattle").expect(200);
  });

  it("turns unexpected failures into a generic 500 with no internals", async () => {
    // Break the database underneath the app to force a genuine unexpected error.
    const broken = await buildTestApp();
    const { agent: a } = await signupAgent(broken.app);
    await broken.db.query("ALTER TABLE cattle RENAME TO cattle_gone");
    const spy = console.error;
    console.error = () => {};
    const res = await a.get("/api/cattle");
    console.error = spy;

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Something went wrong. Please try again.");
    expect(JSON.stringify(res.body)).not.toMatch(/relation|cattle_gone|select|stack|\bat \w+/i);

    // The process is still alive and serving requests.
    await request(broken.app).get("/api/health").expect(200);
    await broken.db.close();
  });
});

describe("data integrity", () => {
  it("enforces unique tags per owner with a friendly 409", async () => {
    await agent.post("/api/cattle").send({ tag: "UNIQ-1", breed: "Nguni" }).expect(201);
    const dup = await agent.post("/api/cattle").send({ tag: "UNIQ-1", breed: "Angus" });
    expect(dup.status).toBe(409);
  });

  it("allows the same tag for different owners", async () => {
    const other = await signupAgent(ctx.app);
    await other.agent.post("/api/cattle").send({ tag: "UNIQ-1", breed: "Nguni" }).expect(201);
  });

  it("deleting an animal removes its vaccinations and weights", async () => {
    const { body: animal } = await agent.post("/api/cattle").send({ tag: "CASCADE-1", breed: "Nguni" }).expect(201);
    await agent.post("/api/vaccinations").send({ cattle_id: animal.id, vaccine_name: "A", date_given: today() }).expect(201);
    await agent.post("/api/weights").send({ cattle_id: animal.id, date: today(), weight_kg: 250 }).expect(201);

    await agent.delete(`/api/cattle/${animal.id}`).expect(204);

    const [{ v }] = await ctx.db.query("SELECT count(*)::int AS v FROM vaccinations WHERE cattle_id = $1", [animal.id]);
    const [{ w }] = await ctx.db.query("SELECT count(*)::int AS w FROM weights WHERE cattle_id = $1", [animal.id]);
    expect([v, w]).toEqual([0, 0]);
  });

  it("partial updates keep untouched fields and can clear optional ones", async () => {
    const { body: a } = await agent
      .post("/api/cattle")
      .send({ tag: "PATCH-1", breed: "Nguni", sex: "Male", date_of_birth: "2023-05-01" })
      .expect(201);

    const renamed = await agent.put(`/api/cattle/${a.id}`).send({ status: "Sold" }).expect(200);
    expect(renamed.body).toMatchObject({ tag: "PATCH-1", breed: "Nguni", sex: "Male", status: "Sold" });

    const cleared = await agent.put(`/api/cattle/${a.id}`).send({ sex: "", date_of_birth: null }).expect(200);
    expect(cleared.body.sex).toBeNull();
    expect(cleared.body.date_of_birth).toBeNull();
  });

  it("returns calendar dates as plain YYYY-MM-DD strings (no timezone drift)", async () => {
    const { body: a } = await agent.post("/api/cattle").send({ tag: "DATE-1", breed: "B", date_of_birth: "2024-02-29" }).expect(201);
    expect(a.date_of_birth).toBe("2024-02-29");
    const m = await agent.post("/api/movements").send({ type: "IN", quantity: 1, date: "2025-01-01" }).expect(201);
    expect(m.body.date).toBe("2025-01-01");
  });
});

describe("dashboard", () => {
  it("summarises the herd in a single call", async () => {
    const { agent: fresh } = await signupAgent(ctx.app);
    await fresh.post("/api/cattle").send({ tag: "D1", breed: "Nguni" }).expect(201);
    await fresh.post("/api/cattle").send({ tag: "D2", breed: "Nguni" }).expect(201);
    const { body: sold } = await fresh.post("/api/cattle").send({ tag: "D3", breed: "Angus", status: "Sold" }).expect(201);
    await fresh.post("/api/movements").send({ type: "SOLD", quantity: 2, date: today() }).expect(201);
    await fresh.post("/api/daily-counts").send({ count: 2 }).expect(201);
    await fresh
      .post("/api/vaccinations")
      .send({ cattle_id: sold.id, vaccine_name: "Old", date_given: daysFromNow(-400), next_due_date: daysFromNow(-3) })
      .expect(201);

    const { body } = await fresh.get("/api/dashboard").expect(200);
    expect(body.registered).toBe(3);
    expect(body.active).toBe(2);
    expect(body.breeds).toEqual([{ name: "Nguni", value: 2 }]);
    expect(body.latestCount.count).toBe(2);
    expect(body.monthMovements.SOLD).toBe(2);
    // The sold animal's vaccination is not an actionable alert.
    expect(body.vaccinationsDue).toEqual([]);
  });
});

describe("transport security", () => {
  it("sends hardening headers and hides the framework", async () => {
    const res = await anon(ctx.app).get("/api/health").expect(200);
    expect(res.headers["x-powered-by"]).toBeUndefined();
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["strict-transport-security"]).toMatch(/max-age=\d+/);
    expect(res.headers["content-security-policy"]).toMatch(/default-src 'none'/);
    expect(res.headers["cache-control"]).toBe("no-store");
    expect(res.headers["x-request-id"]).toBeTruthy();
  });

  it("returns JSON 404s with no framework error page", async () => {
    const res = await anon(ctx.app).get("/api/does-not-exist");
    expect(res.status).toBe(401); // unauthenticated callers learn nothing about routes
    const authed = await agent.get("/api/does-not-exist");
    expect(authed.status).toBe(404);
    expect(authed.body).toEqual({ error: "Not found" });
  });

  it("blocks cross-origin writes (CSRF defence in depth)", async () => {
    const evil = await agent.post("/api/cattle").set("Origin", "https://evil.example").send({ tag: "CSRF", breed: "X" });
    expect(evil.status).toBe(403);

    const same = await agent
      .post("/api/cattle")
      .set("Host", "app.example.com")
      .set("Origin", "https://app.example.com")
      .send({ tag: "SAME-ORIGIN", breed: "X" });
    expect(same.status).toBe(201);
  });

  it("does not enable CORS for unknown origins", async () => {
    const res = await anon(ctx.app).get("/api/health").set("Origin", "https://evil.example");
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });
});

describe("configuration safety", () => {
  it("refuses to start in production with a weak or missing JWT secret", async () => {
    const { loadConfig } = await import("../src/config.js");
    expect(() => loadConfig({ NODE_ENV: "production", DATABASE_URL: "postgres://x" })).toThrow(/JWT_SECRET/);
    expect(() => loadConfig({ NODE_ENV: "production", DATABASE_URL: "postgres://x", JWT_SECRET: "short" })).toThrow(/JWT_SECRET/);
    expect(() => loadConfig({ NODE_ENV: "production", JWT_SECRET: "x".repeat(40) })).toThrow(/DATABASE_URL/);
    expect(loadConfig({ NODE_ENV: "production", DATABASE_URL: "postgres://x", JWT_SECRET: "x".repeat(40) }).cookieName).toBe("__Host-cm_session");
  });
});

describe("production cookie hardening", () => {
  it("issues a __Host- prefixed, Secure, HttpOnly, SameSite=Strict cookie in production", async () => {
    const prod = await buildTestApp({ NODE_ENV: "production", DATABASE_URL: "postgres://unused" });
    const res = await anon(prod.app)
      .post("/api/auth/signup")
      .send({ username: "prod-user", password: "correct-horse-battery" });

    expect(res.status).toBe(201);
    const cookie = res.headers["set-cookie"][0];
    expect(cookie).toMatch(/^__Host-cm_session=/);
    expect(cookie).toMatch(/; Secure/i);
    expect(cookie).toMatch(/; HttpOnly/i);
    expect(cookie).toMatch(/; SameSite=Strict/i);
    expect(cookie).toMatch(/; Path=\//);
    expect(cookie).not.toMatch(/Domain=/i);
    await prod.db.close();
  });
});
