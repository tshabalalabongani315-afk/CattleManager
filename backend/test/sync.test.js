import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildTestApp, signupAgent, anon, today } from "./helpers.js";

let ctx;
let agent;
let user;

beforeAll(async () => {
  ctx = await buildTestApp();
  ({ agent, user } = await signupAgent(ctx.app));
});
afterAll(() => ctx.db.close());

let keyCounter = 0;
const newKey = () => `key-${Date.now()}-${++keyCounter}-0123456789`;

describe("GET /api/sync/snapshot", () => {
  it("requires a session", async () => {
    await anon(ctx.app).get("/api/sync/snapshot").expect(401);
  });

  it("returns the whole herd in one response, matching the list endpoints", async () => {
    const { agent: a } = await signupAgent(ctx.app, "snap");
    const cow = (await a.post("/api/cattle").send({ tag: "S1", breed: "Nguni", sex: "Female" }).expect(201)).body;
    await a.post("/api/weights").send({ cattle_id: cow.id, date: today(), weight_kg: 310 }).expect(201);
    await a.post("/api/vaccinations").send({ cattle_id: cow.id, vaccine_name: "Anthrax", date_given: today() }).expect(201);
    await a.post("/api/daily-counts").send({ count: 12, date: today() }).expect(201);
    await a.post("/api/movements").send({ type: "IN", quantity: 2, date: today() }).expect(201);

    const snap = (await a.get("/api/sync/snapshot").expect(200)).body;
    expect(Object.keys(snap).sort()).toEqual(["cattle", "dailyCounts", "movements", "vaccinations", "weights"]);
    expect(snap.cattle).toEqual((await a.get("/api/cattle")).body);
    expect(snap.dailyCounts).toEqual((await a.get("/api/daily-counts")).body);
    expect(snap.movements).toEqual((await a.get("/api/movements")).body);
    expect(snap.vaccinations).toEqual((await a.get("/api/vaccinations")).body);
    expect(snap.weights).toEqual((await a.get(`/api/weights?cattle_id=${cow.id}`)).body);
  });

  it("never includes another account's data", async () => {
    const { agent: owner } = await signupAgent(ctx.app, "owner");
    const { agent: other } = await signupAgent(ctx.app, "other");
    const cow = (await owner.post("/api/cattle").send({ tag: "PRIVATE-1", breed: "Bonsmara" }).expect(201)).body;
    await owner.post("/api/weights").send({ cattle_id: cow.id, date: today(), weight_kg: 400 }).expect(201);

    const snap = (await other.get("/api/sync/snapshot").expect(200)).body;
    expect(JSON.stringify(snap)).not.toContain("PRIVATE-1");
    expect(snap.cattle).toEqual([]);
    expect(snap.weights).toEqual([]);
  });
});

