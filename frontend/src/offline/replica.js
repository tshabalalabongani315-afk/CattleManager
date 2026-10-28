// The local copy of one farm's data, and the pure functions that read and
// change it. Nothing here touches the network or storage, so it is easy to test.
//
// Shape: { cattle, dailyCounts, movements, vaccinations, weights } - the same
// rows (and ordering) the API returns, held in memory and in IndexedDB.

import { todayISO } from "../utils/dates";

export const EMPTY_REPLICA = Object.freeze({
  cattle: [],
  dailyCounts: [],
  movements: [],
  vaccinations: [],
  weights: [],
});

// API resource name -> key in the replica.
const COLLECTION = {
  cattle: "cattle",
  "daily-counts": "dailyCounts",
  movements: "movements",
  vaccinations: "vaccinations",
  weights: "weights",
};

/** Resources whose writes can be made without a connection. */
export const OFFLINE_RESOURCES = Object.keys(COLLECTION);

/** "/cattle/5" -> { resource: "cattle", id: "5" }; non-herd paths -> null. */
export function parseTarget(url) {
  const match = /^\/(cattle|daily-counts|movements|vaccinations|weights|dashboard)(?:\/(-?\d+))?$/.exec(url ?? "");
  return match ? { resource: match[1], id: match[2] ?? null } : null;
}

/* ---- ids made up on the device until the server assigns real ones ---- */

let tempSeq = 0;
/** Negative, so it can never collide with a server id (which are positive). */
export const newTempId = () => -(Date.now() * 1000 + (tempSeq++ % 1000));
export const isTempId = (id) => id != null && Number(id) < 0;

/* ---- ordering (mirrors the ORDER BY of the API's queries) ---- */

