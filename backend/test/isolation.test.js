import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildTestApp, signupAgent, today } from "./helpers.js";

/**
 * The most important suite in the project: one farmer must never be able to
 * see, change, or even detect another farmer's records.
 */
let ctx;
let alice; // owns the data
let mallory; // tries to reach it
let ids;

beforeAll(async () => {
  ctx = await buildTestApp();
  alice = await signupAgent(ctx.app, "alice");
  mallory = await signupAgent(ctx.app, "mallory");

  const cattle = await alice.agent.post("/api/cattle").send({ tag: "A-001", breed: "Nguni", sex: "Female" }).expect(201);
  const cattleId = cattle.body.id;
  const vacc = await alice.agent
    .post("/api/vaccinations")
    .send({ cattle_id: cattleId, vaccine_name: "Anthrax", date_given: today() })
    .expect(201);
  const weight = await alice.agent
    .post("/api/weights")
    .send({ cattle_id: cattleId, date: today(), weight_kg: 320 })
    .expect(201);
  const move = await alice.agent
    .post("/api/movements")
    .send({ type: "IN", quantity: 3, note: "secret-note", date: today() })
    .expect(201);
  const count = await alice.agent.post("/api/daily-counts").send({ count: 42 }).expect(201);

  ids = { cattle: cattleId, vacc: vacc.body.id, weight: weight.body.id, move: move.body.id, count: count.body.id };
});
afterAll(() => ctx.db.close());

describe("reads", () => {
  it("never lists another user's records", async () => {
    for (const path of ["/api/cattle", "/api/movements", "/api/daily-counts", "/api/vaccinations"]) {
      const res = await mallory.agent.get(path).expect(200);
      expect(res.body, path).toEqual([]);
    }
    const dash = await mallory.agent.get("/api/dashboard").expect(200);
    expect(dash.body).toMatchObject({ registered: 0, latestCount: null, recentMovements: [], vaccinationsDue: [] });
  });

  it("answers 404 (not 403) for someone else's animal, indistinguishable from a missing one", async () => {
    const theirs = await mallory.agent.get(`/api/cattle/${ids.cattle}`);
    const missing = await mallory.agent.get("/api/cattle/999999");
    expect(theirs.status).toBe(404);
    expect(theirs.body).toEqual(missing.body);
  });

  it("returns no weight or vaccination history for someone else's animal", async () => {
    expect((await mallory.agent.get(`/api/weights?cattle_id=${ids.cattle}`).expect(200)).body).toEqual([]);
    expect((await mallory.agent.get(`/api/vaccinations?cattle_id=${ids.cattle}`).expect(200)).body).toEqual([]);
  });

  it("doesn't leak internal columns", async () => {
    const res = await alice.agent.get("/api/cattle").expect(200);
    expect(Object.keys(res.body[0]).sort()).toEqual(["breed", "date_of_birth", "id", "sex", "status", "tag"]);
    const dash = await alice.agent.get("/api/dashboard").expect(200);
    expect(JSON.stringify(dash.body)).not.toContain("user_id");
  });
});

describe("writes", () => {
  it("cannot edit or delete another user's animal", async () => {
    await mallory.agent.put(`/api/cattle/${ids.cattle}`).send({ tag: "HACKED" }).expect(404);
    await mallory.agent.delete(`/api/cattle/${ids.cattle}`).expect(404);
  });

  it("cannot attach vaccinations or weights to another user's animal", async () => {
    await mallory.agent
      .post("/api/vaccinations")
      .send({ cattle_id: ids.cattle, vaccine_name: "Fake", date_given: today() })
      .expect(404);
    await mallory.agent
      .post("/api/weights")
      .send({ cattle_id: ids.cattle, date: today(), weight_kg: 1 })
      .expect(404);
  });

  it("cannot delete another user's child records", async () => {
    await mallory.agent.delete(`/api/vaccinations/${ids.vacc}`).expect(404);
    await mallory.agent.delete(`/api/weights/${ids.weight}`).expect(404);
    await mallory.agent.delete(`/api/movements/${ids.move}`).expect(404);
    await mallory.agent.delete(`/api/daily-counts/${ids.count}`).expect(404);
  });

  it("ignores a user_id smuggled into the body", async () => {
    const res = await mallory.agent
      .post("/api/cattle")
      .send({ tag: "M-1", breed: "Angus", user_id: alice.user.id })
      .expect(201);
    const aliceList = await alice.agent.get("/api/cattle").expect(200);
    expect(aliceList.body.some((c) => c.id === res.body.id)).toBe(false);
  });

  it("leaves the owner's data completely untouched after all attacks", async () => {
    const cattle = await alice.agent.get(`/api/cattle/${ids.cattle}`).expect(200);
    expect(cattle.body.tag).toBe("A-001");
    expect((await alice.agent.get(`/api/weights?cattle_id=${ids.cattle}`)).body).toHaveLength(1);
    expect((await alice.agent.get("/api/vaccinations")).body).toHaveLength(1);
    expect((await alice.agent.get("/api/movements")).body).toHaveLength(1);
    expect((await alice.agent.get("/api/daily-counts")).body).toHaveLength(1);
  });
});

describe("data export", () => {
  it("only contains the requester's own data", async () => {
    const mine = await alice.agent.get("/api/account/export").expect(200);
    expect(mine.body.cattle).toHaveLength(1);
    expect(mine.body.movements[0].note).toBe("secret-note");

    const theirs = await mallory.agent.get("/api/account/export").expect(200);
    expect(JSON.stringify(theirs.body)).not.toContain("secret-note");
    expect(JSON.stringify(theirs.body)).not.toContain("A-001");
  });
});