describe("Idempotency-Key", () => {
  it("creates a record once and replays the original response for a repeat", async () => {
    const key = newKey();
    const body = { type: "SOLD", quantity: 3, date: today(), note: "Auction" };

    const first = await agent.post("/api/movements").set("Idempotency-Key", key).send(body).expect(201);
    const again = await agent.post("/api/movements").set("Idempotency-Key", key).send(body).expect(201);

    expect(again.body).toEqual(first.body);
    expect(again.headers["idempotent-replay"]).toBe("true");
    expect(first.headers["idempotent-replay"]).toBeUndefined();

    const list = (await agent.get("/api/movements")).body.filter((m) => m.note === "Auction");
    expect(list).toHaveLength(1);
  });

  it("does not affect requests without the header", async () => {
    const body = { count: 7, date: today() };
    await agent.post("/api/daily-counts").send(body).expect(201);
    await agent.post("/api/daily-counts").send(body).expect(201);
  });

  it("keeps keys separate per user", async () => {
    const { agent: other } = await signupAgent(ctx.app, "keys");
    const key = newKey();
    const a = await agent.post("/api/cattle").set("Idempotency-Key", key).send({ tag: "SHARED-KEY-A", breed: "Nguni" }).expect(201);
    const b = await other.post("/api/cattle").set("Idempotency-Key", key).send({ tag: "SHARED-KEY-B", breed: "Nguni" }).expect(201);
    expect(a.body.tag).toBe("SHARED-KEY-A");
    expect(b.body.tag).toBe("SHARED-KEY-B");
  });

  it("rejects a malformed key", async () => {
    for (const key of ["short", "has spaces in it which is not allowed", "x".repeat(65)]) {
      await agent.post("/api/daily-counts").set("Idempotency-Key", key).send({ count: 1 }).expect(400);
    }
  });

  it("releases the key when the request fails, so a corrected retry works", async () => {
    const key = newKey();
    await agent.post("/api/movements").set("Idempotency-Key", key).send({ type: "NOPE", quantity: 1, date: today() }).expect(400);
    await agent.post("/api/movements").set("Idempotency-Key", key).send({ type: "IN", quantity: 1, date: today() }).expect(201);
  });

  it("does not store the response of a failed request (duplicate tag stays a 409)", async () => {
    await agent.post("/api/cattle").send({ tag: "DUP-1", breed: "Nguni" }).expect(201);
    const key = newKey();
    await agent.post("/api/cattle").set("Idempotency-Key", key).send({ tag: "DUP-1", breed: "Nguni" }).expect(409);
    const rows = await ctx.db.query("SELECT 1 FROM idempotency_keys WHERE user_id = $1 AND idem_key = $2", [user.id, key]);
    expect(rows).toHaveLength(0);
  });

  it("creates only one record when the same request arrives twice at once", async () => {
    const key = newKey();
    const send = () =>
      agent.post("/api/movements").set("Idempotency-Key", key).send({ type: "OUT", quantity: 4, date: today(), note: "Concurrent" });
    const results = await Promise.all([send(), send()]);

    // One of them did the work; the other either got the replay or was told to retry.
    expect(results.map((r) => r.status).sort()).toSatisfy((s) => s[0] === 201 && (s[1] === 201 || s[1] === 409));
    const rows = (await agent.get("/api/movements")).body.filter((m) => m.note === "Concurrent");
    expect(rows).toHaveLength(1);
  });

  it("takes over a claim abandoned by a function that died mid-request", async () => {
    const key = newKey();
    await ctx.db.query(
      "INSERT INTO idempotency_keys (user_id, idem_key, status, created_at) VALUES ($1, $2, 0, now() - interval '5 minutes')",
      [user.id, key]
    );
    await agent.post("/api/daily-counts").set("Idempotency-Key", key).send({ count: 9, date: today() }).expect(201);
  });

  it("tells the client to retry while a fresh claim is still in flight", async () => {
    const key = newKey();
    await ctx.db.query("INSERT INTO idempotency_keys (user_id, idem_key, status) VALUES ($1, $2, 0)", [user.id, key]);
    const res = await agent.post("/api/daily-counts").set("Idempotency-Key", key).send({ count: 9, date: today() }).expect(409);
    expect(res.headers["retry-after"]).toBeTruthy();
  });

  it("is removed by the nightly cleanup once old", async () => {
    const key = newKey();
    await ctx.db.query(
      "INSERT INTO idempotency_keys (user_id, idem_key, status, body, created_at) VALUES ($1, $2, 201, '{}', now() - interval '3 days')",
      [user.id, key]
    );
    const res = await anon(ctx.app).get("/api/cron/cleanup").set("Authorization", "Bearer cron-secret-for-tests").expect(200);
    expect(res.body.idempotencyKeysRemoved).toBeGreaterThanOrEqual(1);
    const rows = await ctx.db.query("SELECT 1 FROM idempotency_keys WHERE idem_key = $1", [key]);
    expect(rows).toHaveLength(0);
  });
});
