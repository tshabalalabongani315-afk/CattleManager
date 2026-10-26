import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { buildTestApp, signupAgent, newAgent, anon, PASSWORD } from "./helpers.js";

let ctx;
beforeAll(async () => {
  ctx = await buildTestApp();
});
afterAll(() => ctx.db.close());

describe("signup", () => {
  it("creates an account, signs in, and never returns the password hash", async () => {
    const res = await anon(ctx.app)
      .post("/api/auth/signup")
      .send({ username: "  Alice  ", password: PASSWORD });

    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ username: "alice", role: "owner", isDemo: false });
    expect(JSON.stringify(res.body)).not.toMatch(/hash|password/i);
  });

  it("sets an HttpOnly, SameSite=Strict session cookie and no token in the body", async () => {
    const res = await anon(ctx.app)
      .post("/api/auth/signup")
      .send({ username: "cookie-user", password: PASSWORD });

    const cookie = res.headers["set-cookie"].find((c) => c.startsWith("cm_session="));
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Strict/i);
    expect(cookie).toMatch(/Path=\//);
    expect(res.body.token).toBeUndefined();
  });

  it.each([
    ["short password", { username: "bob123", password: "short" }],
    ["common password", { username: "bob123", password: "password1234" }],
    ["bad username characters", { username: "bob smith!", password: PASSWORD }],
    ["username too short", { username: "ab", password: PASSWORD }],
    ["missing fields", {}],
    ["wrong types", { username: 123, password: ["x"] }],
  ])("rejects %s with a 400", async (_name, body) => {
    const res = await anon(ctx.app).post("/api/auth/signup").send(body);
    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });

  it("treats usernames case-insensitively (no duplicate Alice/alice)", async () => {
    await anon(ctx.app).post("/api/auth/signup").send({ username: "dupe-user", password: PASSWORD });
    const res = await anon(ctx.app)
      .post("/api/auth/signup")
      .send({ username: "DUPE-USER", password: PASSWORD });
    expect(res.status).toBe(409);
  });
});

describe("login", () => {
  it("signs in with the right password and rejects the wrong one with a generic message", async () => {
    await anon(ctx.app).post("/api/auth/signup").send({ username: "carol", password: PASSWORD });

    const ok = await anon(ctx.app).post("/api/auth/login").send({ username: "carol", password: PASSWORD });
    expect(ok.status).toBe(200);

    const wrongPassword = await anon(ctx.app)
      .post("/api/auth/login")
      .send({ username: "carol", password: "wrong-password-123" });
    const unknownUser = await anon(ctx.app)
      .post("/api/auth/login")
      .send({ username: "nobody-here", password: "wrong-password-123" });

    expect(wrongPassword.status).toBe(401);
    expect(unknownUser.status).toBe(401);
    // Identical responses: can't tell a real username from a fake one.
    expect(wrongPassword.body).toEqual(unknownUser.body);
  });

  it("rate-limits repeated failed logins for one account", async () => {
    await anon(ctx.app).post("/api/auth/signup").send({ username: "target", password: PASSWORD });
    const statuses = [];
    for (let i = 0; i < 10; i++) {
      const res = await anon(ctx.app)
        .post("/api/auth/login")
        .send({ username: "target", password: "guess-number-" + i });
      statuses.push(res.status);
    }
    expect(statuses.slice(0, 8).every((s) => s === 401)).toBe(true);
    expect(statuses.slice(8)).toEqual([429, 429]);

    // Even the correct password is refused while locked out.
    const locked = await anon(ctx.app).post("/api/auth/login").send({ username: "target", password: PASSWORD });
    expect(locked.status).toBe(429);
    expect(locked.headers["retry-after"]).toBeTruthy();
  });
});

