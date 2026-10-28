import { registerSW } from "virtual:pwa-register";

export const UPDATE_READY_EVENT = "app:update-ready";

const HOUR = 60 * 60 * 1000;
let updateReady = false;
let applyUpdate = null;

export const isUpdateReady = () => updateReady;

/** Reloads into the new version that is waiting. */
export const applyAppUpdate = () => applyUpdate?.(true);

/**
 * Registers the service worker (production builds only). A new version is not
 * activated until the user accepts it, so it can never reload the page while a
 * record is half-entered.
 */
export function setupServiceWorker() {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;

  applyUpdate = registerSW({
    onNeedRefresh() {
      updateReady = true;
      window.dispatchEvent(new Event(UPDATE_READY_EVENT));
    },
    onRegisteredSW(_url, registration) {
      // Long-lived installed apps would otherwise only look for updates on a cold start.
      if (registration) setInterval(() => registration.update().catch(() => {}), HOUR);
    },
  });
}
