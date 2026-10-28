import { useSyncExternalStore } from "react";
import { offline } from "../api";

/** { online, pending, failed[], syncing, hasCopy } - live view of the offline queue. */
export function useSyncStatus() {
  return useSyncExternalStore(offline.subscribe, offline.getStatus);
}
