const DB_NAME = "cattle-manager";
const STORE = "kv";

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * A tiny async key-value store on IndexedDB. If IndexedDB is unavailable
 * (private windows, some embedded browsers, tests) it keeps working in memory,
 * so the app still runs - it just can't survive a reload offline.
 */
export function createStorage() {
  const memory = new Map();
  let dbPromise = null;

  const db = () => {
    dbPromise ??= typeof indexedDB === "undefined" ? Promise.resolve(null) : openDb().catch(() => null);
    return dbPromise;
  };

  const request = async (mode, fn) => {
    const database = await db();
    if (!database) throw new Error("IndexedDB unavailable");
    return new Promise((resolve, reject) => {
      const tx = database.transaction(STORE, mode);
      const req = fn(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(req?.result);
      tx.onerror = tx.onabort = () => reject(tx.error);
    });
  };

  return {
    async get(key) {
      try {
        const value = await request("readonly", (s) => s.get(key));
        return value === undefined ? memory.get(key) : value;
      } catch {
        return memory.get(key);
      }
    },
    async set(key, value) {
      memory.set(key, value);
      try {
        await request("readwrite", (s) => s.put(value, key));
      } catch {
        /* memory copy still holds it for this session */
      }
    },
    async remove(key) {
      memory.delete(key);
      try {
        await request("readwrite", (s) => s.delete(key));
      } catch {
        /* nothing else to clear */
      }
    },
  };
}
