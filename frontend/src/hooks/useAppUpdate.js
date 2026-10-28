import { useSyncExternalStore } from "react";
import { applyAppUpdate, isUpdateReady, UPDATE_READY_EVENT } from "../offline/registerSW";

const subscribe = (fn) => {
  window.addEventListener(UPDATE_READY_EVENT, fn);
  return () => window.removeEventListener(UPDATE_READY_EVENT, fn);
};

/** { ready, apply } - whether a newer version of the app is waiting to be installed. */
export function useAppUpdate() {
  const ready = useSyncExternalStore(subscribe, isUpdateReady);
  return { ready, apply: applyAppUpdate };
}