describe("session", () => {
  it("reports an anonymous visitor as signed out without an error", async () => {
    const res = await anon(ctx.app).get("/api/auth/me");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ user: null });
  });

  it("requires a session for protected routes", async () => {
    for (const path of ["/api/cattle", "/api/movements", "/api/dashboard", "/api/account/export"]) {
      const res = await anon(ctx.app).get(path);
      expect(res.status, path).toBe(401);
    }
  });

  it("rejects a forged or tampered cookie", async () => {
    const res = await anon(ctx.app).get("/api/cattle").set("Cookie", "cm_session=not.a.jwt");
    expect(res.status).toBe(401);
  });

  it("returns the current user and logs out", async () => {
    const { agent, username } = await signupAgent(ctx.app);
    const me = await agent.get("/api/auth/me");
    expect(me.body.user.username).toBe(username);

    await agent.post("/api/auth/logout").expect(204);
    // Signed out is a normal answer (200 + null), not an error.
    expect((await agent.get("/api/auth/me").expect(200)).body.user).toBeNull();
  });

  it("changing the password signs out every other session", async () => {
    const { agent: first, username } = await signupAgent(ctx.app);
    const second = newAgent(ctx.app);
    await second.post("/api/auth/login").send({ username, password: PASSWORD }).expect(200);

    await first
      .post("/api/account/password")
      .send({ currentPassword: PASSWORD, newPassword: "a-brand-new-passphrase" })
      .expect(204);

    expect((await first.get("/api/auth/me")).body.user).not.toBeNull(); // the device that changed it stays signed in
    expect((await second.get("/api/auth/me")).body.user).toBeNull(); // the other one is revoked
  });

  it("requires the current password to change it or delete the account", async () => {
    const { agent } = await signupAgent(ctx.app);
    await agent
      .post("/api/account/password")
      .send({ currentPassword: "not-my-password", newPassword: "a-brand-new-passphrase" })
      .expect(403);
    await agent.delete("/api/account").send({ password: "not-my-password" }).expect(403);
  });

  it("deleting the account removes the user and all of their data", async () => {
    const { agent, username } = await signupAgent(ctx.app);
    await agent.post("/api/cattle").send({ tag: "X1", breed: "Nguni" }).expect(201);

    await agent.delete("/api/account").send({ password: PASSWORD }).expect(204);
    expect((await agent.get("/api/auth/me")).body.user).toBeNull();

    const [{ n: users }] = await ctx.db.query("SELECT count(*)::int AS n FROM users WHERE username = $1", [username]);
    const [{ n: cattle }] = await ctx.db.query("SELECT count(*)::int AS n FROM cattle WHERE tag = 'X1'");
    expect(users).toBe(0);
    expect(cattle).toBe(0);
  });
});

describe("demo sandbox", () => {
  it("creates an isolated, pre-filled account without credentials", async () => {
    const agent = newAgent(ctx.app);
    const res = await agent.post("/api/auth/demo").expect(201);
    expect(res.body.user.isDemo).toBe(true);
    expect(res.body.user.username).toMatch(/^demo-/);

    const cattle = await agent.get("/api/cattle").expect(200);
    expect(cattle.body.length).toBeGreaterThan(10);

    const dash = await agent.get("/api/dashboard").expect(200);
    expect(dash.body.vaccinationsDue.length).toBeGreaterThan(0);
  });

  it("gives every visitor their own data", async () => {
    const a = newAgent(ctx.app);
    const b = newAgent(ctx.app);
    await a.post("/api/auth/demo").expect(201);
    await b.post("/api/auth/demo").expect(201);

    await a.post("/api/cattle").send({ tag: "ONLY-A", breed: "Angus" }).expect(201);
    const bCattle = await b.get("/api/cattle").expect(200);
    expect(bCattle.body.some((c) => c.tag === "ONLY-A")).toBe(false);
  });

  it("cannot change the password, export, or delete the account", async () => {
    const agent = newAgent(ctx.app);
    await agent.post("/api/auth/demo").expect(201);
    await agent.post("/api/account/password").send({ currentPassword: "x", newPassword: "yyyyyyyyyyyy" }).expect(403);
    await agent.get("/api/account/export").expect(403);
    await agent.delete("/api/account").send({ password: "x" }).expect(403);
  });

  it("is removed by the cron job once expired, and the session stops working", async () => {
    const agent = newAgent(ctx.app);
    const res = await agent.post("/api/auth/demo").expect(201);
    await ctx.db.query("UPDATE users SET expires_at = now() - interval '1 minute' WHERE id = $1", [res.body.user.id]);

    // Expired sandbox is rejected immediately, even before cleanup runs.
    await agent.get("/api/cattle").expect(401);

    const cleanup = await anon(ctx.app)
      .get("/api/cron/cleanup")
      .set("Authorization", "Bearer cron-secret-for-tests")
      .expect(200);
    expect(cleanup.body.expiredDemoAccountsRemoved).toBeGreaterThanOrEqual(1);
  });

  it("is rate-limited per client", async () => {
    const statuses = [];
    for (let i = 0; i < 8; i++) {
      statuses.push((await anon(ctx.app).post("/api/auth/demo").set("x-forwarded-for", "203.0.113.9")).status);
    }
    expect(statuses.filter((s) => s === 429).length).toBeGreaterThanOrEqual(2);
  });
});

describe("cron endpoint", () => {
  it("rejects missing and wrong secrets", async () => {
    await anon(ctx.app).get("/api/cron/cleanup").expect(401);
    await anon(ctx.app).get("/api/cron/cleanup").set("Authorization", "Bearer nope").expect(401);
  });
});
