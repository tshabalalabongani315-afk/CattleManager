import { useSyncExternalStore } from "react";

// Browsers fire `beforeinstallprompt` once, early - often before React has
// mounted - so it is captured here at module load and handed to components later.
let deferredPrompt = null;
let snapshot = { canPrompt: false, isIos: false, isInstalled: false };
const listeners = new Set();

const isStandalone = () =>
  typeof window !== "undefined" &&
  (window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true);

const isIosDevice = () =>
  typeof navigator !== "undefined" &&
  (/iphone|ipad|ipod/i.test(navigator.userAgent) ||
    // iPadOS reports itself as a Mac, but has a touch screen.
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

function update(next) {
  snapshot = { ...snapshot, ...next };
  listeners.forEach((fn) => fn());
}

if (typeof window !== "undefined") {
  snapshot = { canPrompt: false, isIos: isIosDevice(), isInstalled: isStandalone() };

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault(); // we show our own button instead of the browser's mini-bar
    deferredPrompt = event;
    update({ canPrompt: true });
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    update({ canPrompt: false, isInstalled: true });
  });
}

const subscribe = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

/**
 * { canPrompt, isIos, isInstalled, install }
 *  - canPrompt: the browser can show its install dialog (Chrome/Edge/Android).
 *  - isIos: Safari on iPhone/iPad has no prompt; the user must use Share > Add to Home Screen.
 */
export function useInstallPrompt() {
  const state = useSyncExternalStore(subscribe, () => snapshot);

  const install = async () => {
    if (!deferredPrompt) return null;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null; // a prompt can only be used once
    update({ canPrompt: false });
    return outcome;
  };

  return { ...state, install };
}