const byTag = (a, b) => (a.tag < b.tag ? -1 : a.tag > b.tag ? 1 : 0);
const byDateDesc = (a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0);
const byDateAsc = (a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
const byDue = (a, b) => {
  const x = a.next_due_date;
  const y = b.next_due_date;
  if (x === y) return 0;
  if (!x) return 1;
  if (!y) return -1;
  return x < y ? -1 : 1;
};

/* ---- changing the replica (each returns a new object) ---- */

export function addRecord(replica, resource, record) {
  switch (resource) {
    case "cattle":
      return { ...replica, cattle: [...replica.cattle, record].sort(byTag) };
    case "daily-counts":
      // New record first, then a stable sort: among the same date the newest leads.
      return { ...replica, dailyCounts: [record, ...replica.dailyCounts].sort(byDateDesc) };
    case "movements":
      return { ...replica, movements: [record, ...replica.movements].sort(byDateDesc) };
    case "vaccinations":
      return { ...replica, vaccinations: [record, ...replica.vaccinations].sort(byDue) };
    case "weights":
      return { ...replica, weights: [...replica.weights, record] };
    default:
      return replica;
  }
}

export function replaceCattle(replica, animal) {
  return {
    ...replica,
    cattle: replica.cattle.map((c) => (c.id === animal.id ? animal : c)).sort(byTag),
    // Vaccination rows carry the tag, so keep it in step.
    vaccinations: replica.vaccinations.map((v) =>
      v.cattle_id === animal.id ? { ...v, cattle_tag: animal.tag } : v
    ),
  };
}

export function removeRecord(replica, resource, id) {
  const key = Number(id);
  const without = (rows) => rows.filter((r) => r.id !== key);
  switch (resource) {
    case "cattle":
      // The database cascades; do the same here.
      return {
        ...replica,
        cattle: without(replica.cattle),
        vaccinations: replica.vaccinations.filter((v) => v.cattle_id !== key),
        weights: replica.weights.filter((w) => w.cattle_id !== key),
      };
    case "daily-counts":
      return { ...replica, dailyCounts: without(replica.dailyCounts) };
    case "movements":
      return { ...replica, movements: without(replica.movements) };
    case "vaccinations":
      return { ...replica, vaccinations: without(replica.vaccinations) };
    case "weights":
      return { ...replica, weights: without(replica.weights) };
    default:
      return replica;
  }
}

/** The row the server would return for a create, built from what the user typed. */
export function buildRecord(resource, body, id, replica, today = todayISO()) {
  switch (resource) {
    case "cattle":
      return {
        id,
        tag: body.tag,
        breed: body.breed,
        sex: body.sex ?? null,
        date_of_birth: body.date_of_birth ?? null,
        status: body.status ?? "Active",
      };
    case "daily-counts":
      return { id, date: body.date ?? today, count: body.count };
    case "movements":
      return { id, type: body.type, quantity: body.quantity, note: body.note ?? null, date: body.date };
    case "vaccinations":
      return {
        id,
        cattle_id: body.cattle_id,
        cattle_tag: replica.cattle.find((c) => c.id === body.cattle_id)?.tag ?? "",
        vaccine_name: body.vaccine_name,
        date_given: body.date_given,
        next_due_date: body.next_due_date ?? null,
        notes: body.notes ?? null,
      };
    case "weights":
      return { id, cattle_id: body.cattle_id, date: body.date, weight_kg: body.weight_kg };
    default:
      return null;
  }
}

/* ---- answering GET requests from the replica ---- */

/** Same math as the dashboard query on the server, over the local rows. */
export function deriveDashboard(replica, today = todayISO()) {
  const active = replica.cattle.filter((c) => c.status === "Active");
  const activeIds = new Set(active.map((c) => c.id));

  const breedTotals = new Map();
  for (const c of active) breedTotals.set(c.breed, (breedTotals.get(c.breed) ?? 0) + 1);
  const breeds = [...breedTotals]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));

  const monthStart = `${today.slice(0, 8)}01`;
  const monthMovements = { IN: 0, OUT: 0, SOLD: 0, DIED: 0 };
  for (const m of replica.movements) if (m.date >= monthStart) monthMovements[m.type] += m.quantity;

  const [y, mo, d] = today.split("-").map(Number);
  const horizon = todayISO(new Date(y, mo - 1, d + 14));
  const vaccinationsDue = replica.vaccinations
    .filter((v) => activeIds.has(v.cattle_id) && v.next_due_date && v.next_due_date <= horizon)
    .sort(byDue)
    .slice(0, 50)
    .map(({ id, cattle_id, cattle_tag, vaccine_name, next_due_date }) => ({
      id,
      cattle_id,
      cattle_tag,
      vaccine_name,
      next_due_date,
    }));

  return {
    registered: replica.cattle.length,
    active: active.length,
    latestCount: replica.dailyCounts[0] ?? null,
    breeds,
    monthMovements,
    recentMovements: replica.movements.slice(0, 5),
    vaccinationsDue,
  };
}

/**
 * Answers a GET from the replica. Returns `{ data }`, `{ notFound: true }`, or
 * null when this URL isn't something the replica can answer.
 */
export function resolveGet(replica, target, params = {}, today = todayISO()) {
  const cattleId = params.cattle_id != null ? Number(params.cattle_id) : null;

  switch (target.resource) {
    case "cattle": {
      if (target.id == null) return { data: replica.cattle };
      const animal = replica.cattle.find((c) => c.id === Number(target.id));
      return animal ? { data: animal } : { notFound: true };
    }
    case "daily-counts":
      return { data: replica.dailyCounts };
    case "movements":
      return { data: replica.movements };
    case "vaccinations":
      return {
        data: cattleId == null ? replica.vaccinations : replica.vaccinations.filter((v) => v.cattle_id === cattleId),
      };
    case "weights":
      if (cattleId == null) return null;
      return { data: replica.weights.filter((w) => w.cattle_id === cattleId).sort(byDateAsc) };
    case "dashboard":
      return { data: deriveDashboard(replica, today) };
    default:
      return null;
  }
}
