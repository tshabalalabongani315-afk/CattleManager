import { describe, it, expect } from "vitest";
import {
  EMPTY_REPLICA,
  addRecord,
  buildRecord,
  deriveDashboard,
  isTempId,
  newTempId,
  parseTarget,
  removeRecord,
  replaceCattle,
  resolveGet,
} from "../replica";

const farm = () => ({
  cattle: [
    { id: 1, tag: "A1", breed: "Nguni", sex: "Female", date_of_birth: null, status: "Active" },
    { id: 2, tag: "A2", breed: "Nguni", sex: "Male", date_of_birth: null, status: "Active" },
    { id: 3, tag: "B1", breed: "Bonsmara", sex: "Female", date_of_birth: null, status: "Sold" },
    { id: 4, tag: "B2", breed: "Brahman", sex: null, date_of_birth: null, status: "Active" },
  ],
  dailyCounts: [
    { id: 9, date: "2026-03-10", count: 40 },
    { id: 8, date: "2026-03-09", count: 41 },
  ],
  movements: [
    { id: 5, type: "SOLD", quantity: 2, note: null, date: "2026-03-08" },
    { id: 4, type: "IN", quantity: 1, note: null, date: "2026-03-02" },
    { id: 3, type: "IN", quantity: 5, note: null, date: "2026-02-20" },
  ],
  vaccinations: [
    { id: 11, cattle_id: 1, cattle_tag: "A1", vaccine_name: "Anthrax", date_given: "2026-01-01", next_due_date: "2026-03-12", notes: null },
    { id: 12, cattle_id: 3, cattle_tag: "B1", vaccine_name: "Anthrax", date_given: "2026-01-01", next_due_date: "2026-03-11", notes: null },
    { id: 13, cattle_id: 2, cattle_tag: "A2", vaccine_name: "Botulism", date_given: "2026-01-01", next_due_date: "2026-09-01", notes: null },
    { id: 14, cattle_id: 4, cattle_tag: "B2", vaccine_name: "Lumpy skin", date_given: "2026-01-01", next_due_date: null, notes: null },
  ],
  weights: [
    { id: 21, cattle_id: 1, date: "2026-01-01", weight_kg: 300 },
    { id: 22, cattle_id: 1, date: "2026-02-01", weight_kg: 320 },
    { id: 23, cattle_id: 2, date: "2026-02-01", weight_kg: 280 },
  ],
});

describe("parseTarget", () => {
  it("recognises herd resources and ids", () => {
    expect(parseTarget("/cattle")).toEqual({ resource: "cattle", id: null });
    expect(parseTarget("/cattle/12")).toEqual({ resource: "cattle", id: "12" });
    expect(parseTarget("/daily-counts/-5")).toEqual({ resource: "daily-counts", id: "-5" });
    expect(parseTarget("/dashboard")).toEqual({ resource: "dashboard", id: null });
  });

  it("ignores everything else", () => {
    for (const url of ["/auth/login", "/account/export", "/cattle/abc", "/cattle/1/extra", undefined]) {
      expect(parseTarget(url)).toBeNull();
    }
  });
});

describe("temporary ids", () => {
  it("are negative, unique and distinguishable from server ids", () => {
    const ids = new Set(Array.from({ length: 50 }, newTempId));
    expect(ids.size).toBe(50);
    for (const id of ids) {
      expect(isTempId(id)).toBe(true);
      expect(Number.isSafeInteger(id)).toBe(true);
    }
    expect(isTempId(7)).toBe(false);
    expect(isTempId(null)).toBe(false);
  });
});

describe("changing the replica", () => {
  it("keeps the register sorted by tag", () => {
    const next = addRecord(farm(), "cattle", { id: -1, tag: "A15", breed: "Nguni", status: "Active" });
    expect(next.cattle.map((c) => c.tag)).toEqual(["A1", "A15", "A2", "B1", "B2"]);
  });

  it("puts a new count or movement first among records of the same date, newest date first", () => {
    const withCount = addRecord(farm(), "daily-counts", { id: -1, date: "2026-03-10", count: 44 });
    expect(withCount.dailyCounts.map((c) => c.id)).toEqual([-1, 9, 8]);

    const withMove = addRecord(farm(), "movements", { id: -2, type: "OUT", quantity: 1, note: null, date: "2026-03-09" });
    expect(withMove.movements.map((m) => m.id)).toEqual([-2, 5, 4, 3]);
  });

  it("keeps vaccinations ordered by due date with undated ones last", () => {
    const next = addRecord(farm(), "vaccinations", {
      id: -1, cattle_id: 1, cattle_tag: "A1", vaccine_name: "X", date_given: "2026-03-01", next_due_date: "2026-03-11", notes: null,
    });
    expect(next.vaccinations.map((v) => v.id)).toEqual([-1, 12, 11, 13, 14]);
  });

  it("does not mutate the original", () => {
    const before = farm();
    const snapshot = JSON.stringify(before);
    addRecord(before, "cattle", { id: -1, tag: "Z", breed: "x", status: "Active" });
    removeRecord(before, "cattle", 1);
    replaceCattle(before, { ...before.cattle[0], tag: "NEW" });
    expect(JSON.stringify(before)).toBe(snapshot);
  });

  it("removing an animal also removes its weights and vaccinations", () => {
    const next = removeRecord(farm(), "cattle", 1);
    expect(next.cattle.map((c) => c.id)).toEqual([2, 3, 4]);
    expect(next.weights.map((w) => w.id)).toEqual([23]);
    expect(next.vaccinations.map((v) => v.id)).toEqual([12, 13, 14]);
  });

  it("renaming an animal updates the tag shown on its vaccinations", () => {
    const next = replaceCattle(farm(), { ...farm().cattle[0], tag: "A0" });
    expect(next.cattle[0].tag).toBe("A0");
    expect(next.vaccinations.find((v) => v.id === 11).cattle_tag).toBe("A0");
  });

  it("builds records shaped like the server's responses", () => {
    const replica = farm();
    expect(buildRecord("cattle", { tag: "T", breed: "B" }, -1, replica)).toEqual({
      id: -1, tag: "T", breed: "B", sex: null, date_of_birth: null, status: "Active",
    });
    expect(buildRecord("daily-counts", { count: 3 }, -2, replica, "2026-03-10")).toEqual({ id: -2, date: "2026-03-10", count: 3 });
    expect(
      buildRecord("vaccinations", { cattle_id: 2, vaccine_name: "V", date_given: "2026-03-01" }, -3, replica)
    ).toMatchObject({ cattle_tag: "A2", next_due_date: null, notes: null });
  });
});

describe("deriveDashboard", () => {
  it("matches what the server computes from the same rows", () => {
    const d = deriveDashboard(farm(), "2026-03-10");
    expect(d.registered).toBe(4);
    expect(d.active).toBe(3);
    expect(d.latestCount).toEqual({ id: 9, date: "2026-03-10", count: 40 });
    expect(d.breeds).toEqual([
      { name: "Nguni", value: 2 },
      { name: "Brahman", value: 1 },
    ]);
    // Only this month's movements; February's IN of 5 is excluded.
    expect(d.monthMovements).toEqual({ IN: 1, OUT: 0, SOLD: 2, DIED: 0 });
    expect(d.recentMovements.map((m) => m.id)).toEqual([5, 4, 3]);
  });

  it("lists vaccinations due within 14 days for active animals only", () => {
    const d = deriveDashboard(farm(), "2026-03-10");
    // 12 belongs to a sold animal, 13 is months away, 14 has no due date.
    expect(d.vaccinationsDue.map((v) => v.id)).toEqual([11]);
    expect(Object.keys(d.vaccinationsDue[0]).sort()).toEqual(
      ["cattle_id", "cattle_tag", "id", "next_due_date", "vaccine_name"]
    );
  });

  it("handles an empty farm", () => {
    expect(deriveDashboard(EMPTY_REPLICA, "2026-03-10")).toEqual({
      registered: 0,
      active: 0,
      latestCount: null,
      breeds: [],
      monthMovements: { IN: 0, OUT: 0, SOLD: 0, DIED: 0 },
      recentMovements: [],
      vaccinationsDue: [],
    });
  });
});

describe("resolveGet", () => {
  const replica = farm();

  it("answers list and detail requests", () => {
    expect(resolveGet(replica, parseTarget("/cattle")).data).toHaveLength(4);
    expect(resolveGet(replica, parseTarget("/cattle/2")).data.tag).toBe("A2");
    expect(resolveGet(replica, parseTarget("/cattle/99"))).toEqual({ notFound: true });
    expect(resolveGet(replica, parseTarget("/daily-counts")).data).toHaveLength(2);
    expect(resolveGet(replica, parseTarget("/movements")).data).toHaveLength(3);
  });

  it("filters vaccinations and weights by animal", () => {
    expect(resolveGet(replica, parseTarget("/vaccinations")).data).toHaveLength(4);
    expect(resolveGet(replica, parseTarget("/vaccinations"), { cattle_id: "1" }).data.map((v) => v.id)).toEqual([11]);
    expect(resolveGet(replica, parseTarget("/weights"), { cattle_id: 1 }).data.map((w) => w.weight_kg)).toEqual([300, 320]);
  });

  it("does not guess when weights are asked for without an animal", () => {
    expect(resolveGet(replica, parseTarget("/weights"))).toBeNull();
  });
});
